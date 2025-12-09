export const checkIfFilled = (appointmentData: any, scheduleData: any, ) => {
    const defaultAppointmentsCount = appointmentData?.filter((appointment: any) => {
      return appointment?.isDefault;
    })?.length;
    const availableSlotsCount = scheduleData?.filter((slot: any) => slot?.date === "00:00:00")?.length;
    const isFilled = defaultAppointmentsCount === availableSlotsCount;
   
    return isFilled;
  };