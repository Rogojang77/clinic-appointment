import axios from "axios";

export const fetchAppointmentsAPI = async (filters:any) => {
  try {
    // Get token from localStorage and add to headers
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    const response = await axios.get("/api/appointments", {
      params: filters,
      headers,
    });

    if (response.data?.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || "Failed to fetch appointments.");
    }
  } catch (error) {
    console.error("Error fetching appointments:", error);
    throw error;
  }
};
