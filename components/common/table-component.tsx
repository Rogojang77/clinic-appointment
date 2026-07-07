"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash, Loader, MessageCircle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";
import { Dayjs } from "dayjs";
import api from "@/services/api";
import type { Doctor } from "@/services/api";
import isDateValid from "@/utils/isValidDate";
import { buildTableRowsWithFreeSlots } from "@/utils/dashboardSlotRows";
import InlineTimePicker from "@/components/common/inline-time-picker";

interface Appointment {
  _id: string;
  date: string;
  time: string;
  patientName: string;
  patientSurname?: string;
  testType: string;
  phoneNumber: string;
  isConfirmed: boolean;
  whatsAppReminderStatus?: "not_sent" | "sent" | "failed";
  patientDecision?: "pending" | "confirmed" | "declined" | "reschedule";
  whatsAppLastInboundAt?: string;
  whatsAppLastInboundBody?: string;
  doctorName: string;
  notes: string;
  sectionId?: string;
  doctorId?: string;
  isDefault?: boolean;
  section?: {
    _id: string;
    name: string;
    description?: string;
  };
  doctor?: {
    _id: string;
    name: string;
    specialization?: string;
  };
}

type InlineRowMode =
  | {
      kind: "create";
      timeMode: "slot" | "custom";
      slotTime: string;
      patientName: string;
      phoneNumber: string;
      notes: string;
      doctorId: string;
      focusField?: "patientName" | "phoneNumber";
    }
  | {
      kind: "edit";
      appointmentId: string;
      patientName: string;
      phoneNumber: string;
      notes: string;
      doctorId: string;
    };

interface TableComponentProps {
  appointments: Appointment[];
  fetchData: () => void;
  selectedTestType?: string | null;
  allowedSlotTimes?: string[];
  canInlineCreate?: boolean;
  location: string;
  selectedDate: Dayjs | null;
  day: string;
  sectionId?: string;
  isEcoSection?: boolean;
  sectionDoctors?: Doctor[];
  selectedSectionName?: string;
  pendingEditAppointmentId?: string | null;
  onPendingEditHandled?: () => void;
}

