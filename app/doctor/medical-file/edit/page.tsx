"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthEffect } from "@/hook/useAuthEffect";
import { useUserStore } from "@/store/store";
import { medicalFilesApi, MedicalFileDto } from "@/services/api";
import Spinner from "@/components/common/loader";
import MedicalLetterForm, {
  MedicalLetterState,
} from "@/components/doctor/MedicalLetterForm";

function mapFileToForm(file: MedicalFileDto): MedicalLetterState {
  if (file.fields) {
    // Prefer structured fields when present.
    return {
      pacientNume: file.fields.pacientNume ?? "",
      pacientDataNasterii: file.fields.pacientDataNasterii ?? "",
      pacientCnp: file.fields.pacientCnp ?? "",
      dataConsult: file.fields.dataConsult ?? "",
      internarePerioada: file.fields.internarePerioada ?? "",
      nrFO: file.fields.nrFO ?? "",

      motivePrezentare: file.fields.motivePrezentare ?? "",
      oncologic: (file.fields.oncologic as any) ?? "",
      diagnosticText: file.fields.diagnosticText ?? "",
      diagnosticCod: file.fields.diagnosticCod ?? "",

      anamneza: file.fields.anamneza ?? "",
      factoriRisc: file.fields.factoriRisc ?? "",

      exClinGeneral: file.fields.exClinGeneral ?? "",
      exClinLocal: file.fields.exClinLocal ?? "",

      labNormale: file.fields.labNormale ?? "",
      labPatologice: file.fields.labPatologice ?? "",

      ekg: file.fields.ekg ?? "",
      eco: file.fields.eco ?? "",
      rx: file.fields.rx ?? "",
      paracliniceAlte: file.fields.paracliniceAlte ?? "",

      tratamentEfectuat: file.fields.tratamentEfectuat ?? "",
      alteInformatii: file.fields.alteInformatii ?? "",

      tratamentRecomandat: file.fields.tratamentRecomandat ?? "",
      durataTratament: file.fields.durataTratament ?? "",

      revenireInternare: (file.fields.revenireInternare as any) ?? "",
      revenireTermen: file.fields.revenireTermen ?? "",

      prescriptie: (file.fields.prescriptie as any) ?? "",
      prescriptieSerieNumar: file.fields.prescriptieSerieNumar ?? "",

      concediu: (file.fields.concediu as any) ?? "",
      concediuSerieNumar: file.fields.concediuSerieNumar ?? "",

      ingrijiriDomiciliu: (file.fields.ingrijiriDomiciliu as any) ?? "",
      dispozitive: (file.fields.dispozitive as any) ?? "",

      dataScrisoare: file.fields.dataScrisoare ?? "",
      semnaturaMedic: file.fields.semnaturaMedic ?? "",

      caleTransmitere: (file.fields.caleTransmitere as any) ?? "",
      detaliiPosta: file.fields.detaliiPosta ?? "",
    };
  }

  // Start with empty state; we will fill from the combined strings.
  const state: MedicalLetterState = {
    pacientNume: "",
    pacientDataNasterii: "",
    pacientCnp: "",
    dataConsult: "",
    internarePerioada: "",
    nrFO: "",
    motivePrezentare: "",
    oncologic: "",
    diagnosticText: "",
    diagnosticCod: "",
    anamneza: "",
    factoriRisc: "",
    exClinGeneral: "",
    exClinLocal: "",
    labNormale: "",
    labPatologice: "",
    ekg: "",
    eco: "",
    rx: "",
    paracliniceAlte: "",
    tratamentEfectuat: "",
    alteInformatii: "",
    tratamentRecomandat: "",
    durataTratament: "",
    revenireInternare: "",
    revenireTermen: "",
    prescriptie: "",
    prescriptieSerieNumar: "",
    concediu: "",
    concediuSerieNumar: "",
    ingrijiriDomiciliu: "",
    dispozitive: "",
    dataScrisoare: "",
    semnaturaMedic: "",
    caleTransmitere: "",
    detaliiPosta: "",
  };

  const diagLines = (file.diagnosis || "").split("\n");
  const prescLines = (file.prescription || "").split("\n");
  const notesLines = (file.clinicalNotes || "").split("\n");

  const getLineAfter = (lines: string[], label: string): string => {
    const idx = lines.findIndex((l) => l.trim().startsWith(label));
    if (idx >= 0 && idx + 1 < lines.length) {
      return lines[idx + 1].trim();
    }
    return "";
  };

  const getAfterColon = (line: string): string =>
    line.includes(":") ? line.split(":").slice(1).join(":").trim() : "";

  // Diagnosis-related
  state.motivePrezentare = getLineAfter(diagLines, "Motivele prezentării:");
  const oncologicLine = diagLines.find((l) =>
    l.trim().startsWith("Pacient diagnosticat cu afecțiune oncologică")
  );
  if (oncologicLine) {
    const val = getAfterColon(oncologicLine).toUpperCase();
    if (val === "DA" || val === "NU") state.oncologic = val as "DA" | "NU";
  }
  const diagTextLine = getLineAfter(
    diagLines,
    "Diagnosticul și codul de diagnostic:"
  );
  if (diagTextLine && diagTextLine !== "—") {
    state.diagnosticText = diagTextLine;
  }
  const codLine = diagLines.find((l) => l.trim().startsWith("Cod diagnostic"));
  if (codLine) {
    state.diagnosticCod = getAfterColon(codLine);
  }

  // Prescription-related
  state.tratamentEfectuat = getLineAfter(prescLines, "Tratament efectuat:");
  state.tratamentRecomandat = getLineAfter(
    prescLines,
    "Tratament recomandat:"
  );
  const durataLine = prescLines.find((l) =>
    l.trim().startsWith("Durata recomandată conform protocolului")
  );
  if (durataLine) {
    state.durataTratament = getAfterColon(durataLine);
  }
  const prescriptieLine = prescLines.find((l) =>
    l.trim().startsWith("Prescripție medicală:")
  );
  if (prescriptieLine) {
    const val = getAfterColon(prescriptieLine).toLowerCase();
    if (val.startsWith("eliberata")) state.prescriptie = "eliberata";
    else if (val.startsWith("nunece")) state.prescriptie = "nuNecesara";
    else if (val.startsWith("nueliberata")) state.prescriptie = "nuEliberata";
    const match = prescriptieLine.match(/\(([^)]+)\)/);
    if (match) state.prescriptieSerieNumar = match[1];
  }
  const concediuLine = prescLines.find((l) =>
    l.trim().startsWith("Concediu medical:")
  );
  if (concediuLine) {
    const val = getAfterColon(concediuLine).toLowerCase();
    if (val.startsWith("eliberat")) state.concediu = "eliberat";
    else if (val.startsWith("nunece")) state.concediu = "nuNecesara";
    else if (val.startsWith("nueliberat")) state.concediu = "nuEliberat";
    const match = concediuLine.match(/\(([^)]+)\)/);
    if (match) state.concediuSerieNumar = match[1];
  }
  const ingrijiriLine = prescLines.find((l) =>
    l.trim().startsWith("Îngrijiri la domiciliu/paliative:")
  );
  if (ingrijiriLine) {
    const val = getAfterColon(ingrijiriLine).toLowerCase();
    if (val.startsWith("eliberata")) state.ingrijiriDomiciliu = "eliberata";
    else if (val.startsWith("nunece")) state.ingrijiriDomiciliu = "nuNecesara";
  }
  const dispozitiveLine = prescLines.find((l) =>
    l.trim().startsWith("Prescripție pentru dispozitive medicale:")
  );
  if (dispozitiveLine) {
    const val = getAfterColon(dispozitiveLine).toLowerCase();
    if (val.startsWith("eliberata")) state.dispozitive = "eliberata";
    else if (val.startsWith("nunece")) state.dispozitive = "nuNecesara";
  }

  // Clinical notes: patient data and sections
  const getLine = (label: string) =>
    notesLines.find((l) => l.trim().startsWith(label)) || "";

  const pacientLine = getLine("Pacient:");
  if (pacientLine) state.pacientNume = getAfterColon(pacientLine);
  const nastereLine = getLine("Data nașterii:");
  if (nastereLine) state.pacientDataNasterii = getAfterColon(nastereLine);
  const cnpLine = getLine("CNP/cod unic:");
  if (cnpLine) state.pacientCnp = getAfterColon(cnpLine);
  const dataConsultLine = getLine("Data consultației:");
  if (dataConsultLine) state.dataConsult = getAfterColon(dataConsultLine);
  const perioadLine = getLine("Perioada internării:");
  if (perioadLine) state.internarePerioada = getAfterColon(perioadLine);
  const nrFoLine = getLine("Nr. F.O./Registru consultații:");
  if (nrFoLine) state.nrFO = getAfterColon(nrFoLine);

  state.anamneza = getLineAfter(notesLines, "Anamneză:");
  state.factoriRisc = getLineAfter(notesLines, "Factori de risc:");
  state.exClinGeneral = getLineAfter(
    notesLines,
    "Examen clinic general:"
  );
  state.exClinLocal = getLineAfter(notesLines, "Examen clinic local:");
  state.labNormale = getLineAfter(
    notesLines,
    "Examene de laborator cu valori normale:"
  );
  state.labPatologice = getLineAfter(
    notesLines,
    "Examene de laborator cu valori patologice:"
  );

  const ekgLine = getLine("EKG:");
  if (ekgLine) state.ekg = getAfterColon(ekgLine);
  const ecoLine = getLine("ECO:");
  if (ecoLine) state.eco = getAfterColon(ecoLine);
  const rxLine = getLine("Rx:");
  if (rxLine) state.rx = getAfterColon(rxLine);
  const alteParacLine = getLine("Altele:");
  if (alteParacLine) state.paracliniceAlte = getAfterColon(alteParacLine);

  state.alteInformatii = getLineAfter(
    notesLines,
    "Alte informații referitoare la starea de sănătate:"
  );

  const revenireLine = getLine("Revenire:");
  if (revenireLine) {
    const val = revenireLine.toLowerCase();
    if (val.includes("revenire: da")) state.revenireInternare = "da";
    if (val.includes("revenire: nu")) state.revenireInternare = "nu";
    const termenMatch = revenireLine.match(/în termen de\s+(.+)/i);
    if (termenMatch) state.revenireTermen = termenMatch[1].trim();
  }

  const caleLine = getLine("Prin:");
  if (caleLine) {
    const lower = caleLine.toLowerCase();
    if (lower.includes("asigurat")) state.caleTransmitere = "asigurat";
    if (lower.includes("posta") || lower.includes("poștă"))
      state.caleTransmitere = "posta";
    const detaliiMatch = caleLine.match(/\(([^)]+)\)/);
    if (detaliiMatch) state.detaliiPosta = detaliiMatch[1];
  }

  const dataScrisoareLine = getLine("Data scrisorii medicale:");
  if (dataScrisoareLine)
    state.dataScrisoare = getAfterColon(dataScrisoareLine);
  const medicLine = getLine("Medic:");
  if (medicLine) state.semnaturaMedic = getAfterColon(medicLine);

  return state;
}

