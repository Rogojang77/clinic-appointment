import api from "@/services/api";

export const fetchAppointmentsAPI = async (filters:any) => {
  try {
    const response = await api.get("/appointments", {
      params: filters,
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
