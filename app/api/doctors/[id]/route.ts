import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import DoctorModel from '@/models/Doctor';
import SectionModel from '@/models/Section';
import mongoose from 'mongoose';

// GET /api/doctors/[id] - Get a specific doctor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid doctor ID' },
        { status: 400 }
      );
    }
    
    const doctor = await DoctorModel.findById(id);
    
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor not found' },
        { status: 404 }
      );
    }
    
    // Convert to plain object and handle populated sectionId
    const doctorObj = doctor.toObject();
    // If sectionId is populated, use it as the section
    if (doctorObj.sectionId && typeof doctorObj.sectionId === 'object') {
      doctorObj.section = doctorObj.sectionId;
      doctorObj.sectionId = doctorObj.sectionId._id;
    }
    
    return NextResponse.json({
      success: true,
      data: doctorObj
    });
  } catch (error) {
    console.error('Error fetching doctor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch doctor' },
      { status: 500 }
    );
  }
}

// PUT /api/doctors/[id] - Update a doctor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid doctor ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      specialization, 
      sectionId, 
      schedule, 
      isActive 
    } = body;
    
    // Check if doctor exists
    const existingDoctor = await DoctorModel.findById(id);
    if (!existingDoctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor not found' },
        { status: 404 }
      );
    }
    
    // Check for name conflicts if being changed
    if (name && name !== existingDoctor.name) {
      const nameConflict = await DoctorModel.findOne({ 
        name, 
        sectionId: sectionId || existingDoctor.sectionId,
        _id: { $ne: id }
      });
      if (nameConflict) {
        return NextResponse.json(
          { success: false, error: 'Doctor with this name already exists in this section' },
          { status: 409 }
        );
      }
    }
    
    // Verify new section exists if being changed
    if (sectionId && sectionId !== existingDoctor.sectionId.toString()) {
      if (!mongoose.Types.ObjectId.isValid(sectionId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid section ID' },
          { status: 400 }
        );
      }
      
      const section = await SectionModel.findById(sectionId);
      if (!section) {
        return NextResponse.json(
          { success: false, error: 'Section not found' },
          { status: 404 }
        );
      }
    }
    
    // Validate schedule structure if provided
    if (schedule && Array.isArray(schedule)) {
      const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      for (const daySchedule of schedule) {
        if (!validDays.includes(daySchedule.day)) {
          return NextResponse.json(
            { success: false, error: `Invalid day: ${daySchedule.day}` },
            { status: 400 }
          );
        }
        
        if (daySchedule.timeSlots && Array.isArray(daySchedule.timeSlots)) {
          for (const timeSlot of daySchedule.timeSlots) {
            if (!timeSlot.startTime || !timeSlot.endTime) {
              return NextResponse.json(
                { success: false, error: 'Time slots must have startTime and endTime' },
                { status: 400 }
              );
            }
          }
        }
      }
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (schedule !== undefined) updateData.schedule = schedule;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Handle section change
    if (sectionId && sectionId !== existingDoctor.sectionId.toString()) {
      // Remove doctor from old section
      await SectionModel.findByIdAndUpdate(
        existingDoctor.sectionId,
        { $pull: { doctors: id } }
      );
      
      // Add doctor to new section
      await SectionModel.findByIdAndUpdate(
        sectionId,
        { $addToSet: { doctors: id } }
      );
      
      updateData.sectionId = sectionId;
    }
    
    const updatedDoctor = await DoctorModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('sectionId', 'name description');
    
    return NextResponse.json({
      success: true,
      data: updatedDoctor
    });
  } catch (error) {
    console.error('Error updating doctor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update doctor' },
      { status: 500 }
    );
  }
}

// DELETE /api/doctors/[id] - Delete a doctor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid doctor ID' },
        { status: 400 }
      );
    }
    
    const doctor = await DoctorModel.findById(id);
    
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor not found' },
        { status: 404 }
      );
    }
    
    // Remove doctor from section's doctors array
    await SectionModel.findByIdAndUpdate(
      doctor.sectionId,
      { $pull: { doctors: id } }
    );
    
    // Delete the doctor
    await DoctorModel.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Doctor deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete doctor' },
      { status: 500 }
    );
  }
}
