import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import ActivityScheduleModel from '@/models/ActivitySchedule';
import mongoose from 'mongoose';

// GET /api/activity-schedules/[id] - Get a specific activity schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid activity schedule ID' },
        { status: 400 }
      );
    }
    
    const schedule = await ActivityScheduleModel.findById(id)
      .populate('userId', 'username email role')
      .populate('sectionId', 'name description');
    
    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Activity schedule not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error fetching activity schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity schedule' },
      { status: 500 }
    );
  }
}

// PUT /api/activity-schedules/[id] - Update an activity schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid activity schedule ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { schedule, isActive, userId, sectionId } = body;
    
    // Check if schedule exists
    const existingSchedule = await ActivityScheduleModel.findById(id);
    if (!existingSchedule) {
      return NextResponse.json(
        { success: false, error: 'Activity schedule not found' },
        { status: 404 }
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
    
    const updateData: any = {};
    if (schedule !== undefined) updateData.schedule = schedule;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Note: userId and sectionId changes would require special handling
    // as they affect the unique constraint, so we'll prevent them here
    if (userId || sectionId) {
      return NextResponse.json(
        { success: false, error: 'Cannot change user or section after creation. Create a new schedule instead.' },
        { status: 400 }
      );
    }
    
    const updatedSchedule = await ActivityScheduleModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'userId', select: 'username email role' },
      { path: 'sectionId', select: 'name description' }
    ]);
    
    return NextResponse.json({
      success: true,
      data: updatedSchedule
    });
  } catch (error) {
    console.error('Error updating activity schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update activity schedule' },
      { status: 500 }
    );
  }
}

// DELETE /api/activity-schedules/[id] - Delete an activity schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid activity schedule ID' },
        { status: 400 }
      );
    }
    
    const schedule = await ActivityScheduleModel.findById(id);
    
    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Activity schedule not found' },
        { status: 404 }
      );
    }
    
    await ActivityScheduleModel.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Activity schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting activity schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete activity schedule' },
      { status: 500 }
    );
  }
}
