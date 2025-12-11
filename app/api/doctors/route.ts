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
    if (locationId) {
      // Support both locationId (legacy) and locationIds (new)
      filter.$or = [
        { locationIds: locationId },
        { locationId: locationId }
      ];
    }
    if (isActive !== null) filter.isActive = isActive === 'true';
    if (specialization) filter.specialization = { $regex: specialization, $options: 'i' };
    
    const doctors = await DoctorModel.find(filter)
      .populate({
        path: 'locationIds',
        select: 'name isActive',
        strictPopulate: false
      })
      .populate({
        path: 'locationId',
        select: 'name isActive',
        strictPopulate: false
      })
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
// Only accepts: name, sectionId, locationIds
// Auto-fills: schedule: [], isActive: true
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      specialization, 
      locationIds,
      sectionId
    } = body;
    
    // Validate required fields
    if (!name || !sectionId) {
      return NextResponse.json(
        { success: false, error: 'Doctor name and section are required' },
        { status: 400 }
      );
    }
    
    // Validate locationIds is provided and is an array
    if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one location is required' },
        { status: 400 }
      );
    }
    
    // Validate location IDs
    for (const locId of locationIds) {
      if (!mongoose.Types.ObjectId.isValid(locId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid location ID' },
          { status: 400 }
        );
      }
    }
    
    // Validate sectionId ObjectId
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
    
    // Auto-fill DB-only fields: schedule and isActive
    const doctor = new DoctorModel({
      name,
      email: email || undefined,
      phone: phone || undefined,
      specialization: specialization || undefined,
      locationIds,
      sectionId,
      schedule: [], // Auto-filled
      isActive: true // Auto-filled
    });
    
    await doctor.save();
    
    // Add doctor to section's doctors array
    await SectionModel.findByIdAndUpdate(
      sectionId,
      { $addToSet: { doctors: doctor._id } }
    );
    
    // Populate the response
    await doctor.populate({
      path: 'locationIds',
      select: 'name isActive',
      strictPopulate: false
    });
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
