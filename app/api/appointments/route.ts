import dbConnect from "@/utils/mongodb";
import { NextRequest, NextResponse } from "next/server";
import AppointmentModel from "@/models/Appointment";
import SectionModel from "@/models/Section";
import DoctorModel from "@/models/Doctor";
import { requireAuth } from "@/utils/authHelpers";
import countDefaultTimeSlots from "../utils/getDefaultTimeSlotCount";
import countAppointments from "../utils/countAppointments";
import ColorsModel from "@/models/Colors";

export async function GET(request: NextRequest) {
    await dbConnect();
    
    // Retrieve query parameters for filters
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const location = searchParams.get("location");
    const testType = searchParams.get("testType");
    const doctorName = searchParams.get("doctorName");
  
    try {
      // Authenticate request
      const authResult = await requireAuth(request);
      if (authResult instanceof NextResponse) {
        return authResult; // Return error response if auth failed
      }
      const { payload: decoded } = authResult;
  
      // Build filter criteria
      const filter: any = {};
      if (date) filter.date = new Date(date);
      if (location) filter.location = location;
      if (testType) filter.testType = testType;
      if (doctorName) {
        filter.$or = [
          { patientName: doctorName }
        ];
      }
  
      // Fetch filtered appointments with populated section and doctor data
      const appointments = await AppointmentModel.find(filter).sort({ date: 1 });
      
      // Manually populate section and doctor data
      const populatedAppointments = await Promise.all(
        appointments.map(async (appointment) => {
          const appointmentObj = appointment.toObject();
          
          // Populate section data if sectionId exists
          if (appointmentObj.sectionId) {
            try {
              const section = await SectionModel.findById(appointmentObj.sectionId)
                .select('name description');
              if (section) {
                appointmentObj.section = section.toObject();
              }
            } catch (sectionError) {
              // Silently skip if section cannot be populated
            }
          }
          
          // Populate doctor data if doctorId exists
          if (appointmentObj.doctorId) {
            try {
              const doctor = await DoctorModel.findById(appointmentObj.doctorId)
                .select('name email specialization');
              if (doctor) {
                appointmentObj.doctor = doctor.toObject();
              }
            } catch (doctorError) {
              // Silently skip if doctor cannot be populated
            }
          }
          
          return appointmentObj;
        })
      );
      
      return NextResponse.json({ success: true, data: populatedAppointments }, { status: 200 });
    } catch (err) {
      console.error("Error fetching appointments:", err);
      return NextResponse.json({ message: "Server Error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
  await dbConnect();
  const { 
    location, 
    day, 
    date, 
    time, 
    patientName, 
    testType, 
    phoneNumber, 
    isConfirmed, 
    notes, 
    doctorName,
    sectionId,
    doctorId
  } = await request.json();

  try {
    // Authenticate request
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response if auth failed
    }
    const { payload: decoded } = authResult;

    // Get the count of default time slots
    const defaultSlotCount = await countDefaultTimeSlots(location, day);

    // Create new appointment
    const newAppointment = new AppointmentModel({
      location,
      day,
      date,
      time,
      patientName,
      doctorName,
      testType,
      phoneNumber,
      isConfirmed,
      notes,
      sectionId,
      doctorId,
    });

    // Save the appointment to the database
    await newAppointment.save();

    // Get the count of appointments for the given location and date
    const appointmentCount = await countAppointments(location, date);
    
    // Determine the color based on the comparison
    const color = appointmentCount >= defaultSlotCount ? "red" : "blue";

    // Update or create the color data in the Colors model
    await ColorsModel.findOneAndUpdate(
      { location, date: new Date(date) }, // Filter by location and date
      { color }, // Update the color
      { upsert: true, new: true } // Create if not exists, return updated document
    );

    return NextResponse.json(
      {
        message: "Appointment Created Successfully!",
        data: newAppointment,
        defaultSlotCount,
        appointmentCount,
        color,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating appointment:", err);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  await dbConnect();

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { message: "Appointment ID is required!" },
        { status: 400 }
      );
    }

    // Parse the request body for updated data
    const updatedData = await request.json();

    // Authenticate request
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response if auth failed
    }
    const { payload: decoded } = authResult;

    // Partially update the appointment by ID
    const updatedAppointment = await AppointmentModel.findByIdAndUpdate(
      id,
      { $set: updatedData }, // Only update provided fields
      { new: true, runValidators: true } // Return updated document
    );

    if (!updatedAppointment) {
      return NextResponse.json(
        { message: "Appointment not found!" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Appointment Updated Successfully!", data: updatedAppointment },
      { status: 200 }
    );
  } catch (err) {
    console.error("Update Error:", err);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  await dbConnect();

  try {
    // Get appointment ID from query parameters
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { message: "Appointment ID is required!" },
        { status: 400 }
      );
    }

    // Authenticate request
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response if auth failed
    }
    const { payload: decoded } = authResult;

    // Delete the appointment by ID
    const deletedAppointment = await AppointmentModel.findByIdAndDelete(id);
    if (!deletedAppointment) {
      return NextResponse.json(
        { message: "Appointment not found!" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Appointment Deleted Successfully!" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Delete Error:", err);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
