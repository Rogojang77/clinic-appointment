import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import LocationModel from '@/models/Location';
import SectionModel from '@/models/Section';
import DoctorModel from '@/models/Doctor';

// POST /api/add-locationid - Add locationId to existing sections and doctors
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Find locations
    const beiusLocation = await LocationModel.findOne({ name: 'Beiuș' });
    const oradeaLocation = await LocationModel.findOne({ name: 'Oradea' });

    if (!beiusLocation || !oradeaLocation) {
      return NextResponse.json(
        { success: false, error: 'Locations not found' },
        { status: 400 }
      );
    }

    // Update sections using raw MongoDB update
    const sectionsResult = await SectionModel.updateMany(
      { name: { $ne: 'Ecografie' } },
      { $set: { locationId: beiusLocation._id } }
    );

    const ecografieResult = await SectionModel.updateMany(
      { name: 'Ecografie' },
      { $set: { locationId: oradeaLocation._id } }
    );

    // Update doctors based on their section
    const doctors = await DoctorModel.find({});
    let updatedDoctors = 0;

    for (const doctor of doctors) {
      try {
        const section = await SectionModel.findById(doctor.sectionId);
        if (section && section.locationId) {
          await DoctorModel.findByIdAndUpdate(doctor._id, {
            locationId: section.locationId
          });
          updatedDoctors++;
        }
      } catch (error) {
        console.error(`Error updating doctor ${doctor.name}:`, error);
      }
    }

    // Verify results
    const beiusSections = await SectionModel.countDocuments({ locationId: beiusLocation._id });
    const oradeaSections = await SectionModel.countDocuments({ locationId: oradeaLocation._id });
    const beiusDoctors = await DoctorModel.countDocuments({ locationId: beiusLocation._id });
    const oradeaDoctors = await DoctorModel.countDocuments({ locationId: oradeaLocation._id });

    return NextResponse.json({
      success: true,
      message: 'LocationId added successfully',
      data: {
        sections: {
          beius: beiusSections,
          oradea: oradeaSections
        },
        doctors: {
          beius: beiusDoctors,
          oradea: oradeaDoctors
        }
      }
    });

  } catch (error) {
    console.error('Adding locationId failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { success: false, error: 'Failed to add locationId', details: errorMessage },
      { status: 500 }
    );
  }
}

