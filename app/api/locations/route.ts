import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import LocationModel from '@/models/Location';

// GET /api/locations - Get all available locations
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    const filter = activeOnly ? { isActive: true } : {};
    const locations = await LocationModel.find(filter).sort({ name: 1 });

    return NextResponse.json({
      success: true,
      data: locations
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

// POST /api/locations - Create a new location
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { name, isActive = true } = body;
    
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Location name is required' },
        { status: 400 }
      );
    }
    
    const location = new LocationModel({
      name: name.trim(),
      isActive
    });
    
    await location.save();
    
    return NextResponse.json({
      success: true,
      data: location
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating location:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Location with this name already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create location' },
      { status: 500 }
    );
  }
}
