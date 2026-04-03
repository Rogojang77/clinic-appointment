export interface MedicalLetterFields {
  pacientNume: string;
  pacientDataNasterii: string;
  pacientCnp: string;
  dataConsult: string;
  internarePerioada: string;
  nrFO: string;

  motivePrezentare: string;
  oncologic: "DA" | "NU" | "";
  diagnosticText: string;
  diagnosticCod: string;

  anamneza: string;
  factoriRisc: string;

  exClinGeneral: string;
  exClinLocal: string;

  labNormale: string;
  labPatologice: string;

  ekg: string;
  eco: string;
  rx: string;
  paracliniceAlte: string;

  tratamentEfectuat: string;
  alteInformatii: string;

  tratamentRecomandat: string;
  durataTratament: string;

  revenireInternare: "da" | "nu" | "";
  revenireTermen: string;

  prescriptie: "eliberata" | "nuNecesara" | "nuEliberata" | "";
  prescriptieSerieNumar: string;

  concediu: "eliberat" | "nuNecesara" | "nuEliberat" | "";
  concediuSerieNumar: string;

  ingrijiriDomiciliu: "eliberata" | "nuNecesara" | "";
  dispozitive: "eliberata" | "nuNecesara" | "";

  dataScrisoare: string;
  semnaturaMedic: string;

  caleTransmitere: "asigurat" | "posta" | "";
  detaliiPosta: string;
}

export function combineMedicalLetterFields(fields: Partial<MedicalLetterFields>) {
  const diagnosis = [
    "Motivele prezentării:",
    fields.motivePrezentare || "—",
    "",
    `Pacient diagnosticat cu afecțiune oncologică: ${fields.oncologic || "—"}`,
    "",
    "Diagnosticul și codul de diagnostic:",
    fields.diagnosticText || "—",
    fields.diagnosticCod ? `Cod diagnostic: ${fields.diagnosticCod}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prescription = [
    "Tratament efectuat:",
    fields.tratamentEfectuat || "—",
    "",
    "Tratament recomandat:",
    fields.tratamentRecomandat || "—",
    "",
    fields.durataTratament
      ? `Durata recomandată conform protocolului: ${fields.durataTratament}`
      : "",
    "",
    "Prescripții / dispozitive / îngrijiri:",
    `Prescripție medicală: ${fields.prescriptie || "—"} ${
      fields.prescriptieSerieNumar ? `(${fields.prescriptieSerieNumar})` : ""
    }`,
    `Concediu medical: ${fields.concediu || "—"} ${
      fields.concediuSerieNumar ? `(${fields.concediuSerieNumar})` : ""
    }`,
    `Îngrijiri la domiciliu/paliative: ${fields.ingrijiriDomiciliu || "—"}`,
    `Prescripție pentru dispozitive medicale: ${fields.dispozitive || "—"}`,
  ]
    .filter(Boolean)
    .join("\n");

  const clinicalNotes = [
    "Date pacient:",
    `Pacient: ${fields.pacientNume || "—"}`,
    fields.pacientDataNasterii
      ? `Data nașterii: ${fields.pacientDataNasterii}`
      : "",
    fields.pacientCnp ? `CNP/cod unic: ${fields.pacientCnp}` : "",
    fields.dataConsult ? `Data consultației: ${fields.dataConsult}` : "",
    fields.internarePerioada
      ? `Perioada internării: ${fields.internarePerioada}`
      : "",
    fields.nrFO ? `Nr. F.O./Registru consultații: ${fields.nrFO}` : "",
    "",
    "Anamneză:",
    fields.anamneza || "—",
    "",
    "Factori de risc:",
    fields.factoriRisc || "—",
    "",
    "Examen clinic general:",
    fields.exClinGeneral || "—",
    "",
    "Examen clinic local:",
    fields.exClinLocal || "—",
    "",
    "Examene de laborator cu valori normale:",
    fields.labNormale || "—",
    "",
    "Examene de laborator cu valori patologice:",
    fields.labPatologice || "—",
    "",
    "Examene paraclinice:",
    `EKG: ${fields.ekg || "—"}`,
    `ECO: ${fields.eco || "—"}`,
    `Rx: ${fields.rx || "—"}`,
    `Altele: ${fields.paracliniceAlte || "—"}`,
    "",
    "Alte informații referitoare la starea de sănătate:",
    fields.alteInformatii || "—",
    "",
    "Indicație de revenire pentru internare:",
    fields.revenireInternare
      ? `Revenire: ${fields.revenireInternare}${
          fields.revenireTermen ? `, în termen de ${fields.revenireTermen}` : ""
        }`
      : "—",
    "",
    "Calea de transmitere:",
    fields.caleTransmitere
      ? `Prin: ${fields.caleTransmitere}${
          fields.detaliiPosta ? ` (${fields.detaliiPosta})` : ""
        }`
      : "—",
    "",
    "Data scrisorii medicale:",
    fields.dataScrisoare || "—",
    "",
    "Medic:",
    fields.semnaturaMedic || "—",
  ]
    .filter(Boolean)
    .join("\n");

  return { diagnosis, prescription, clinicalNotes };
}

