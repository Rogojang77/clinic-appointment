import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import SectionModel from '@/models/Section';
import DoctorModel from '@/models/Doctor';
import LocationModel from '@/models/Location';
import { Section } from '@/types';

// Ensure Doctor model is registered
import '@/models/Doctor';

// GET /api/sections - Get all sections
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const locationId = searchParams.get('locationId');

    const filter: any = {};
    if (activeOnly) filter.isActive = true;
    // Support filtering by locationId (for backward compatibility and dashboard filtering)
    if (locationId) {
      filter.$or = [
        { locationIds: locationId },
        { locationId: locationId } // Legacy support
      ];
    }

    const sections = await SectionModel.find(filter)
      .sort({ createdAt: -1 });
    
    // Manually populate doctors for each section
    try {
      const populatedSections = [];
      
      for (const section of sections) {
        const sectionObj = section.toObject();
        
        // Populate locationIds if they exist
        if (sectionObj.locationIds && Array.isArray(sectionObj.locationIds) && sectionObj.locationIds.length > 0) {
          try {
            const populatedLocations = await LocationModel.find({ 
              _id: { $in: sectionObj.locationIds } 
            }).select('name isActive');
            sectionObj.locations = populatedLocations.map(loc => loc.toObject());
            sectionObj.locationIds = sectionObj.locationIds; // Keep the original IDs
          } catch (locationError) {
            console.warn('Could not populate locations for section:', locationError);
          }
        }
        
        // Legacy support: populate locationId if it exists (for backward compatibility)
        if (sectionObj.locationId && !sectionObj.locationIds) {
          try {
            const location = await LocationModel.findById(sectionObj.locationId)
              .select('name isActive');
            if (location) {
              sectionObj.location = location.toObject();
              sectionObj.locationId = sectionObj.locationId; // Keep the original ID
            }
          } catch (locationError) {
            console.warn('Could not populate location for section:', locationError);
          }
        }
        
        if (sectionObj.doctors && sectionObj.doctors.length > 0) {
          // Convert string IDs back to ObjectIds for the query
          const doctorIds = sectionObj.doctors.map(id => typeof id === 'string' ? id : id.toString());
          
          const doctors = await DoctorModel.find({ _id: { $in: doctorIds } })
            .select('name email specialization isActive');
          
          // Convert to plain objects to ensure proper serialization
          sectionObj.doctors = doctors.map(doctor => ({
            _id: doctor._id,
            name: doctor.name,
            email: doctor.email,
            specialization: doctor.specialization,
            isActive: doctor.isActive
          }));
        }
        
        populatedSections.push(sectionObj);
      }
      
      return NextResponse.json({
        success: true,
        data: populatedSections
      });
    } catch (populateError) {
      console.error('Could not populate doctors manually:', populateError);
      console.error('Populate error details:', populateError.message);
      // Continue without populated doctors
    }
    
    return NextResponse.json({
      success: true,
      data: sections
    });
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}

// POST /api/sections - Create a new section
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { name, description, isActive = true, locationIds, locationId, doctors = [] } = body;
    
    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Section name is required' },
        { status: 400 }
      );
    }
    
    // Support both locationIds array and legacy locationId field
    let finalLocationIds: string[] = [];
    if (locationIds && Array.isArray(locationIds) && locationIds.length > 0) {
      finalLocationIds = locationIds;
    } else if (locationId) {
      // Legacy support: convert single locationId to array
      finalLocationIds = [locationId];
    }
    
    if (finalLocationIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one location is required' },
        { status: 400 }
      );
    }
    
    // Check if section already exists
    const existingSection = await SectionModel.findOne({ name });
    if (existingSection) {
      return NextResponse.json(
        { success: false, error: 'Section with this name already exists' },
        { status: 409 }
      );
    }
    
    const section = new SectionModel({
      name,
      description,
      isActive,
      locationIds: finalLocationIds,
      doctors: doctors || []
    });
    
    // Explicitly unset legacy locationId field if it exists
    section.set('locationId', undefined);
    
    await section.save();
    
    // Update doctors to assign them to this section
    if (doctors && doctors.length > 0) {
      try {
        await DoctorModel.updateMany(
          { _id: { $in: doctors } },
          { $set: { sectionId: section._id } }
        );
      } catch (doctorError) {
        console.warn('Could not assign doctors to section:', doctorError);
        // Continue without failing the section creation
      }
    }
    
    // Populate locationIds and doctors for the response
    const sectionObj = section.toObject();
    
    // Populate locationIds
    if (sectionObj.locationIds && Array.isArray(sectionObj.locationIds) && sectionObj.locationIds.length > 0) {
      try {
        const populatedLocations = await LocationModel.find({ 
          _id: { $in: sectionObj.locationIds } 
        }).select('name isActive');
        sectionObj.locations = populatedLocations.map(loc => loc.toObject());
      } catch (locationError) {
        console.warn('Could not populate locations for section:', locationError);
      }
    }
    
    // Populate doctors
    if (sectionObj.doctors && sectionObj.doctors.length > 0) {
      try {
        const populatedDoctors = await DoctorModel.find({ 
          _id: { $in: sectionObj.doctors } 
        }).select('name email specialization isActive');
        sectionObj.doctors = populatedDoctors.map(doctor => ({
          _id: doctor._id,
          name: doctor.name,
          email: doctor.email,
          specialization: doctor.specialization,
          isActive: doctor.isActive
        }));
      } catch (doctorError) {
        console.warn('Could not populate doctors for section:', doctorError);
      }
    }
    
    // Remove legacy locationId field if it exists
    if (sectionObj.locationId) {
      delete sectionObj.locationId;
    }
    
    return NextResponse.json({
      success: true,
      data: sectionObj
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create section' },
      { status: 500 }
    );
  }
}
