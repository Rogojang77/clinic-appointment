import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import DoctorModel from '@/models/Doctor';
import SectionModel from '@/models/Section';
import LocationModel from '@/models/Location';
import mongoose from 'mongoose';

// GET /api/doctors - Get all doctors with optional filtering
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');
    const locationId = searchParams.get('locationId');
    const isActive = searchParams.get('isActive');
    const specialization = searchParams.get('specialization');

    const filter: any = {};
    if (sectionId) filter.sectionId = sectionId;
    if (locationId) filter.locationId = locationId;
    if (isActive !== null) filter.isActive = isActive === 'true';
    if (specialization) filter.specialization = { $regex: specialization, $options: 'i' };
    
    const doctors = await DoctorModel.find(filter)
      .populate('locationId', 'name isActive')
      .populate('sectionId', 'name description')
      .sort({ name: 1 });
    
    // Return doctors with populated sectionId
    return NextResponse.json({
      success: true,
      data: doctors
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch doctors' },
      { status: 500 }
    );
  }
}

// POST /api/doctors - Create a new doctor
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      specialization, 
      locationId,
      sectionId, 
      schedule = [],
      isActive = true 
    } = body;
    
    // Validate required fields
    if (!name || !sectionId || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Doctor name, section, and location are required' },
        { status: 400 }
      );
    }
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid section ID' },
        { status: 400 }
      );
    }
    
    // Check if section exists
    const section = await SectionModel.findById(sectionId);
    if (!section) {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      );
    }
    
    // Check if doctor already exists in the same section
    const existingDoctor = await DoctorModel.findOne({ 
      name, 
      sectionId 
    });
    
    if (existingDoctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor with this name already exists in this section' },
        { status: 409 }
      );
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
    
    const doctor = new DoctorModel({
      name,
      email,
      phone,
      specialization,
      locationId,
      sectionId,
      schedule,
      isActive
    });
    
    await doctor.save();
    
    // Add doctor to section's doctors array
    await SectionModel.findByIdAndUpdate(
      sectionId,
      { $addToSet: { doctors: doctor._id } }
    );
    
    // Populate the response
    await doctor.populate('sectionId', 'name description');
    
    return NextResponse.json({
      success: true,
      data: doctor
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating doctor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create doctor' },
      { status: 500 }
    );
  }
}
