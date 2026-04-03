"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Download } from "lucide-react";
import {
  medicalFilesApi,
  MedicalFileDto,
  whatsappChatApi,
  WhatsAppChatMessageDto,
} from "@/services/api";
import toast from "react-hot-toast";
import { useUserStore } from "@/store/store";
import { useRouter } from "next/navigation";

export interface ViewAppointmentData {
  _id: string;
  date: string;
  time: string;
  patientName: string;
  patientSurname?: string;
  testType: string;
  phoneNumber: string;
  isConfirmed: boolean;
  doctorName?: string;
  notes?: string;
  section?: { _id: string; name: string; description?: string };
  doctor?: { _id: string; name: string; specialization?: string };
}

interface ViewAppointmentProps {
  appointment: ViewAppointmentData | null;
  open: boolean;
  onClose: () => void;
  onEdit: (appointment: ViewAppointmentData) => void;
  onDelete: (appointment: ViewAppointmentData) => void;
  isPastDate?: (date: string) => boolean;
  /** When false, hides Edit/Delete appointment buttons (e.g. for doctor view) */
  showAppointmentActions?: boolean;
}

export default function ViewAppointment({
  appointment,
  open,
  onClose,
  onEdit,
  onDelete,
  isPastDate,
  showAppointmentActions = true,
}: ViewAppointmentProps) {
  const { user } = useUserStore();
  const router = useRouter();
  const canManageMedicalFile = user?.role === "doctor" || user?.role === "admin";

  const [medicalFile, setMedicalFile] = useState<MedicalFileDto | null>(null);
  const [medicalFileLoading, setMedicalFileLoading] = useState(false);
  const [medicalFileForm, setMedicalFileForm] = useState({
    diagnosis: "",
    prescription: "",
    clinicalNotes: "",
  });
  const [medicalFileSaving, setMedicalFileSaving] = useState(false);
  const [chatMessages, setChatMessages] = useState<WhatsAppChatMessageDto[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const fetchMedicalFile = useCallback(async (appointmentId: string) => {
    try {
      setMedicalFileLoading(true);
      const res = await medicalFilesApi.getByAppointment(appointmentId);
      const data = res.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        setMedicalFile(data[0]);
        setMedicalFileForm({
          diagnosis: data[0].diagnosis ?? "",
          prescription: data[0].prescription ?? "",
          clinicalNotes: data[0].clinicalNotes ?? "",
        });
      } else {
        setMedicalFile(null);
        setMedicalFileForm({ diagnosis: "", prescription: "", clinicalNotes: "" });
      }
    } catch {
      setMedicalFile(null);
      setMedicalFileForm({ diagnosis: "", prescription: "", clinicalNotes: "" });
    } finally {
      setMedicalFileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && appointment?._id && canManageMedicalFile) {
      fetchMedicalFile(appointment._id);
    }
  }, [open, appointment?._id, canManageMedicalFile, fetchMedicalFile]);

  useEffect(() => {
    let ignore = false;
    async function loadChat() {
      if (!open || !appointment?._id) return;
      try {
        setChatLoading(true);
        const res = await whatsappChatApi.getByAppointment(appointment._id);
        if (!ignore) {
          setChatMessages(res.data?.data || []);
        }
      } catch {
        if (!ignore) setChatMessages([]);
      } finally {
        if (!ignore) setChatLoading(false);
      }
    }
    loadChat();
    return () => {
      ignore = true;
    };
  }, [open, appointment?._id]);

  const handleSaveMedicalFile = async () => {
    if (!appointment) return;
    try {
      setMedicalFileSaving(true);
      if (medicalFile) {
        await medicalFilesApi.update(medicalFile._id, medicalFileForm);
        toast.success("Fișa medicală a fost actualizată");
      } else {
        await medicalFilesApi.create({
          appointmentId: appointment._id,
          ...medicalFileForm,
        });
        toast.success("Fișa medicală a fost creată");
      }
      await fetchMedicalFile(appointment._id);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Eroare la salvare";
      toast.error(msg);
    } finally {
      setMedicalFileSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!medicalFile) return;
    try {
      await medicalFilesApi.downloadPdf(medicalFile._id);
      toast.success("Descărcare începută");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Eroare la descărcare");
    }
  };

  const handleOpenMedicalFilePage = () => {
    if (!appointment) return;
    router.push(`/doctor/medical-file/new?appointmentId=${encodeURIComponent(appointment._id)}`);
  };

  if (!appointment) return null;

  const canModify = !isPastDate || !isPastDate(appointment.date);
  const sectionName = appointment.section?.name ?? appointment.testType ?? "—";
  const doctorName = appointment.doctor?.name ?? appointment.doctorName ?? "—";

  const handleEdit = () => {
    onClose();
    onEdit(appointment);
  };

  const handleDelete = () => {
    onClose();
    onDelete(appointment);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" aria-describedby="view-appointment-description">
          <DialogHeader>
            <DialogTitle id="view-appointment-title">Detalii programare</DialogTitle>
          </DialogHeader>
          <div id="view-appointment-description" className="grid gap-3 py-2">
            <div className="grid grid-cols-[100px_1fr] gap-y-1 text-sm">
              <span className="font-medium text-gray-500">Pacient:</span>
              <span>{appointment.patientName}{appointment.patientSurname ? ` ${appointment.patientSurname}` : ""}</span>

              <span className="font-medium text-gray-500">Telefon:</span>
              <span>{appointment.phoneNumber}</span>

              <span className="font-medium text-gray-500">Data:</span>
              <span>{appointment.date}</span>

              <span className="font-medium text-gray-500">Ora:</span>
              <span>{appointment.time}</span>

              <span className="font-medium text-gray-500">Secție:</span>
              <span>{sectionName}</span>

              <span className="font-medium text-gray-500">Doctor:</span>
              <span>{doctorName}</span>

              <span className="font-medium text-gray-500">Confirmat:</span>
              <span>{appointment.isConfirmed ? "Da" : "Nu"}</span>

              <span className="font-medium text-gray-500">Observații:</span>
              <span className="min-h-[1.5rem]">{appointment.notes || "—"}</span>
            </div>

            <div className="border-t pt-4 mt-4 space-y-3">
              <span className="font-medium text-gray-700 block">Chat WhatsApp</span>
              {chatLoading ? (
                <p className="text-sm text-gray-500">Se încarcă conversația...</p>
              ) : chatMessages.length === 0 ? (
                <p className="text-sm text-gray-500">Niciun mesaj pentru această programare.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3">
                  {chatMessages.map((msg) => {
                    const isOutbound = msg.direction === "outbound";
                    const stamp = msg.createdAt
                      ? new Date(msg.createdAt).toLocaleString("ro-RO")
                      : "";
                    const text =
                      msg.buttonText ||
                      msg.buttonPayload ||
                      msg.text ||
                      "(fără text)";
                    return (
                      <div
                        key={msg._id}
                        className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                            isOutbound
                              ? "bg-green-100 text-green-900"
                              : "bg-white border border-gray-200 text-gray-900"
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words">{text}</div>
                          <div className="mt-1 text-[11px] text-gray-500 flex gap-2">
                            <span>{stamp}</span>
                            <span>{isOutbound ? `status: ${msg.status}` : "inbound"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Medical file section - now links to dedicated page for doctors; admins keep inline form */}
            {canManageMedicalFile && (
              <div className="border-t pt-4 mt-4 space-y-4">
                <span className="font-medium text-gray-700 block">Fișă medicală</span>
                {medicalFileLoading ? (
                  <p className="text-sm text-gray-500">Se încarcă...</p>
                ) : (
                  <>
                    {user?.role === "admin" ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Diagnostic</label>
                          <textarea
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[72px]"
                            value={medicalFileForm.diagnosis}
                            onChange={(e) =>
                              setMedicalFileForm((f) => ({
                                ...f,
                                diagnosis: e.target.value,
                              }))
                            }
                            placeholder="Diagnostic"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Prescripție</label>
                          <textarea
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[72px]"
                            value={medicalFileForm.prescription}
                            onChange={(e) =>
                              setMedicalFileForm((f) => ({
                                ...f,
                                prescription: e.target.value,
                              }))
                            }
                            placeholder="Prescripție"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Observații clinice
                          </label>
                          <textarea
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[72px]"
                            value={medicalFileForm.clinicalNotes}
                            onChange={(e) =>
                              setMedicalFileForm((f) => ({
                                ...f,
                                clinicalNotes: e.target.value,
                              }))
                            }
                            placeholder="Observații clinice"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSaveMedicalFile}
                            disabled={medicalFileSaving}
                          >
                            {medicalFileSaving
                              ? "Se salvează..."
                              : medicalFile
                              ? "Actualizează"
                              : "Creează fișă medicală"}
                          </Button>
                          {medicalFile && (
                            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                              <Download className="h-4 w-4 mr-1" />
                              Descarcă PDF
                            </Button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-2 items-center">
                        {medicalFile && (
                          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                            <Download className="h-4 w-4 mr-1" />
                            Descarcă PDF
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onClose}>
              Închide
            </Button>
            {showAppointmentActions && canModify && (
              <>
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editează
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Șterge
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
