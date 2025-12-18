"use client";

import { Edit, Trash, Loader } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "./button";
import toast from "react-hot-toast";
import api from "@/services/api";
import { useState } from "react";
import isDateValid from "@/utils/isValidDate";
import { Switch } from "../ui/switch";

interface Appointment {
  _id: string;
  date: string;
  time: string;
  patientName: string;
  patientSurname?: string;
  testType: string;
  phoneNumber: string;
  isConfirmed: boolean;
  doctorName: string;
  notes: string;
  sectionId?: string;
  doctorId?: string;
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

interface TableComponentProps {
  timeSlots: string[];
  appointments: Appointment[];
  onView: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  fetchData: () => void;
}

const EcoTable: React.FC<TableComponentProps> = ({
  timeSlots,
  appointments,
  fetchData,
  onEdit,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<string | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] =
    useState<Appointment | null>(null);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Normalize the time for sorting
  const normalizeTime = (time: string) => {
    return time.padStart(5, "0"); // Normalize to "08:30" format, for example
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortAppointments = (appts: Appointment[]) => {
    if (!sortField) return appts;
    
    return [...appts].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'time':
          aValue = normalizeTime(a.time);
          bValue = normalizeTime(b.time);
          break;
        case 'patientName':
          aValue = a.patientName;
          bValue = b.patientName;
          break;
        case 'notes':
          aValue = a.notes || '';
          bValue = b.notes || '';
          break;
        case 'phoneNumber':
          aValue = a.phoneNumber;
          bValue = b.phoneNumber;
          break;
        case 'doctor':
          aValue = a.doctorName || '';
          bValue = b.doctorName || '';
          break;
        case 'testType':
          aValue = a.testType || '';
          bValue = b.testType || '';
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Group appointments by timeSlot
  const appointmentsGroupedByTime = timeSlots.map((timeSlot: any) => ({
    timeSlot: timeSlot?.time,
    appointments: sortAppointments(
      appointments.filter(
        (appt) => normalizeTime(appt.time) === normalizeTime(timeSlot?.time)
      )
    ),
  }));

  // Flatten appointments to check if there are any appointments
  const allAppointments = appointmentsGroupedByTime.flatMap(({ appointments }) => appointments);

  const confirmDelete = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    if (appointmentToDelete) {
      try {
        setIsDeleting(true);
        await api.delete(`/appointments?id=${appointmentToDelete._id}`);
        toast.success("Programarea a fost ștearsă cu succes!");
        fetchData();
      } catch (err) {
        console.error(err);
        toast.error("Ceva nu a mers bine!");
      } finally {
        setIsDeleting(false);
        setIsModalOpen(false);
        setAppointmentToDelete(null);
      }
    }
  };

  const handleToggleConfirmed = async (appointmentId: string, isConfirmed: boolean) => {
    try {
      setUpdatingAppointmentId(appointmentId);
      await api.patch(`/appointments?id=${appointmentId}`, { isConfirmed });
  
      toast.success("Statusul programării a fost actualizat!");
      fetchData(); // Refresh data after update
    } catch (error) {
      console.error("Error updating appointment status:", error);
      toast.error("Nu s-a putut actualiza statusul programării.");
    } finally {
      setUpdatingAppointmentId(null);
    }
  };

  const SortableHeader = ({ field, label }: { field: string; label: string }) => (
    <th
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sortField === field && (
          <span className="text-gray-400">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );

  if (allAppointments.length === 0) {
    return (
      <div className="lg:px-10 px-5 mb-5">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 text-center">
            <p className="text-gray-500 font-medium text-lg">Nicio Rezervare!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:px-10 px-5 mb-5">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acțiuni
                </th>
                <SortableHeader field="time" label="Ora" />
                <SortableHeader field="patientName" label="Nume" />
                <SortableHeader field="notes" label="Observații" />
                <SortableHeader field="phoneNumber" label="Telefon" />
                <SortableHeader field="doctor" label="Doctor" />
                <SortableHeader field="testType" label="Secție" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allAppointments.length > 0 ? (
                <>
                  {appointmentsGroupedByTime?.map(
                    ({ timeSlot, appointments }, groupIndex) => {
                      return appointments.length > 0 ? (
                        appointments.map((appointment, index) => (
                          <tr
                            key={`${timeSlot}-${appointment._id}-${groupIndex}-${index}`}
                            className={`${
                              appointment.isConfirmed
                                ? "bg-red-100 hover:bg-red-150"
                                : "bg-green-200 hover:bg-green-200"
                            } transition-colors`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2 items-center">
                                <button
                                  onClick={() => onEdit(appointment)}
                                  className={`${
                                    isDateValid(appointment.date)
                                      ? "text-indigo-600 hover:text-indigo-900"
                                      : "text-gray-400 cursor-not-allowed"
                                  }`}
                                  disabled={!isDateValid(appointment.date)}
                                  title="Editează"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => confirmDelete(appointment)}
                                  className={`${
                                    isDateValid(appointment.date)
                                      ? "text-red-600 hover:text-red-900"
                                      : "text-gray-400 cursor-not-allowed"
                                  }`}
                                  disabled={!isDateValid(appointment.date)}
                                  title="Șterge"
                                >
                                  <Trash className="h-4 w-4" />
                                </button>
                                {appointment?.isConfirmed && (
                                  <div className="flex items-center">
                                    {updatingAppointmentId === appointment._id ? (
                                      <Loader className="h-4 w-4 animate-spin text-blue-500" />
                                    ) : (
                                      <Switch
                                        id="isConfirmed"
                                        checked={appointment.isConfirmed}
                                        onCheckedChange={(checked: boolean) =>
                                          handleToggleConfirmed(appointment._id, checked)
                                        }
                                        disabled={!isDateValid(appointment.date) || updatingAppointmentId !== null}
                                        className="w-9"
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            {/* Show timeSlot only for the first appointment in the group */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {index === 0 ? timeSlot : ""}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {appointment.patientName}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={appointment.notes || "-"}>
                              {appointment.notes || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {appointment.phoneNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {appointment.doctorName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {appointment.testType}
                            </td>
                          </tr>
                        ))
                      ) : null;
                    }
                  )}
                </>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] min-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmă Ștergerea</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Ești sigur că vrei să ștergi această programare?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isDeleting}>
              Anulează
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
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

export default EcoTable;
