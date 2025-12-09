import jsPDF from "jspdf";
import "jspdf-autotable";
import { CustomBold, CustomRegular } from "./custome_fonts";

export const generatePDF = ({
  data = [],
  location = "Unknown Location",
  day = "Unknown Day",
  date = "Unknown Date",
  notes = "No additional notes provided.",
}) => {
  const doc = new jsPDF();

  // Add custom fonts for special characters
  doc.addFileToVFS("Roboto-Regular.ttf", CustomRegular);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");

  doc.addFileToVFS("Roboto-Bold.ttf", CustomBold);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");

  doc.setFont("Roboto", "normal");

  // Add top-center static logo
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoWidth = 30;
  const logoHeight = 20;
  const x = (pageWidth - logoWidth) / 2;

  try {
    doc.addImage('./mos2.jpg', "JPG", x, 5, logoWidth, logoHeight);
  } catch (error) {
    console.error("Error adding logo:", error);
  }

  // Add title
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 100);
  doc.text(`Appointments List for ${location} - ${day}, ${date}`, 12, 33);

  // Sort data by time in ascending order
  const sortedData = data.sort((a, b) => {
    const timeA = a.time ? new Date(`1970-01-01T${a.time}`) : new Date(0); // Parse time to Date
    const timeB = b.time ? new Date(`1970-01-01T${b.time}`) : new Date(0);
    return timeA - timeB; // Compare times
  });

  // Prepare table data
  const tableColumns = [
    "Time prezent",
    "Nume",
    "Prenume",
    "Department",
    "Telefon",
    "Doctor",
    "Notes",
  ];
  const tableRows = sortedData.map((appointment) => [
    appointment.time || "",
    appointment.patientName || "",
    appointment.patientSurname || "",
    appointment.testType || "",
    appointment.phoneNumber || "",
    appointment.doctorName || "",
    appointment.notes || "",
  ]);

  // Add the table
  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: 40,
  });

  // Get the final Y position after the table
  const finalY = doc.lastAutoTable?.finalY || 20;

  // Add notes section
  const pageMargin = 10;
  const maxWidth = pageWidth - pageMargin * 2;

  doc.setFont("Roboto", "normal");
  doc.setFontSize(12);
  doc.text("Notes:", pageMargin, finalY + 10);

  const notesText = notes || "No additional notes provided.";
  doc.text(notesText, pageMargin, finalY + 20, { maxWidth });

  // Save the PDF
  doc.save("appointments.pdf");
};
