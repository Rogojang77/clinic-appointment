import dayjs from "dayjs";

const isDateValid = (date: string) => {
    const appointmentDate = dayjs(date, "YYYY-MM-DD");
    const today = dayjs();
    return appointmentDate.isSame(today, "day") || appointmentDate.isAfter(today, "day");
}

export default isDateValid; 