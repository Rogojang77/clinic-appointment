import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import LocationModel from '@/models/Location';

// GET /api/locations/[id] - Get a specific location
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    if (!params.id || params.id === 'undefined') {
      return NextResponse.json(
        { success: false, error: 'Invalid location ID' },
        { status: 400 }
      );
    }
    
    const location = await LocationModel.findById(params.id);
    
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}

// PUT /api/locations/[id] - Update a specific location
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    if (!params.id || params.id === 'undefined') {
      return NextResponse.json(
        { success: false, error: 'Invalid location ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { name, isActive } = body;
    
    if (name !== undefined && (!name || name.trim() === '')) {
      return NextResponse.json(
        { success: false, error: 'Location name cannot be empty' },
        { status: 400 }
      );
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const updatedLocation = await LocationModel.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedLocation) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: updatedLocation
    });
  } catch (error) {
    console.error('Error updating location:', error);
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Location with this name already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

// DELETE /api/locations/[id] - Delete a specific location
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    if (!params.id || params.id === 'undefined') {
      return NextResponse.json(
        { success: false, error: 'Invalid location ID' },
        { status: 400 }
      );
    }
    
    const location = await LocationModel.findById(params.id);
    
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }
    
    await LocationModel.findByIdAndDelete(params.id);
    
    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete location' },
      { status: 500 }
    );
  }
}

