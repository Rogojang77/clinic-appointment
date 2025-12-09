import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import ActivityScheduleModel from '@/models/ActivitySchedule';
import UserModel from '@/models/User';
import mongoose from 'mongoose';

// GET /api/activity-schedules/user/[userId] - Get all activity schedules for a specific user
export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    await dbConnect();
    const { userId } = context.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
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
    
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    
    const filter: any = { userId: userId };
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
    console.error('Error fetching user activity schedules:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user activity schedules' },
      { status: 500 }
    );
  }
}
