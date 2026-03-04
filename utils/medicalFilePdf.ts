import { jsPDF } from "jspdf";
import { CustomBold, CustomRegular } from "./custome_fonts";

export interface MedicalFilePdfAppointment {
  patientName?: string;
  date?: string;
  time?: string;
  sectionName?: string;
  doctorName?: string;
  phoneNumber?: string;
  testType?: string;
  notes?: string;
}

export interface MedicalFilePdfData {
  diagnosis?: string;
  prescription?: string;
  clinicalNotes?: string;
}

/**
 * Generate a PDF buffer for a single medical file (fișă medicală).
 * Uses Roboto fonts for Romanian characters.
 */
export function generateMedicalFilePdf(
  appointment: MedicalFilePdfAppointment,
  medicalFile: MedicalFilePdfData
): Buffer {
  const doc = new jsPDF();

  doc.addFileToVFS("Roboto-Regular.ttf", CustomRegular);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFileToVFS("Roboto-Bold.ttf", CustomBold);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");

  doc.setFont("Roboto", "normal");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 100);
  doc.text("Fișă medicală", margin, y);
  y += 14;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text("Date programare", margin, y);
  y += 7;

  doc.setFont("Roboto", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const lines = [
    ["Pacient:", appointment.patientName ?? "—"],
    ["Data:", appointment.date ?? "—"],
    ["Ora:", appointment.time ?? "—"],
    ["Secție:", appointment.sectionName ?? appointment.testType ?? "—"],
    ["Doctor:", appointment.doctorName ?? "—"],
    ["Telefon:", appointment.phoneNumber ?? "—"],
  ];
  for (const [label, value] of lines) {
    doc.setFont("Roboto", "bold");
    doc.text(label, margin, y);
    doc.setFont("Roboto", "normal");
    doc.text(String(value), margin + 28, y);
    y += 6;
  }
  y += 6;

  const maxWidth = pageWidth - margin * 2;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(11);
  doc.text("Diagnostic", margin, y);
  y += 6;
  doc.setFont("Roboto", "normal");
  doc.setFontSize(10);
  const diagnosisText = medicalFile.diagnosis?.trim() || "—";
  const diagnosisLines = doc.splitTextToSize(diagnosisText, maxWidth);
  doc.text(diagnosisLines, margin, y);
  y += diagnosisLines.length * 5 + 8;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(11);
  doc.text("Prescripție", margin, y);
  y += 6;
  doc.setFont("Roboto", "normal");
  doc.setFontSize(10);
  const prescriptionText = medicalFile.prescription?.trim() || "—";
  const prescriptionLines = doc.splitTextToSize(prescriptionText, maxWidth);
  doc.text(prescriptionLines, margin, y);
  y += prescriptionLines.length * 5 + 8;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(11);
  doc.text("Observații clinice", margin, y);
  y += 6;
  doc.setFont("Roboto", "normal");
  doc.setFontSize(10);
  const notesText = medicalFile.clinicalNotes?.trim() || "—";
  const notesLines = doc.splitTextToSize(notesText, maxWidth);
  doc.text(notesLines, margin, y);

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
