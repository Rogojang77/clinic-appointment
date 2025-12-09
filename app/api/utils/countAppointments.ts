import dbConnect from "@/utils/mongodb";
import AppointmentModel from "@/models/Appointment";

export default async function countAppointments(location: string, date: string): Promise<number> {
  await dbConnect();

  try {
    const count = await AppointmentModel.countDocuments({
      location,
      date: new Date(date), // Ensure the date is in the correct format
    });
    return count;
  } catch (error) {
    console.error("Error counting appointments:", error);
    throw error; // Re-throw the error to handle it in the calling function
  }
}