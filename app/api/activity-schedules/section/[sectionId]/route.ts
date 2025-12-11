import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import ActivityScheduleModel from '@/models/ActivitySchedule';
import SectionModel from '@/models/Section';
import mongoose from 'mongoose';

// GET /api/activity-schedules/section/[sectionId] - Get all activity schedules for a specific section
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sectionId: string }> }
) {
  try {
    await dbConnect();
    const { sectionId } = await context.params;
    
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
    
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    
    const filter: any = { sectionId: sectionId };
    if (isActive !== null) filter.isActive = isActive === 'true';
    
    const schedules = await ActivityScheduleModel.find(filter)
      .populate('userId', 'username email role')
      .populate('sectionId', 'name description')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching section activity schedules:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch section activity schedules' },
      { status: 500 }
    );
  }
}
