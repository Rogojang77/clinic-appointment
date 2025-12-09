import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import LocationModel from '@/models/Location';
import SectionModel from '@/models/Section';

// Ensure models are registered
import '@/models/Section';
import '@/models/Location';

// POST /api/test-update - Test updating one section
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    console.log('Testing section update...');

    // Find Oradea location
    const oradeaLocation = await LocationModel.findOne({ name: 'Oradea' });
    if (!oradeaLocation) {
      return NextResponse.json(
        { success: false, error: 'Oradea location not found' },
        { status: 400 }
      );
    }

    console.log('Oradea location ID:', oradeaLocation._id);

    // Find Ecografie section
    const ecografieSection = await SectionModel.findOne({ name: 'Ecografie' });
    if (!ecografieSection) {
      return NextResponse.json(
        { success: false, error: 'Ecografie section not found' },
        { status: 400 }
      );
    }

    console.log('Ecografie section ID:', ecografieSection._id);
    console.log('Current locationId:', ecografieSection.locationId);

    // Update the section
    const updatedSection = await SectionModel.findByIdAndUpdate(
      ecografieSection._id,
      { locationId: oradeaLocation._id },
      { new: true }
    );

    console.log('Updated section:', updatedSection);
    console.log('Updated section locationId:', updatedSection?.locationId);

    // Try to find the section again to see if it was saved
    const foundSection = await SectionModel.findById(ecografieSection._id);
    console.log('Found section:', foundSection);
    console.log('Found section locationId:', foundSection?.locationId);

    // Try a raw query to see if the field exists
    const rawSection = await SectionModel.collection.findOne({ _id: ecografieSection._id });
    console.log('Raw section from database:', rawSection);

    return NextResponse.json({
      success: true,
      data: {
        section: updatedSection,
        locationId: updatedSection?.locationId,
        rawSection: rawSection
      }
    });

  } catch (error) {
    console.error('Test update failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { success: false, error: 'Failed to test update', details: errorMessage },
      { status: 500 }
    );
  }
}