function EditMedicalFilePageContent() {
  useAuthEffect();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUserStore();

  const fileId = searchParams.get("fileId") || "";
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<MedicalFileDto | null>(null);
  const [initialForm, setInitialForm] = useState<MedicalLetterState | null>(
    null
  );

  useEffect(() => {
    if (!user) return;
    if (user.role !== "doctor" && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!fileId) {
        setLoading(false);
        return;
      }
      try {
        const res = await medicalFilesApi.getById(fileId);
        if (!isMounted) return;
        const data = res.data.data;
        setFile(data);
        setInitialForm(mapFileToForm(data));
      } catch {
        if (!isMounted) return;
        setFile(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [fileId]);

  if (!fileId) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-200 py-5 min-h-screen">
        <div className="w-full max-w-xl p-6 bg-white rounded-md shadow-md border border-gray-200 space-y-3">
          <h1 className="text-xl font-semibold text-gray-900">
            Editează fișa medicală
          </h1>
          <p className="text-sm text-gray-700">
            Nu a fost furnizat niciun identificator de fișă medicală. Accesați
            această pagină din lista de fișe medicale pentru a edita.
          </p>
        </div>
      </div>
    );
  }

  if (!user || loading) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-200 py-5 min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!file || !initialForm) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-200 py-5 min-h-screen">
        <div className="w-full max-w-xl p-6 bg-white rounded-md shadow-md border border-gray-200 space-y-3">
          <h1 className="text-xl font-semibold text-gray-900">
            Editează fișa medicală
          </h1>
          <p className="text-sm text-gray-700">
            Fișa medicală nu a fost găsită sau nu poate fi accesată.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-gray-200 py-5 min-h-screen">
      <MedicalLetterForm
        appointmentId={file.appointmentId}
        doctorName={user.username}
        mode="edit"
        medicalFileId={file._id}
        initialForm={initialForm}
      />
    </div>
  );
}

export default function EditMedicalFilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center bg-gray-200 py-5 min-h-screen">
          <Spinner />
        </div>
      }
    >
      <EditMedicalFilePageContent />
    </Suspense>
  );
}

