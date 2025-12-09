import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import LocationModel from '@/models/Location';
import SectionModel from '@/models/Section';
import DoctorModel from '@/models/Doctor';

// POST /api/setup-locations - Initialize locations and assign to existing data
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Clear existing locations
    await LocationModel.deleteMany({});

    // Create locations
    const locations = [
      { name: 'Beiuș', isActive: true },
      { name: 'Oradea', isActive: true }
    ];

    const createdLocations = await LocationModel.insertMany(locations);

    // Find location IDs
    const beiusLocation = await LocationModel.findOne({ name: 'Beiuș' });
    const oradeaLocation = await LocationModel.findOne({ name: 'Oradea' });

    if (!beiusLocation || !oradeaLocation) {
      throw new Error('Failed to create locations');
    }

    // Get all sections
    const sections = await SectionModel.find({});

    // Assign locations to sections
    for (const section of sections) {
      // Oradea gets only Ecografie, Beiuș gets all others
      const locationId = section.name === 'Ecografie' ? oradeaLocation._id : beiusLocation._id;
      
      await SectionModel.findByIdAndUpdate(section._id, { locationId });
    }

    // Get all doctors
    const doctors = await DoctorModel.find({});

    // Assign locations to doctors based on their section
    for (const doctor of doctors) {
      const section = await SectionModel.findById(doctor.sectionId);
      if (section) {
        const locationId = section.name === 'Ecografie' ? oradeaLocation._id : beiusLocation._id;
        
        await DoctorModel.findByIdAndUpdate(doctor._id, { locationId });
      }
    }
    
    // Verify the results
    const beiusSections = await SectionModel.find({ locationId: beiusLocation._id });
    const oradeaSections = await SectionModel.find({ locationId: oradeaLocation._id });
    
    const beiusDoctors = await DoctorModel.find({ locationId: beiusLocation._id });
    const oradeaDoctors = await DoctorModel.find({ locationId: oradeaLocation._id });

    return NextResponse.json({
      success: true,
      message: 'Location setup completed successfully',
      data: {
        locations: createdLocations,
        sections: {
          beius: beiusSections.length,
          oradea: oradeaSections.length
        },
        doctors: {
          beius: beiusDoctors.length,
          oradea: oradeaDoctors.length
        }
      }
    });

  } catch (error) {
    console.error('Location setup failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { success: false, error: 'Failed to setup locations', details: errorMessage },
      { status: 500 }
    );
  }
}

