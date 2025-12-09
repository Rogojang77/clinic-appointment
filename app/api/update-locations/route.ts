import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import LocationModel from '@/models/Location';
import SectionModel from '@/models/Section';
import DoctorModel from '@/models/Doctor';

// POST /api/update-locations - Update existing sections and doctors with locationId
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Find existing locations
    const beiusLocation = await LocationModel.findOne({ name: 'Beiuș' });
    const oradeaLocation = await LocationModel.findOne({ name: 'Oradea' });

    if (!beiusLocation || !oradeaLocation) {
      return NextResponse.json(
        { success: false, error: 'Locations not found. Please run setup-locations first.' },
        { status: 400 }
      );
    }

    // Get all sections
    const sections = await SectionModel.find({});

    let beiusCount = 0;
    let oradeaCount = 0;

    // Assign locations to sections
    for (const section of sections) {
      // Oradea gets only Ecografie, Beiuș gets all others
      const locationId = section.name === 'Ecografie' ? oradeaLocation._id : beiusLocation._id;
      
      await SectionModel.findByIdAndUpdate(section._id, { locationId });
      
      if (section.name === 'Ecografie') {
        oradeaCount++;
      } else {
        beiusCount++;
      }
    }

    // Get all doctors
    const doctors = await DoctorModel.find({});

    let beiusDoctorCount = 0;
    let oradeaDoctorCount = 0;

    // Assign locations to doctors based on their section
    for (const doctor of doctors) {
      const section = await SectionModel.findById(doctor.sectionId);
      if (section) {
        const locationId = section.name === 'Ecografie' ? oradeaLocation._id : beiusLocation._id;
        
        await DoctorModel.findByIdAndUpdate(doctor._id, { locationId });
        
        if (section.name === 'Ecografie') {
          oradeaDoctorCount++;
        } else {
          beiusDoctorCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Location update completed successfully',
      data: {
        sections: {
          beius: beiusCount,
          oradea: oradeaCount
        },
        doctors: {
          beius: beiusDoctorCount,
          oradea: oradeaDoctorCount
        }
      }
    });

  } catch (error) {
    console.error('Location update failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { success: false, error: 'Failed to update locations', details: errorMessage },
      { status: 500 }
    );
  }
}

