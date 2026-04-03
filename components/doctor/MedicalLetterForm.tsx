"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { medicalFilesApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/common/loader";
import toast from "react-hot-toast";

interface MedicalLetterFormProps {
  appointmentId: string;
  doctorName: string;
  mode?: "create" | "edit";
  medicalFileId?: string;
  initialForm?: Partial<MedicalLetterState>;
}

export interface MedicalLetterState {
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

const initialState: MedicalLetterState = {
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

export default function MedicalLetterForm(props: MedicalLetterFormProps) {
  const { appointmentId, doctorName, mode = "create", medicalFileId, initialForm } =
    props;

  const [form, setForm] = useState<MedicalLetterState>(
    initialForm ? { ...initialState, ...initialForm } : initialState
  );
  const [errors, setErrors] = useState<Partial<
    Record<keyof MedicalLetterState | "oncologic", string>
  >>({});
  const [loading, setLoading] = useState(mode === "create");
  const [saving, setSaving] = useState(false);
  const [hasExistingFile, setHasExistingFile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!form.semnaturaMedic && doctorName) {
      setForm((prev) => ({ ...prev, semnaturaMedic: doctorName }));
    }
  }, [doctorName, form.semnaturaMedic]);

  useEffect(() => {
    if (mode !== "create") {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const load = async () => {
      try {
        const res = await medicalFilesApi.getByAppointment(appointmentId);
        const existing = res.data?.data;
        if (!isMounted) return;
        if (Array.isArray(existing) && existing.length > 0) {
          setHasExistingFile(true);
        }
      } catch {
        // ignore – treat as no file
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [appointmentId, mode]);

  const updateField = <K extends keyof MedicalLetterState>(
    key: K,
    value: MedicalLetterState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateRequired = () => {
    const nextErrors: Partial<
      Record<keyof MedicalLetterState | "oncologic", string>
    > = {};

    if (!form.pacientNume.trim()) {
      nextErrors.pacientNume = "Numele pacientului este obligatoriu.";
    }
    if (!form.pacientDataNasterii) {
      nextErrors.pacientDataNasterii = "Data nașterii este obligatorie.";
    }
    if (!form.pacientCnp.trim()) {
      nextErrors.pacientCnp =
        "CNP / cod unic de asigurare este obligatoriu.";
    }
    if (!form.diagnosticText.trim()) {
      nextErrors.diagnosticText =
        "Câmpul pentru diagnostic este obligatoriu.";
    }
    if (!form.dataScrisoare) {
      nextErrors.dataScrisoare =
        "Data scrisorii medicale este obligatorie.";
    }
    if (!form.oncologic) {
      nextErrors.oncologic =
        "Bifați dacă pacientul are afecțiune oncologică (DA/NU).";
    }

    setErrors(nextErrors);

    const firstErrorMessage =
      Object.values(nextErrors)[0] ?? "";

    return firstErrorMessage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateRequired();
    if (error) {
      toast.error(error);
      return;
    }

    if (mode === "create" && hasExistingFile) {
      toast.error("Există deja o fișă medicală pentru această programare.");
      return;
    }

    try {
      setSaving(true);

      if (mode === "edit") {
        if (!medicalFileId) {
          toast.error("ID-ul fișei medicale lipsește. Reîncercați din listă.");
          return;
        }
        await medicalFilesApi.update(medicalFileId, {
          fields: form,
        });
        toast.success("Fișa medicală a fost actualizată.");
      } else {
        await medicalFilesApi.create({
          appointmentId,
          fields: form,
        });
        toast.success("Fișa medicală a fost creată.");
      }

      router.push("/doctor/medical-files");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "A apărut o eroare la salvarea fișei medicale.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  if (hasExistingFile) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-md border border-gray-200 p-6 mt-6">
        <p className="text-sm text-gray-700">
          Există deja o fișă medicală pentru această programare. Puteți descărca
          fișa existentă din ecranul programării.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-4xl mx-auto bg-white rounded-md border border-gray-200 p-6 space-y-6"
    >
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">
        Scrisoare medicală
      </h1>
      <p className="text-sm text-gray-600 mb-4">
        Completați câmpurile de mai jos conform modelului oficial al
        scrisorii medicale. Câmpurile marcate cu * sunt obligatorii.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">Date pacient</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nume și prenume pacient *
            </label>
            <input
              type="text"
              className={`mt-1 block w-full rounded-md px-3 py-2 text-sm border ${
                errors.pacientNume ? "border-red-500" : "border-gray-300"
              }`}
              value={form.pacientNume}
              onChange={(e) => updateField("pacientNume", e.target.value)}
            />
            {errors.pacientNume && (
              <p className="mt-1 text-xs text-red-600">
                {errors.pacientNume}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Data nașterii *
            </label>
            <input
              type="date"
              className={`mt-1 block w-full rounded-md px-3 py-2 text-sm border ${
                errors.pacientDataNasterii ? "border-red-500" : "border-gray-300"
              }`}
              value={form.pacientDataNasterii}
              onChange={(e) =>
                updateField("pacientDataNasterii", e.target.value)
              }
            />
            {errors.pacientDataNasterii && (
              <p className="mt-1 text-xs text-red-600">
                {errors.pacientDataNasterii}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              CNP / cod unic de asigurare *
            </label>
            <input
              type="text"
              className={`mt-1 block w-full rounded-md px-3 py-2 text-sm border ${
                errors.pacientCnp ? "border-red-500" : "border-gray-300"
              }`}
              value={form.pacientCnp}
              onChange={(e) => updateField("pacientCnp", e.target.value)}
            />
            {errors.pacientCnp && (
              <p className="mt-1 text-xs text-red-600">{errors.pacientCnp}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Data consultației
            </label>
            <input
              type="date"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={form.dataConsult}
              onChange={(e) => updateField("dataConsult", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Perioada internării
            </label>
            <input
              type="text"
              placeholder="de la ... până la ..."
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={form.internarePerioada}
              onChange={(e) =>
                updateField("internarePerioada", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nr. F.O. / nr. Registru consultații
            </label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={form.nrFO}
              onChange={(e) => updateField("nrFO", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">
          Motivele prezentării și diagnostic
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Motivele prezentării
            </label>
            <textarea
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[72px]"
              value={form.motivePrezentare}
              onChange={(e) =>
                updateField("motivePrezentare", e.target.value)
              }
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Pacient diagnosticat cu afecțiune oncologică *
            </span>
            <div className="flex gap-4 text-sm">
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="oncologic"
                  value="DA"
                  checked={form.oncologic === "DA"}
                  onChange={() => updateField("oncologic", "DA")}
                />
                <span>DA</span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="oncologic"
                  value="NU"
                  checked={form.oncologic === "NU"}
                  onChange={() => updateField("oncologic", "NU")}
                />
                <span>NU</span>
              </label>
            </div>
            {errors.oncologic && (
              <p className="mt-1 text-xs text-red-600">{errors.oncologic}</p>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Diagnosticul *
              </label>
              <textarea
                className={`mt-1 block w-full rounded-md px-3 py-2 text-sm min-h-[72px] border ${
                  errors.diagnosticText ? "border-red-500" : "border-gray-300"
                }`}
                value={form.diagnosticText}
                onChange={(e) =>
                  updateField("diagnosticText", e.target.value)
                }
              />
              {errors.diagnosticText && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.diagnosticText}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Cod diagnostic
              </label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={form.diagnosticCod}
                onChange={(e) =>
                  updateField("diagnosticCod", e.target.value)
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">Anamneză</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Anamneză
            </label>
            <textarea
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[72px]"
              value={form.anamneza}
              onChange={(e) => updateField("anamneza", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Factori de risc
            </label>
            <textarea
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[72px]"
              value={form.factoriRisc}
              onChange={(e) => updateField("factoriRisc", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">Examen clinic</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Examen clinic – general
            </label>
            <textarea
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[72px]"
              value={form.exClinGeneral}
              onChange={(e) =>
                updateField("exClinGeneral", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Examen clinic – local
            </label>
            <textarea
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[72px]"
              value={form.exClinLocal}
              onChange={(e) =>
                updateField("exClinLocal", e.target.value)
              }
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">
          Examene de laborator și paraclinice
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Examene de laborator cu valori normale
            </label>
            <textarea
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[72px]"
              value={form.labNormale}
              onChange={(e) => updateField("labNormale", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Examene de laborator cu valori patologice
            </label>
            <textarea
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[72px]"
              value={form.labPatologice}
              onChange={(e) =>
                updateField("labPatologice", e.target.value)
              }
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                EKG
              </label>
              <textarea
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[56px]"
                value={form.ekg}
                onChange={(e) => updateField("ekg", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                ECO
              </label>
              <textarea
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[56px]"
                value={form.eco}
                onChange={(e) => updateField("eco", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Rx
              </label>
              <textarea
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[56px]"
                value={form.rx}
                onChange={(e) => updateField("rx", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Alte examene paraclinice
              </label>
              <textarea
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[56px]"
                value={form.paracliniceAlte}
                onChange={(e) =>
                  updateField("paracliniceAlte", e.target.value)
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">
          Tratament și alte informații
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tratament efectuat
            </label>
            <textarea
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[72px]"
              value={form.tratamentEfectuat}
              onChange={(e) =>
                updateField("tratamentEfectuat", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Alte informații referitoare la starea de sănătate
            </label>
            <textarea
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[72px]"
              value={form.alteInformatii}
              onChange={(e) =>
                updateField("alteInformatii", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tratament recomandat
            </label>
            <textarea
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[96px]"
              value={form.tratamentRecomandat}
              onChange={(e) =>
                updateField("tratamentRecomandat", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Durata tratamentului (conform protocolului terapeutic)
            </label>
            <textarea
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[56px]"
              value={form.durataTratament}
              onChange={(e) =>
                updateField("durataTratament", e.target.value)
              }
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">
          Indicații administrative
        </h2>
        <div className="space-y-4">
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Indicație de revenire pentru internare
            </span>
            <div className="flex flex-col gap-2 text-sm">
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="revenireInternare"
                  value="da"
                  checked={form.revenireInternare === "da"}
                  onChange={() => updateField("revenireInternare", "da")}
                />
                <span>Da, revine pentru internare</span>
              </label>
              {form.revenireInternare === "da" && (
                <input
                  type="text"
                  placeholder="în termen de ..."
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={form.revenireTermen}
                  onChange={(e) =>
                    updateField("revenireTermen", e.target.value)
                  }
                />
              )}
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="revenireInternare"
                  value="nu"
                  checked={form.revenireInternare === "nu"}
                  onChange={() => updateField("revenireInternare", "nu")}
                />
                <span>Nu, nu este necesară revenirea pentru internare</span>
              </label>
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Prescripție medicală
            </span>
            <div className="flex flex-col gap-2 text-sm">
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="prescriptie"
                  value="eliberata"
                  checked={form.prescriptie === "eliberata"}
                  onChange={() => updateField("prescriptie", "eliberata")}
                />
                <span>S-a eliberat prescripție medicală</span>
              </label>
              {form.prescriptie === "eliberata" && (
                <input
                  type="text"
                  placeholder="seria și numărul"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={form.prescriptieSerieNumar}
                  onChange={(e) =>
                    updateField("prescriptieSerieNumar", e.target.value)
                  }
                />
              )}
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="prescriptie"
                  value="nuNecesara"
                  checked={form.prescriptie === "nuNecesara"}
                  onChange={() =>
                    updateField("prescriptie", "nuNecesara")
                  }
                />
                <span>
                  Nu s-a eliberat prescripție medicală deoarece nu a fost
                  necesar
                </span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="prescriptie"
                  value="nuEliberata"
                  checked={form.prescriptie === "nuEliberata"}
                  onChange={() =>
                    updateField("prescriptie", "nuEliberata")
                  }
                />
                <span>Nu s-a eliberat prescripție medicală</span>
              </label>
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Concediu medical la externare/consultație
            </span>
            <div className="flex flex-col gap-2 text-sm">
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="concediu"
                  value="eliberat"
                  checked={form.concediu === "eliberat"}
                  onChange={() => updateField("concediu", "eliberat")}
                />
                <span>S-a eliberat concediu medical</span>
              </label>
              {form.concediu === "eliberat" && (
                <input
                  type="text"
                  placeholder="seria și numărul"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={form.concediuSerieNumar}
                  onChange={(e) =>
                    updateField("concediuSerieNumar", e.target.value)
                  }
                />
              )}
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="concediu"
                  value="nuNecesara"
                  checked={form.concediu === "nuNecesara"}
                  onChange={() =>
                    updateField("concediu", "nuNecesara")
                  }
                />
                <span>
                  Nu s-a eliberat concediu medical la externare deoarece nu a
                  fost necesar
                </span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="concediu"
                  value="nuEliberat"
                  checked={form.concediu === "nuEliberat"}
                  onChange={() =>
                    updateField("concediu", "nuEliberat")
                  }
                />
                <span>Nu s-a eliberat concediu medical la externare</span>
              </label>
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Recomandare pentru îngrijiri medicale la domiciliu/paliative
            </span>
            <div className="flex flex-col gap-2 text-sm">
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="ingrijiriDomiciliu"
                  value="eliberata"
                  checked={form.ingrijiriDomiciliu === "eliberata"}
                  onChange={() =>
                    updateField("ingrijiriDomiciliu", "eliberata")
                  }
                />
                <span>
                  S-a eliberat recomandare pentru îngrijiri medicale la
                  domiciliu/paliative la domiciliu
                </span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="ingrijiriDomiciliu"
                  value="nuNecesara"
                  checked={form.ingrijiriDomiciliu === "nuNecesara"}
                  onChange={() =>
                    updateField("ingrijiriDomiciliu", "nuNecesara")
                  }
                />
                <span>
                  Nu s-a eliberat recomandare pentru îngrijiri medicale la
                  domiciliu/paliative la domiciliu, deoarece nu a fost
                  necesar
                </span>
              </label>
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Prescripție medicală pentru dispozitive medicale în ambulatoriu
            </span>
            <div className="flex flex-col gap-2 text-sm">
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="dispozitive"
                  value="eliberata"
                  checked={form.dispozitive === "eliberata"}
                  onChange={() =>
                    updateField("dispozitive", "eliberata")
                  }
                />
                <span>
                  S-a eliberat prescripție medicală pentru dispozitive
                  medicale în ambulatoriu
                </span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="dispozitive"
                  value="nuNecesara"
                  checked={form.dispozitive === "nuNecesara"}
                  onChange={() =>
                    updateField("dispozitive", "nuNecesara")
                  }
                />
                <span>
                  Nu s-a eliberat prescripție medicală pentru dispozitive
                  medicale în ambulatoriu deoarece nu a fost necesar
                </span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">
          Dată, semnătură și transmitere
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Data scrisorii medicale *
            </label>
            <input
              type="date"
              className={`mt-1 block w-full rounded-md px-3 py-2 text-sm border ${
                errors.dataScrisoare ? "border-red-500" : "border-gray-300"
              }`}
              value={form.dataScrisoare}
              onChange={(e) =>
                updateField("dataScrisoare", e.target.value)
              }
            />
            {errors.dataScrisoare && (
              <p className="mt-1 text-xs text-red-600">
                {errors.dataScrisoare}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Medic
            </label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-100"
              value={form.semnaturaMedic}
              readOnly
            />
          </div>
        </div>
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Calea de transmitere
          </span>
          <div className="flex flex-col gap-2 text-sm">
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="caleTransmitere"
                value="asigurat"
                checked={form.caleTransmitere === "asigurat"}
                onChange={() =>
                  updateField("caleTransmitere", "asigurat")
                }
              />
              <span>Prin asigurat</span>
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="caleTransmitere"
                value="posta"
                checked={form.caleTransmitere === "posta"}
                onChange={() =>
                  updateField("caleTransmitere", "posta")
                }
              />
              <span>Prin poștă</span>
            </label>
            {form.caleTransmitere === "posta" && (
              <input
                type="text"
                placeholder="detalii poștă (de ex. adresă, AWB)"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={form.detaliiPosta}
                onChange={(e) =>
                  updateField("detaliiPosta", e.target.value)
                }
              />
            )}
          </div>
        </div>
      </section>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Se salvează..." : "Salvează scrisoarea medicală"}
        </Button>
      </div>
    </form>
  );
}

