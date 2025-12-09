import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import ActivityScheduleModel from '@/models/ActivitySchedule';
import UserModel from '@/models/User';
import SectionModel from '@/models/Section';
import mongoose from 'mongoose';

// GET /api/activity-schedules - Get all activity schedules with optional filtering
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sectionId = searchParams.get('sectionId');
    const isActive = searchParams.get('isActive');
    
    const filter: any = {};
    if (userId) filter.userId = userId;
    if (sectionId) filter.sectionId = sectionId;
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
    console.error('Error fetching activity schedules:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity schedules' },
      { status: 500 }
    );
  }
}

// POST /api/activity-schedules - Create a new activity schedule
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { userId, sectionId, schedule, isActive = true } = body;
    
    // Validate required fields
    if (!userId || !sectionId) {
      return NextResponse.json(
        { success: false, error: 'User ID and Section ID are required' },
        { status: 400 }
      );
    }
    
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid section ID' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
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
    
    // Check if schedule already exists for this user-section combination
    const existingSchedule = await ActivityScheduleModel.findOne({ userId, sectionId });
    if (existingSchedule) {
      return NextResponse.json(
        { success: false, error: 'Activity schedule already exists for this user and section' },
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
    
    const activitySchedule = new ActivityScheduleModel({
      userId,
      sectionId,
      schedule: schedule || [],
      isActive
    });
    
    await activitySchedule.save();
    
    // Populate the response
    await activitySchedule.populate([
      { path: 'userId', select: 'username email role' },
      { path: 'sectionId', select: 'name description' }
    ]);
    
    return NextResponse.json({
      success: true,
      data: activitySchedule
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating activity schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create activity schedule' },
      { status: 500 }
    );
  }
}
