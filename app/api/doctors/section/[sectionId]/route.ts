import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import DoctorModel from '@/models/Doctor';
import SectionModel from '@/models/Section';
import mongoose from 'mongoose';

// GET /api/doctors/section/[sectionId] - Get all doctors for a specific section
export async function GET(
  request: NextRequest,
  { params }: { params: { sectionId: string } }
) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.sectionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid section ID' },
        { status: 400 }
      );
    }
    
    // Check if section exists
    const section = await SectionModel.findById(params.sectionId);
    if (!section) {
      return NextResponse.json(
        { success: false, error: 'Section not found' },
        { status: 404 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    
    const filter: any = { sectionId: params.sectionId };
    if (isActive !== null) filter.isActive = isActive === 'true';
    
    const doctors = await DoctorModel.find(filter)
      .populate('sectionId', 'name description')
      .sort({ name: 1 });
    
    return NextResponse.json({
      success: true,
      data: doctors
    });
  } catch (error) {
    console.error('Error fetching section doctors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch section doctors' },
      { status: 500 }
    );
  }
}
