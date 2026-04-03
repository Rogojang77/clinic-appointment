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
  fields?: {
    pacientNume?: string;
    pacientDataNasterii?: string;
    pacientCnp?: string;
    dataConsult?: string;
    internarePerioada?: string;
    nrFO?: string;

    motivePrezentare?: string;
    oncologic?: "DA" | "NU" | "";
    diagnosticText?: string;
    diagnosticCod?: string;

    anamneza?: string;
    factoriRisc?: string;

    exClinGeneral?: string;
    exClinLocal?: string;

    labNormale?: string;
    labPatologice?: string;

    ekg?: string;
    eco?: string;
    rx?: string;
    paracliniceAlte?: string;

    tratamentEfectuat?: string;
    alteInformatii?: string;

    tratamentRecomandat?: string;
    durataTratament?: string;

    revenireInternare?: "da" | "nu" | "";
    revenireTermen?: string;

    prescriptie?: "eliberata" | "nuNecesara" | "nuEliberata" | "";
    prescriptieSerieNumar?: string;

    concediu?: "eliberat" | "nuNecesara" | "nuEliberat" | "";
    concediuSerieNumar?: string;

    ingrijiriDomiciliu?: "eliberata" | "nuNecesara" | "";
    dispozitive?: "eliberata" | "nuNecesara" | "";

    dataScrisoare?: string;
    semnaturaMedic?: string;

    caleTransmitere?: "asigurat" | "posta" | "";
    detaliiPosta?: string;
  };
}

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
  const pageHeight = doc.internal.pageSize.getHeight();

  const margin = 18;
  const maxWidth = pageWidth - margin * 2;

  let y = 18;

  const lineHeight = 5;

  const nextLine = () => (y += lineHeight);
  const nextPage = () => {
    doc.addPage();
    y = 20;
  };

  const ensurePage = () => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  };

  const sectionTitle = (text: string) => {
    ensurePage();
    doc.setFont("Roboto", "bold");
    doc.text(text, margin, y);
    doc.setFont("Roboto", "normal");
    nextLine();
  };

  const textBlock = (text?: string) => {
    const value = text?.trim();
    if (!value) {
      doc.text(
        "...................................................................",
        margin,
        y
      );
      nextLine();
      return;
    }

    const lines = doc.splitTextToSize(value, maxWidth);
    doc.text(lines, margin, y);
    y += lines.length * lineHeight;
  };

  const extractFromMultiline = (source: string | undefined, label: string) => {
    if (!source) return "";
    const lines = source.split(/\r?\n/);
    const lowerLabel = label.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.toLowerCase().startsWith(lowerLabel)) continue;

      const colonIndex = line.indexOf(":");
      const afterColon =
        colonIndex >= 0 ? line.slice(colonIndex + 1).trim() : "";
      if (afterColon) return afterColon;

      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        if (!next) continue;
        return next;
      }
    }

    return "";
  };

  const extract = (label: string) =>
    extractFromMultiline(medicalFile.clinicalNotes, label);

  const extractFromDiagnosis = (label: string) =>
    extractFromMultiline(medicalFile.diagnosis, label);

  const f = medicalFile.fields;

  const diagnosisText = medicalFile.diagnosis ?? "";
  const prescriptionText = medicalFile.prescription ?? "";

  const motivePrezentare =
    f?.motivePrezentare ?? extractFromDiagnosis("Motivele prezentării");
  const oncologicStatus =
    f?.oncologic ??
    extractFromDiagnosis("Pacient diagnosticat cu afecțiune oncologică");

  const pacient = f?.pacientNume ?? extract("Pacient");
  const dataNasterii = f?.pacientDataNasterii ?? extract("Data nașterii");
  const cnp = f?.pacientCnp ?? extract("CNP/cod unic");
  const dataConsultatiei = f?.dataConsult ?? extract("Data consultației");
  const perioadaInternare = f?.internarePerioada ?? extract("Perioada internării");
  const nrFO = f?.nrFO ?? extract("Nr. F.O./Registru consultații");

  const anamneza = f?.anamneza ?? extract("Anamneză");
  const factoriRisc = f?.factoriRisc ?? extract("Factori de risc");

  const examGeneral = f?.exClinGeneral ?? extract("Examen clinic general");
  const examLocal = f?.exClinLocal ?? extract("Examen clinic local");

  const labNormal =
    f?.labNormale ?? extract("Examene de laborator cu valori normale");
  const labPatologic =
    f?.labPatologice ?? extract("Examene de laborator cu valori patologice");

  const ekg = f?.ekg ?? extract("EKG");
  const eco = f?.eco ?? extract("ECO");
  const rx = f?.rx ?? extract("Rx");
  const altele = f?.paracliniceAlte ?? extract("Altele");

  const alteInformatii =
    f?.alteInformatii ??
    extract("Alte informații referitoare la starea de sănătate");

  const revenire = f?.revenireInternare
    ? `Revenire: ${f.revenireInternare}${
        f.revenireTermen ? `, în termen de ${f.revenireTermen}` : ""
      }`
    : extract("Revenire");

  const transmitere = f?.caleTransmitere
    ? `Prin: ${f.caleTransmitere}${f.detaliiPosta ? ` (${f.detaliiPosta})` : ""}`
    : extract("Prin");

  const dataScrisoare = f?.dataScrisoare ?? extract("Data scrisorii medicale");

  const medic =
    (f?.semnaturaMedic ?? extract("Medic")) || appointment.doctorName || "";

  doc.setFontSize(10);

  const headerLines = [
    "Denumire Furnizor ..............................",
    "Medic ..................................................",
    "Contract/convenţie nr. .........................",
    "CAS ......................................................",
  ];

  headerLines.forEach((line) => {
    doc.text(line, margin, y);
    nextLine();
  });

  nextLine();

  doc.setFont("Roboto", "bold");
  doc.setFontSize(14);
  doc.text("SCRISOARE MEDICALĂ", pageWidth / 2, y, { align: "center" });

  doc.setFont("Roboto", "normal");
  doc.setFontSize(10);

  nextLine();
  nextLine();

  const intro =
    `Stimate(ă) coleg(ă), vă informăm că ${
      pacient || appointment.patientName || "............................."
    }, ` +
    `născut la data de ${dataNasterii || "................"}, ` +
    `CNP/cod unic de asigurare ${cnp || "....................."}, ` +
    `a fost consultat în serviciul nostru la data de ${
      dataConsultatiei || appointment.date || "................"
    } ` +
    `/a fost internat in perioada ${
      perioadaInternare || "....................."
    } ` +
    `nr. F.O./nr. din Registrul de consultaţii ${nrFO || "......................."};`;

  const introLines = doc.splitTextToSize(intro, maxWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * lineHeight;

  nextLine();

  sectionTitle("Motivele prezentării:");
  textBlock(motivePrezentare);

  const oncologicValue = oncologicStatus.toUpperCase();
  const daChecked = oncologicValue.includes("DA");
  const nuChecked = oncologicValue.includes("NU");
  const checked = "[X]";
  const unchecked = "[ ]";

  doc.text(
    `Pacient diagnosticat cu afecțiune oncologică DA ${
      daChecked ? checked : unchecked
    } / NU ${nuChecked ? checked : unchecked}`,
    margin,
    y
  );
  nextLine();
  nextLine();

  sectionTitle("Diagnosticul şi codul de diagnostic:");
  textBlock(diagnosisText);

  nextLine();

  sectionTitle("Anamneză:");
  textBlock(anamneza);

  doc.text("- factori de risc", margin, y);
  nextLine();
  textBlock(factoriRisc);

  nextLine();

  sectionTitle("Examen clinic:");

  doc.text("- general", margin, y);
  nextLine();
  textBlock(examGeneral);

  doc.text("- local", margin, y);
  nextLine();
  textBlock(examLocal);

  nextLine();

  sectionTitle("Examene de laborator:");

  doc.text("- cu valori normale", margin, y);
  nextLine();
  textBlock(labNormal);

  doc.text("- cu valori patologice", margin, y);
  nextLine();
  textBlock(labPatologic);

  nextLine();

  sectionTitle("Examene paraclinice:");

  doc.text("EKG", margin, y);
  nextLine();
  textBlock(ekg);

  doc.text("ECO", margin, y);
  nextLine();
  textBlock(eco);

  doc.text("Rx", margin, y);
  nextLine();
  textBlock(rx);

  nextPage();

  doc.text("Altele", margin, y);
  nextLine();
  textBlock(altele);

  nextLine();

  sectionTitle("Tratament efectuat:");
  textBlock(prescriptionText);

  nextLine();

  sectionTitle("Alte informaţii referitoare la starea de sănătate a asiguratului:");
  textBlock(alteInformatii);

  nextLine();

  sectionTitle("Tratament recomandat");
  textBlock();

  nextLine();

  const revenireDa = revenire.toLowerCase().includes("da");

  doc.text(
    `${revenireDa ? checked : unchecked} da, revine pentru internare în termen de ${revenire || ".............."}`,
    margin,
    y
  );
  nextLine();

  doc.text(
    `${!revenireDa ? checked : unchecked} nu, nu este necesară revenirea pentru internare`,
    margin,
    y
  );

  nextLine();
  nextLine();

  doc.text(`Data ${dataScrisoare || "..................."}`, margin, y);
  nextLine();

  doc.text(
    `Semnătura şi parafa medicului ${medic || "............................."}`,
    margin,
    y
  );

  nextLine();
  nextLine();

  doc.text("Calea de transmitere:", margin, y);
  nextLine();

  const prinAsigurat = transmitere.toLowerCase().includes("asigurat");

  doc.text(`${prinAsigurat ? checked : unchecked} prin asigurat`, margin, y);
  nextLine();

  doc.text(
    `${!prinAsigurat ? checked : unchecked} prin poştă ..........................`,
    margin,
    y
  );

  nextLine();
  nextLine();

  doc.setFontSize(9);

  const footer = `
*) Scrisoarea medicală se întocmeşte în două exemplare, din care un exemplar rămâne la medicul care a efectuat consultaţia/serviciul în ambulatoriul de specialitate, iar un exemplar este transmis medicului de familie/medicului de specialitate din ambulatoriul de specialitate.

Scrisoarea medicală sau biletul de ieşire din spital sunt documente tipizate care se întocmesc la data externării, într-un singur exemplar care este transmis medicului de familie/medicului de specialitate din ambulatoriul de specialitate, direct, prin poșta electronică ori prin intermediul asiguratului.

Scrisoarea medicală trimisă prin poștă electronică este semnată cu semnătură electronică extinsă/calificată.
`;

  const footerLines = doc.splitTextToSize(footer, maxWidth);
  doc.text(footerLines, margin, y);

  const arrayBuffer = doc.output("arraybuffer");

  return Buffer.from(arrayBuffer);
}