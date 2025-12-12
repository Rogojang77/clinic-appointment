import api from "@/services/api";

// Utility function to fetch time slots by location, day, optional date, and optional sectionId
export async function getTimeSlotsByLocationAndDay(filters:any) {
  try {
    const response = await api.get("/schedule", {
      params: filters,
    });

    if (response.data) {
      return response.data.data; // Return time slots if successful
    } else {
      throw new Error(response.data.message || "Failed to fetch time slots.");
    }
  } catch (err) {
    console.error("Error fetching time slots:", err);
    throw err; // Rethrow the error to be handled by the caller
  }
}

// High-level function to handle API calls
export const fetchTimeSlotsAPI = async (
  location: string,
  dayName: string,
  date?: string,
  sectionId?: string,
  testType?: string
) => {
  if (!location || !dayName) {
    return [];
  }
  
  const filters = {
    location,
    day: dayName, 
    ...(date && { date }),
    ...(sectionId && { sectionId }), // Include sectionId if provided
    ...(testType && !sectionId && { testType }), // Include testType as fallback when sectionId is not available
  };

  try {
    return await getTimeSlotsByLocationAndDay(filters);
  } catch (error) {
    console.error("Error in fetchTimeSlotsAPI:", error);
    throw error;
  }
};
