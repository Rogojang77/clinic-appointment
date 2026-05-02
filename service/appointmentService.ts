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

/** Căutare în toate programările (nume, prenume, telefon). Min. 2 caractere. */
export const searchAppointmentsGlobal = async (search: string) => {
  const q = search.trim();
  if (q.length < 2) {
    return [];
  }
  try {
    const response = await api.get("/appointments", {
      params: { search: q },
    });
    if (response.data?.success) {
      return response.data.data ?? [];
    }
    throw new Error(response.data?.message || "Căutarea a eșuat.");
  } catch (error) {
    console.error("Error searching appointments:", error);
    throw error;
  }
};
