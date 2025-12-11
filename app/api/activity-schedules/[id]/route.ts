import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import ActivityScheduleModel from '@/models/ActivitySchedule';
import mongoose from 'mongoose';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// GET /api/activity-schedules/[id]
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    await dbConnect();

    if (!isValidObjectId(id)) {
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

    return NextResponse.json({ success: true, data: schedule });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity schedule' },
      { status: 500 }
    );
  }
}

// PUT /api/activity-schedules/[id]
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    await dbConnect();

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid activity schedule ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { schedule, isActive, userId, sectionId } = body;

    const existing = await ActivityScheduleModel.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Activity schedule not found' },
        { status: 404 }
      );
    }

    if (userId || sectionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot change user or section after creation. Create a new schedule instead.'
        },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (schedule !== undefined) updateData.schedule = schedule;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await ActivityScheduleModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('userId', 'username email role')
      .populate('sectionId', 'name description');

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: 'Failed to update activity schedule' },
      { status: 500 }
    );
  }
}

// DELETE /api/activity-schedules/[id]
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    await dbConnect();

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid activity schedule ID' },
        { status: 400 }
      );
    }

    const existing = await ActivityScheduleModel.findById(id);
    if (!existing) {
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
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: 'Failed to delete activity schedule' },
      { status: 500 }
    );
  }
}
