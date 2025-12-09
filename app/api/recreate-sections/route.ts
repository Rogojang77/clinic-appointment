import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import LocationModel from '@/models/Location';
import SectionModel from '@/models/Section';
import DoctorModel from '@/models/Doctor';

// POST /api/recreate-sections - Recreate sections with locationId
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    console.log('Starting section recreation...');

    // Find locations
    const beiusLocation = await LocationModel.findOne({ name: 'Beiuș' });
    const oradeaLocation = await LocationModel.findOne({ name: 'Oradea' });

    if (!beiusLocation || !oradeaLocation) {
      return NextResponse.json(
        { success: false, error: 'Locations not found' },
        { status: 400 }
      );
    }

    // Get existing sections to preserve their data
    const existingSections = await SectionModel.find({});
    console.log(`Found ${existingSections.length} existing sections`);

    // Clear existing sections
    await SectionModel.deleteMany({});
    console.log('Cleared existing sections');

    // Recreate sections with locationId
    const sectionsData = [
      { name: 'Cardiologie', description: 'Medical department for cardiologie', locationId: beiusLocation._id },
      { name: 'Chirurgie vasculară', description: 'Medical department for chirurgie vasculară', locationId: beiusLocation._id },
      { name: 'Chirurgie pediatrică', description: 'Medical department for chirurgie pediatrică', locationId: beiusLocation._id },
      { name: 'Dermatologie', description: 'Medical department for dermatologie', locationId: beiusLocation._id },
      { name: 'Endocrinologie', description: 'Medical department for endocrinologie', locationId: beiusLocation._id },
      { name: 'Ginecologie', description: 'Medical department for ginecologie', locationId: beiusLocation._id },
      { name: 'Nefrologie', description: 'Medical department for nefrologie', locationId: beiusLocation._id },
      { name: 'Neurologie', description: 'Medical department for neurologie', locationId: beiusLocation._id },
      { name: 'Ortopedie – pediatrică', description: 'Medical department for ortopedie – pediatrică', locationId: beiusLocation._id },
      { name: 'Ortopedie – traumatologie', description: 'Medical department for ortopedie – traumatologie', locationId: beiusLocation._id },
      { name: 'Pediatrie – neonatologie', description: 'Medical department for pediatrie – neonatologie', locationId: beiusLocation._id },
      { name: 'Pneumologie', description: 'Medical department for pneumologie', locationId: beiusLocation._id },
      { name: 'Psihiatrie', description: 'Medical department for psihiatrie', locationId: beiusLocation._id },
      { name: 'Urologie', description: 'Medical department for urologie', locationId: beiusLocation._id },
      { name: 'Ecografie', description: 'Ultrasound and imaging department', locationId: oradeaLocation._id }
    ];

    const createdSections = await SectionModel.insertMany(sectionsData);
    console.log(`Created ${createdSections.length} sections with locationId`);

    // Update doctors to reference the new sections
    const doctors = await DoctorModel.find({});
    console.log(`Found ${doctors.length} doctors to update`);

    let updatedDoctors = 0;
    for (const doctor of doctors) {
      try {
        // Find the new section with the same name as the old one
        if (doctor.sectionId) {
          const oldSection = existingSections.find(s => s._id.toString() === doctor.sectionId.toString());
          if (oldSection) {
            const newSection = createdSections.find(s => s.name === oldSection.name);
            if (newSection) {
              // Update doctor with new sectionId and locationId
              await DoctorModel.findByIdAndUpdate(doctor._id, {
                sectionId: newSection._id,
                locationId: newSection.locationId
              });
              updatedDoctors++;
            }
          }
        }
      } catch (doctorError) {
        console.error(`Error updating doctor ${doctor.name}:`, doctorError);
      }
    }

    console.log(`Updated ${updatedDoctors} doctors`);

    // Update sections to include doctors
    for (const section of createdSections) {
      try {
        const doctorsInSection = await DoctorModel.find({ sectionId: section._id });
        if (doctorsInSection.length > 0) {
          await SectionModel.findByIdAndUpdate(section._id, {
            doctors: doctorsInSection.map(d => d._id)
          });
        }
      } catch (sectionError) {
        console.error(`Error updating section ${section.name}:`, sectionError);
      }
    }

    console.log('Section recreation completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Sections recreated successfully',
      data: {
        sections: createdSections.length,
        doctors: updatedDoctors,
        locations: {
          beius: createdSections.filter(s => s.locationId.toString() === beiusLocation._id.toString()).length,
          oradea: createdSections.filter(s => s.locationId.toString() === oradeaLocation._id.toString()).length
        }
      }
    });

  } catch (error) {
    console.error('Section recreation failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to recreate sections', details: error.message },
      { status: 500 }
    );
  }
}