const TableComponent: React.FC<TableComponentProps> = ({
  appointments,
  fetchData,
  selectedTestType,
  allowedSlotTimes = [],
  canInlineCreate = false,
  location,
  selectedDate,
  day,
  sectionId,
  isEcoSection = false,
  sectionDoctors = [],
  selectedSectionName = "",
  pendingEditAppointmentId,
  onPendingEditHandled,
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] =
    useState<Appointment | null>(null);
  const [sendingById, setSendingById] = useState<Record<string, boolean>>({});
  const [sentById, setSentById] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [inlineRow, setInlineRow] = useState<InlineRowMode | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const cancelInlineEdit = useCallback(() => {
    setInlineRow(null);
  }, []);

  const startCreate = useCallback(
    (slotTime: string, focusField: "patientName" | "phoneNumber" = "patientName") => {
      setInlineRow({
        kind: "create",
        timeMode: "slot",
        slotTime,
        patientName: "",
        phoneNumber: "",
        notes: "",
        doctorId: sectionDoctors[0]?._id || "",
        focusField,
      });
    },
    [sectionDoctors]
  );

  const startCustomCreate = useCallback(() => {
    setInlineRow({
      kind: "create",
      timeMode: "custom",
      slotTime: "09:00",
      patientName: "",
      phoneNumber: "",
      notes: "",
      doctorId: sectionDoctors[0]?._id || "",
      focusField: "patientName",
    });
  }, [sectionDoctors]);

  const startEdit = useCallback((appointment: Appointment) => {
    const rawDoctorId = appointment.doctorId as
      | string
      | { _id: string }
      | undefined;
    const doctorId =
      typeof rawDoctorId === "string"
        ? rawDoctorId
        : rawDoctorId?._id || appointment.doctor?._id || "";
    setInlineRow({
      kind: "edit",
      appointmentId: appointment._id,
      patientName: appointment.patientName,
      phoneNumber: appointment.phoneNumber,
      notes: appointment.notes || "",
      doctorId,
    });
  }, []);

  useEffect(() => {
    if (!pendingEditAppointmentId) return;
    const apt = appointments.find((a) => a._id === pendingEditAppointmentId);
    if (apt) {
      startEdit(apt);
      onPendingEditHandled?.();
    }
  }, [
    pendingEditAppointmentId,
    appointments,
    startEdit,
    onPendingEditHandled,
  ]);

  const updateInlineField = (
    field: "patientName" | "phoneNumber" | "notes" | "doctorId" | "slotTime",
    value: string
  ) => {
    setInlineRow((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSaveInline = async () => {
    if (!inlineRow) return;

    const patientName = inlineRow.patientName.trim();
    const phoneNumber = inlineRow.phoneNumber.trim();
    const notes = inlineRow.notes.trim();

    if (!patientName || !phoneNumber) {
      toast.error("Numele și telefonul sunt obligatorii.");
      return;
    }

    if (
      !isEcoSection &&
      sectionDoctors.length > 0 &&
      !inlineRow.doctorId
    ) {
      toast.error("Selectați medicul.");
      return;
    }

    const selectedDoctor = sectionDoctors.find(
      (d) => d._id === inlineRow.doctorId
    );

    setIsSaving(true);
    try {
      if (inlineRow.kind === "create") {
        if (!selectedDate || !day || !location) {
          toast.error("Selectați data și locația.");
          return;
        }
        const formattedDate = selectedDate.format("YYYY-MM-DD");
        const isCustomTime =
          inlineRow.kind === "create" && inlineRow.timeMode === "custom";
        const time = inlineRow.slotTime.trim();
        if (!time || !/^\d{1,2}:\d{2}$/.test(time)) {
          toast.error("Selectați o oră validă.");
          return;
        }
        await api.post("/appointments", {
          location,
          date: formattedDate,
          day,
          time,
          patientName,
          phoneNumber,
          notes,
          testType: selectedTestType || "Ecografie",
          sectionId: sectionId || undefined,
          doctorId:
            !isEcoSection && inlineRow.kind === "create" && inlineRow.doctorId
              ? inlineRow.doctorId
              : undefined,
          doctorName: isEcoSection
            ? "-"
            : selectedDoctor?.name || "",
          isConfirmed: true,
          isDefault: !isCustomTime,
        });
        toast.success("Programarea a fost creată cu succes!");
      } else {
        await api.patch(`/appointments?id=${inlineRow.appointmentId}`, {
          patientName,
          phoneNumber,
          notes,
          ...(!isEcoSection && inlineRow.doctorId
            ? {
                doctorId: inlineRow.doctorId,
                doctorName: selectedDoctor?.name || "",
              }
            : {}),
        });
        toast.success("Programarea a fost actualizată cu succes!");
      }
      setInlineRow(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "A apărut o eroare la procesarea programării"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRowKeyDown = (
    e: React.KeyboardEvent,
    isEditing: boolean
  ) => {
    if (!isEditing) return;
    if (e.key === "Escape") {
      e.preventDefault();
      cancelInlineEdit();
      return;
    }
    if (e.key === "Enter") {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA") {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleSaveInline();
        }
        return;
      }
      e.preventDefault();
      handleSaveInline();
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortData = (data: Appointment[]) => {
    if (!sortField) return data;

    return [...data].sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (sortField) {
        case "time":
          aValue = a.time;
          bValue = b.time;
          break;
        case "patientName":
          aValue = a.patientName;
          bValue = b.patientName;
          break;
        case "section":
          aValue = a.section?.name || a.testType || "";
          bValue = b.section?.name || b.testType || "";
          break;
        case "phoneNumber":
          aValue = a.phoneNumber;
          bValue = b.phoneNumber;
          break;
        case "doctor":
          aValue = a.doctor?.name || a.doctorName || "";
          bValue = b.doctor?.name || b.doctorName || "";
          break;
        case "notes":
          aValue = a.notes || "";
          bValue = b.notes || "";
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  const confirmDelete = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (appointmentToDelete) {
      try {
        setIsDeleting(true);
        await api.delete(`/appointments?id=${appointmentToDelete?._id}`);
        toast.success("Programarea a fost ștearsă cu succes!");
        fetchData();
      } catch (err) {
        console.error(err);
        toast.error("Ceva nu a mers bine!");
      } finally {
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
        setAppointmentToDelete(null);
      }
    }
  };

  const handleToggleConfirmed = async (
    appointment: Appointment,
    checked: boolean
  ) => {
    try {
      await api.patch(`/appointments?id=${appointment._id}`, {
        isConfirmed: checked,
      });
      toast.success(
        checked
          ? "Programarea a fost confirmată!"
          : "Confirmarea programării a fost anulată!"
      );
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Ceva nu a mers bine!");
    }
  };

  const handleSendWhatsApp = async (appointment: Appointment) => {
    try {
      setSendingById((prev) => ({ ...prev, [appointment._id]: true }));
      await api.post(`/appointments/${appointment._id}/whatsapp-reminder`);
      setSentById((prev) => ({ ...prev, [appointment._id]: true }));
      toast.success("Mesajul WhatsApp a fost trimis!");
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Ceva nu a mers bine!");
    } finally {
      setSendingById((prev) => ({ ...prev, [appointment._id]: false }));
    }
  };

  const inlineInputClassName = "h-8 text-sm bg-white";
  const inlineSelectClassName =
    "block w-full h-8 rounded-md border border-input bg-white px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const renderDoctorSelect = (doctorId: string) => (
    <select
      value={doctorId}
      onChange={(e) => updateInlineField("doctorId", e.target.value)}
      className={inlineSelectClassName}
      aria-label="Medic"
    >
      <option value="">Selectează medic</option>
      {sectionDoctors.map((doctor) => (
        <option key={doctor._id} value={doctor._id}>
          {doctor.name}
          {doctor.specialization ? ` (${doctor.specialization})` : ""}
        </option>
      ))}
    </select>
  );

  const renderAddLink = (
    label: string,
    slotTime: string,
    focusField: "patientName" | "phoneNumber"
  ) =>
    canInlineCreate ? (
      <button
        type="button"
        onClick={() => startCreate(slotTime, focusField)}
        className="text-red-900/90 italic hover:underline cursor-pointer"
      >
        {label}
      </button>
    ) : (
      <span className="text-red-900/90 italic">{label}</span>
    );

  const renderInlineSaveButton = () => (
    <button
      type="button"
      onClick={handleSaveInline}
      disabled={isSaving}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-green-800 bg-white/80 hover:bg-green-100 border border-green-400/60 shadow-sm disabled:opacity-50"
      title="Salvează (Enter)"
      aria-label="Salvează"
    >
      {isSaving ? (
        <Loader className="h-4 w-4 animate-spin" />
      ) : (
        <Check className="h-4 w-4" />
      )}
    </button>
  );

  const renderInlineInputs = (
    row: InlineRowMode,
    isEcografie: boolean
  ) => {
    const focusField =
      row.kind === "create" ? row.focusField ?? "patientName" : "patientName";
    const createDoctorId = row.kind === "create" ? row.doctorId : "";

    const notesCell = (
      <Input
        value={row.notes}
        onChange={(e) => updateInlineField("notes", e.target.value)}
        className={inlineInputClassName}
        placeholder="Observații"
        aria-label="Observații"
      />
    );

    if (isEcografie) {
      return (
        <>
          <td className="px-6 py-3 text-sm">
            <Input
              value={row.patientName}
              onChange={(e) =>
                updateInlineField("patientName", e.target.value)
              }
              className={inlineInputClassName}
              placeholder="Nume"
              aria-label="Nume pacient"
              autoFocus={focusField === "patientName"}
            />
          </td>
          <td className="px-6 py-3 text-sm">{notesCell}</td>
          <td className="px-6 py-3 text-sm">
            <Input
              value={row.phoneNumber}
              onChange={(e) =>
                updateInlineField("phoneNumber", e.target.value)
              }
              className={inlineInputClassName}
              placeholder="Telefon"
              aria-label="Telefon"
              autoFocus={focusField === "phoneNumber"}
            />
          </td>
          <td className="px-6 py-3 text-sm text-gray-700">
            {selectedSectionName || selectedTestType || "—"}
          </td>
        </>
      );
    }

    return (
      <>
        <td className="px-6 py-3 text-sm">
          <Input
            value={row.patientName}
            onChange={(e) => updateInlineField("patientName", e.target.value)}
            className={inlineInputClassName}
            placeholder="Nume"
            aria-label="Nume pacient"
            autoFocus={focusField === "patientName"}
          />
        </td>
        <td className="px-6 py-3 text-sm text-gray-700">
          {selectedSectionName || selectedTestType || "—"}
        </td>
        <td className="px-6 py-3 text-sm">
          <Input
            value={row.phoneNumber}
            onChange={(e) => updateInlineField("phoneNumber", e.target.value)}
            className={inlineInputClassName}
            placeholder="Telefon"
            aria-label="Telefon"
            autoFocus={focusField === "phoneNumber"}
          />
        </td>
        <td className="px-6 py-3 text-sm">
          {sectionDoctors.length > 0 && row.kind === "create" ? (
            renderDoctorSelect(createDoctorId)
          ) : (
            <span className="text-gray-700">—</span>
          )}
        </td>
        <td className="px-6 py-3 text-sm">{notesCell}</td>
      </>
    );
  };

  const renderCustomCreateRow = (isEcografie: boolean) => {
    if (inlineRow?.kind !== "create" || inlineRow.timeMode !== "custom") {
      return null;
    }

    const formattedDate = selectedDate?.format("D MMMM YYYY") ?? "";

    return (
      <tr
        key="custom-create"
        className="bg-amber-50 ring-2 ring-inset ring-amber-400 transition-colors"
        onKeyDown={(e) => handleRowKeyDown(e, true)}
        title={
          formattedDate
            ? `Orar temporar — aplicabil doar pentru ${formattedDate}`
            : "Orar personalizat"
        }
      >
        <td className="px-6 py-3 text-sm text-amber-800/80">—</td>
        <td className="px-6 py-3 text-sm">{renderInlineSaveButton()}</td>
        <td className="px-6 py-3 whitespace-nowrap text-sm">
          <div className="space-y-1">
            <InlineTimePicker
              value={inlineRow.slotTime}
              onChange={(time) => updateInlineField("slotTime", time)}
            />
            <p className="text-[10px] leading-tight text-amber-800">
              Orar temporar
            </p>
          </div>
        </td>
        {renderInlineInputs(inlineRow, isEcografie)}
      </tr>
    );
  };

  const renderTable = (appointmentsToRender: Appointment[], title?: string) => {
    const isEcografie = selectedTestType === "Ecografie";
    const useFreeSlotGrid = !sortField || sortField === "time";
    const displayRows = useFreeSlotGrid
      ? buildTableRowsWithFreeSlots(appointmentsToRender, {
          allowedSlotTimes,
        })
      : sortData(appointmentsToRender).map((a) => ({
          type: "appointment" as const,
          appointment: a,
        }));

    if (displayRows.length === 0) {
      return (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 text-center">
            <p className="text-gray-500 font-medium text-lg">
              Nicio programare pentru această dată/locație.
            </p>
          </div>
        </div>
      );
    }

    const getStatusBadge = (appointment: Appointment) => {
      const decision = appointment.patientDecision;
      if (decision === "confirmed") {
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Confirmat
          </span>
        );
      }
      if (decision === "declined") {
        return (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
            Refuzat
          </span>
        );
      }
      if (decision === "reschedule") {
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            Reprogramare
          </span>
        );
      }
      if (appointment.whatsAppReminderStatus === "sent") {
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
            Trimis
          </span>
        );
      }
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
          Netrimis
        </span>
      );
    };

    const SortableHeader = ({
      field,
      label,
    }: {
      field: string;
      label: string;
    }) => (
      <th
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center space-x-1">
          <span>{label}</span>
          {sortField === field && (
            <span className="text-gray-400">
              {sortDirection === "asc" ? "↑" : "↓"}
            </span>
          )}
        </div>
      </th>
    );

    return (
      <div className={title ? "mt-8" : ""}>
        {title && (
          <div className="p-3 bg-blue-100 border-l-4 border-blue-500 rounded mb-4">
            <h3 className="text-lg font-semibold text-blue-800">{title}</h3>
          </div>
        )}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {canInlineCreate && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2">
              <p className="text-xs text-gray-600">
                Adăugați o programare la o oră care nu este în programul zilei.
              </p>
              <button
                type="button"
                onClick={startCustomCreate}
                disabled={
                  inlineRow?.kind === "create" &&
                  inlineRow.timeMode === "custom"
                }
                className="text-sm font-medium text-blue-700 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Orar personalizat
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status WhatsApp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acțiuni
                  </th>
                  <SortableHeader field="time" label="Ora" />
                  <SortableHeader field="patientName" label="Nume" />
                  {isEcografie ? (
                    <SortableHeader field="notes" label="Observații" />
                  ) : (
                    <SortableHeader field="section" label="Secție" />
                  )}
                  <SortableHeader field="phoneNumber" label="Telefon" />
                  {!isEcografie && (
                    <SortableHeader field="doctor" label="Doctor" />
                  )}
                  {isEcografie ? (
                    <SortableHeader field="section" label="Secție" />
                  ) : (
                    <SortableHeader field="notes" label="Observații" />
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {renderCustomCreateRow(isEcografie)}
                {displayRows.map((row, index) => {
                  if (row.type === "free") {
                    const isCreating =
                      inlineRow?.kind === "create" &&
                      inlineRow.timeMode === "slot" &&
                      inlineRow.slotTime === row.slotTime;

                    return (
                      <tr
                        key={`free-${row.slotTime}`}
                        className={`${
                          isCreating
                            ? "bg-red-100 ring-2 ring-inset ring-red-400"
                            : "bg-red-200/95 hover:bg-red-200/90"
                        } transition-colors`}
                        onKeyDown={(e) =>
                          handleRowKeyDown(e, isCreating)
                        }
                        title={
                          canInlineCreate
                            ? "Click pe Adauga nume sau Adauga telefon pentru a adăuga programare"
                            : "Interval liber"
                        }
                      >
                        <td className="px-6 py-3 text-sm text-red-800/80">—</td>
                        <td className="px-6 py-3 text-sm text-red-800/60">
                          {isCreating ? renderInlineSaveButton() : "—"}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-red-900">
                          {row.slotTime}
                        </td>
                        {isCreating && inlineRow ? (
                          renderInlineInputs(inlineRow, isEcografie)
                        ) : (
                          <>
                            <td className="px-6 py-3 text-sm">
                              {renderAddLink("Adauga nume", row.slotTime, "patientName")}
                            </td>
                            <td className="px-6 py-3 text-sm text-red-800/70">
                              —
                            </td>
                            <td className="px-6 py-3 text-sm">
                              {renderAddLink("Adauga telefon", row.slotTime, "phoneNumber")}
                            </td>
                            {!isEcografie && (
                              <td className="px-6 py-3 text-sm text-red-800/70">
                                —
                              </td>
                            )}
                            <td className="px-6 py-3 text-sm text-red-800/70">
                              —
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  }

                  const appointment = row.appointment;
                  const isEditing =
                    inlineRow?.kind === "edit" &&
                    inlineRow.appointmentId === appointment._id;
                  const canEditDate = isDateValid(appointment.date);
                  const isWhatsAppSent =
                    appointment.whatsAppReminderStatus === "sent" ||
                    !!sentById[appointment._id];

                  return (
                    <tr
                      key={`${appointment._id}-${index}`}
                      className={`${
                        isEditing
                          ? "ring-2 ring-inset ring-indigo-400"
                          : appointment.isConfirmed === true
                            ? "bg-red-100 hover:bg-red-200"
                            : "bg-green-200 hover:bg-green-200"
                      } transition-colors`}
                      onKeyDown={(e) => handleRowKeyDown(e, isEditing)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getStatusBadge(appointment)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {isEditing && renderInlineSaveButton()}
                          <button
                            onClick={() => handleSendWhatsApp(appointment)}
                            className={`${
                              canEditDate && !isWhatsAppSent
                                ? "text-green-700 hover:text-green-900"
                                : "text-gray-400 cursor-not-allowed"
                            }`}
                            disabled={
                              !canEditDate ||
                              isWhatsAppSent ||
                              !!sendingById[appointment._id]
                            }
                            title="Trimite WhatsApp"
                          >
                            {sendingById[appointment._id] ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <MessageCircle className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => confirmDelete(appointment)}
                            className={`${
                              canEditDate
                                ? "text-red-600 hover:text-red-900"
                                : "text-gray-400 cursor-not-allowed"
                            }`}
                            disabled={!canEditDate}
                            title="Șterge"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                          <Switch
                            checked={appointment.isConfirmed}
                            onCheckedChange={(checked) =>
                              handleToggleConfirmed(appointment, checked)
                            }
                            title={
                              appointment.isConfirmed
                                ? "Confirmat"
                                : "Neconfirmat"
                            }
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {appointment.time}
                      </td>
                      {isEditing && inlineRow ? (
                        <>
                          {isEcografie ? (
                            <>
                              <td className="px-6 py-4 text-sm">
                                <Input
                                  value={inlineRow.patientName}
                                  onChange={(e) =>
                                    updateInlineField(
                                      "patientName",
                                      e.target.value
                                    )
                                  }
                                  className={inlineInputClassName}
                                  placeholder="Nume"
                                  aria-label="Nume pacient"
                                  autoFocus
                                />
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <Input
                                  value={inlineRow.notes}
                                  onChange={(e) =>
                                    updateInlineField("notes", e.target.value)
                                  }
                                  className={inlineInputClassName}
                                  placeholder="Observații"
                                  aria-label="Observații"
                                />
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <Input
                                  value={inlineRow.phoneNumber}
                                  onChange={(e) =>
                                    updateInlineField(
                                      "phoneNumber",
                                      e.target.value
                                    )
                                  }
                                  className={inlineInputClassName}
                                  placeholder="Telefon"
                                  aria-label="Telefon"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {appointment.section?.name ||
                                  appointment.testType ||
                                  "-"}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-4 text-sm">
                                <Input
                                  value={inlineRow.patientName}
                                  onChange={(e) =>
                                    updateInlineField(
                                      "patientName",
                                      e.target.value
                                    )
                                  }
                                  className={inlineInputClassName}
                                  placeholder="Nume"
                                  aria-label="Nume pacient"
                                  autoFocus
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {appointment.section?.name ||
                                  appointment.testType ||
                                  "-"}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <Input
                                  value={inlineRow.phoneNumber}
                                  onChange={(e) =>
                                    updateInlineField(
                                      "phoneNumber",
                                      e.target.value
                                    )
                                  }
                                  className={inlineInputClassName}
                                  placeholder="Telefon"
                                  aria-label="Telefon"
                                />
                              </td>
                              <td className="px-6 py-4 text-sm">
                                {sectionDoctors.length > 0 ? (
                                  renderDoctorSelect(inlineRow.doctorId)
                                ) : (
                                  <span className="text-gray-900">
                                    {appointment.doctor?.name ||
                                      appointment.doctorName ||
                                      "-"}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <Input
                                  value={inlineRow.notes}
                                  onChange={(e) =>
                                    updateInlineField("notes", e.target.value)
                                  }
                                  className={inlineInputClassName}
                                  placeholder="Observații"
                                  aria-label="Observații"
                                />
                              </td>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {canEditDate ? (
                              <button
                                type="button"
                                onClick={() => startEdit(appointment)}
                                className="text-left hover:underline cursor-pointer"
                              >
                                {appointment.patientName}
                              </button>
                            ) : (
                              appointment.patientName
                            )}
                          </td>
                          {isEcografie ? (
                            <td
                              className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate"
                              title={appointment.notes || "-"}
                            >
                              {appointment.notes || "-"}
                            </td>
                          ) : (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {appointment.section?.name ||
                                appointment.testType ||
                                "-"}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {appointment.phoneNumber}
                          </td>
                          {!isEcografie && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {appointment.doctor?.name ||
                                appointment.doctorName ||
                                "-"}
                            </td>
                          )}
                          {isEcografie ? (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {appointment.section?.name ||
                                appointment.testType ||
                                "-"}
                            </td>
                          ) : (
                            <td
                              className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate"
                              title={appointment.notes || "-"}
                            >
                              {appointment.notes || "-"}
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="lg:px-10 px-5 mb-5">
      {renderTable(appointments || [])}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] min-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmă Ștergerea</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Ești sigur că vrei să ștergi această programare?
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Anulează
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Se șterge...
                </>
              ) : (
                "Șterge"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TableComponent;
