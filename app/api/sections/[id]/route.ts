import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import SectionModel from '@/models/Section';
import DoctorModel from '@/models/Doctor';
import LocationModel from '@/models/Location';
import mongoose from 'mongoose';

// GET /api/sections/[id] - Get a specific section
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid section ID' },
        { status: 400 }
      );
    }
    
    const section = await SectionModel.findById(id);
    
    // Try to populate doctors, but don't fail if the collection doesn't exist
    if (section) {
      try {
        await section.populate('doctors', 'name email specialization isActive');
      } catch (populateError) {
        console.warn('Could not populate doctors for section:', populateError);
        // Continue without populated doctors
      }
    }
    
    if (!section) {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: section
    });
  } catch (error) {
    console.error('Error fetching section:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch section' },
      { status: 500 }
    );
  }
}

// PUT /api/sections/[id] - Update a section
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid section ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { name, description, isActive, locationIds, locationId, doctors } = body;
    
    // Check if section exists
    const existingSection = await SectionModel.findById(id);
    if (!existingSection) {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      );
    }
    
    // Check if name is being changed and if it conflicts with existing sections
    if (name && name !== existingSection.name) {
      const nameConflict = await SectionModel.findOne({ 
        name, 
        _id: { $ne: id } 
      });
      if (nameConflict) {
        return NextResponse.json(
          { success: false, error: 'Section with this name already exists' },
          { status: 409 }
        );
      }
    }
    
    const updateData: any = {};
    const unsetData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Handle locationIds (support both array and legacy single locationId)
    if (locationIds !== undefined) {
      if (Array.isArray(locationIds) && locationIds.length > 0) {
        updateData.locationIds = locationIds;
      } else {
        updateData.locationIds = [];
      }
      // Explicitly unset legacy locationId field
      unsetData.locationId = 1;
    } else if (locationId !== undefined) {
      // Legacy support: convert single locationId to array
      updateData.locationIds = locationId ? [locationId] : [];
      unsetData.locationId = 1;
    }
    
    if (doctors !== undefined) updateData.doctors = doctors;
    
    // Build the update query
    const updateQuery: any = { $set: updateData };
    if (Object.keys(unsetData).length > 0) {
      updateQuery.$unset = unsetData;
    }
    
    const updatedSection = await SectionModel.findByIdAndUpdate(
      id,
      updateQuery,
      { new: true, runValidators: true }
    );
    
    if (!updatedSection) {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      );
    }
    
    // Convert to plain object for manipulation
    const sectionObj = updatedSection.toObject();
    
    // Populate locationIds
    if (sectionObj.locationIds && Array.isArray(sectionObj.locationIds) && sectionObj.locationIds.length > 0) {
      try {
        const populatedLocations = await LocationModel.find({ 
          _id: { $in: sectionObj.locationIds } 
        }).select('name isActive');
        sectionObj.locations = populatedLocations.map(loc => loc.toObject());
      } catch (locationError) {
        console.warn('Could not populate locations for section:', locationError);
      }
    }
    
    // Populate doctors
    if (sectionObj.doctors && sectionObj.doctors.length > 0) {
      try {
        const populatedDoctors = await DoctorModel.find({ 
          _id: { $in: sectionObj.doctors } 
        }).select('name email specialization isActive');
        sectionObj.doctors = populatedDoctors.map(doctor => ({
          _id: doctor._id,
          name: doctor.name,
          email: doctor.email,
          specialization: doctor.specialization,
          isActive: doctor.isActive
        }));
      } catch (doctorError) {
        console.warn('Could not populate doctors for section:', doctorError);
      }
    }
    
    // Remove legacy locationId field if it exists
    if (sectionObj.locationId) {
      delete sectionObj.locationId;
    }
    
    // Handle doctor assignments if doctors array is provided
    if (doctors !== undefined) {
      try {
        // Remove this section from all doctors first
        await DoctorModel.updateMany(
          { sectionId: id },
          { $unset: { sectionId: 1 } }
        );
        
        // Assign selected doctors to this section
        if (doctors.length > 0) {
          await DoctorModel.updateMany(
            { _id: { $in: doctors } },
            { $set: { sectionId: id } }
          );
        }
      } catch (doctorError) {
        console.warn('Could not update doctor assignments:', doctorError);
        // Continue without failing the section update
      }
    }
    
    return NextResponse.json({
      success: true,
      data: sectionObj
    });
  } catch (error) {
    console.error('Error updating section:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update section' },
      { status: 500 }
    );
  }
}

// DELETE /api/sections/[id] - Delete a section
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid section ID' },
        { status: 400 }
      );
    }
    
    const section = await SectionModel.findById(id);
    
    if (!section) {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      );
    }
    
    // Remove section from all doctors before deleting
    try {
      await DoctorModel.updateMany(
        { sectionId: id },
        { $unset: { sectionId: 1 } }
      );
    } catch (doctorError) {
      console.warn('Could not remove section from doctors:', doctorError);
      // Continue with section deletion
    }
    
    await SectionModel.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Section deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete section' },
      { status: 500 }
    );
  }
}
