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

  // Normalize the time for sorting
  const normalizeTime = (time: string) => {
    return time.padStart(5, "0"); // Normalize to "08:30" format, for example
  };

  // Group appointments by timeSlot
  const appointmentsGroupedByTime = timeSlots.map((timeSlot: any) => ({
    timeSlot: timeSlot?.time,
    appointments: appointments.filter(
      (appt) => normalizeTime(appt.time) === normalizeTime(timeSlot?.time)
    ),
  }));

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
  

  return (
    <div className="overflow-x-auto lg:px-10 px-5 mb-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white">
            <th className="border border-gray-200 px-4 py-2 text-left font-medium">
              EDITARE
            </th>
            <th className="border border-gray-200 px-4 py-2 text-left font-medium">
              ORA
            </th>
            <th className="border border-gray-200 px-4 py-2 text-left font-medium">
              NUME
            </th>
            <th className="border border-gray-200 px-4 py-2 text-left font-medium w-52">
              OBSERVATII
            </th>
            <th className="border border-gray-200 px-4 py-2 text-left font-medium">
              TELEFON
            </th>
            <th className="border border-gray-200 px-4 py-2 text-left font-medium">
              DOCTOR
            </th>
            <th className="border border-gray-200 px-4 py-2 text-left font-medium">
              SECTIE
            </th>
            
          </tr>
        </thead>
        <tbody>
          <>
            {appointmentsGroupedByTime?.length > 0 ? (
              <>
                {appointmentsGroupedByTime?.map(
                  ({ timeSlot, appointments }, groupIndex) => {
                    return appointments.length > 0 ? (
                      appointments.map((appointment, index) => (
                        <tr
                          key={`${timeSlot}-${appointment._id}-${groupIndex}-${index}`}
                          className={`${
                            appointment.isConfirmed
                              ? "bg-red-200"
                              : "bg-green-300"
                          } transition-colors`}
                        >
                          <td className="border border-gray-200 px-4 py-2 flex space-x-2">
                            <button
                              onClick={() => onEdit(appointment)}
                              className={`${
                                isDateValid(appointment.date)
                                  ? "text-blue-500"
                                  : "text-gray-400 cursor-not-allowed"
                              }`}
                              disabled={!isDateValid(appointment.date)}
                            >
                              <Edit size={20} />
                            </button>
                            <button
                              onClick={() => confirmDelete(appointment)}
                              className={`${
                                isDateValid(appointment.date)
                                  ? "text-red-500"
                                  : "text-gray-400 cursor-not-allowed"
                              }`}
                              disabled={!isDateValid(appointment.date)}
                            >
                              <Trash size={20} />
                            </button>
                            {
                              appointment?.isConfirmed && 
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
                            }
                          </td>
                          {/* Show timeSlot only for the first appointment in the group */}
                          <td className="border border-gray-200 px-4 py-2 text-gray-700">
                            {index === 0 ? timeSlot : ""}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-gray-700">
                            {appointment.patientName}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-gray-700 text-[12px] text-wrap overflow-x-auto">
                            {appointment.notes || "-"}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-gray-700">
                            {appointment.phoneNumber}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-gray-700">
                            {appointment.doctorName}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-gray-700">
                            {appointment.testType}
                          </td>
                          
                        </tr>
                      ))
                    ) : (
                      <tr key={`${timeSlot}-empty-${groupIndex}`} className="bg-white transition-colors">
                        <td className="border border-gray-200 px-4 py-2 text-gray-700">
                          {timeSlot}
                        </td>
                        <td
                          className="border border-gray-200 px-4 py-2 text-red-500 text-center"
                          colSpan={7}
                        >
                          Nicio Rezervare
                        </td>
                      </tr>
                    );
                  }
                )}
              </>
            ) : (
              <tr>
                <td
                  className="border border-gray-200 px-4  text-red-500 text-center text-xl py-10"
                  colSpan={8}
                >
                  Nicio Rezervare
                </td>
              </tr>
            )}
          </>
        </tbody>
      </table>

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
