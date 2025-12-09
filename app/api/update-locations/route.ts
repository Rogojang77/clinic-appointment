import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import LocationModel from '@/models/Location';
import SectionModel from '@/models/Section';
import DoctorModel from '@/models/Doctor';

// POST /api/update-locations - Update existing sections and doctors with locationId
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    console.log('Starting location update...');

    // Find existing locations
    const beiusLocation = await LocationModel.findOne({ name: 'Beiuș' });
    const oradeaLocation = await LocationModel.findOne({ name: 'Oradea' });

    if (!beiusLocation || !oradeaLocation) {
      return NextResponse.json(
        { success: false, error: 'Locations not found. Please run setup-locations first.' },
        { status: 400 }
      );
    }

    console.log('Beiuș location ID:', beiusLocation._id);
    console.log('Oradea location ID:', oradeaLocation._id);

    // Get all sections
    const sections = await SectionModel.find({});
    console.log(`Found ${sections.length} sections to update`);

    let beiusCount = 0;
    let oradeaCount = 0;

    // Assign locations to sections
    for (const section of sections) {
      // Oradea gets only Ecografie, Beiuș gets all others
      const locationId = section.name === 'Ecografie' ? oradeaLocation._id : beiusLocation._id;
      
      await SectionModel.findByIdAndUpdate(section._id, { locationId });
      
      if (section.name === 'Ecografie') {
        oradeaCount++;
        console.log(`Updated section "${section.name}" to location: Oradea`);
      } else {
        beiusCount++;
        console.log(`Updated section "${section.name}" to location: Beiuș`);
      }
    }

    // Get all doctors
    const doctors = await DoctorModel.find({});
    console.log(`Found ${doctors.length} doctors to update`);

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
          console.log(`Updated doctor "${doctor.name}" to location: Oradea`);
        } else {
          beiusDoctorCount++;
          console.log(`Updated doctor "${doctor.name}" to location: Beiuș`);
        }
      }
    }

    console.log('Location update completed successfully!');

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
    return NextResponse.json(
      { success: false, error: 'Failed to update locations', details: error.message },
      { status: 500 }
    );
  }
}

