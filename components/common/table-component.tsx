import React, { useState } from "react";
import { Eye, Edit, Trash, Loader } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"; // Adjust the import path based on your structure
import { Button } from "@/components/ui/button"; // Adjust the import path
import toast from "react-hot-toast";
import api from "@/services/api";
import isDateValid from "@/utils/isValidDate";

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
  appointments: Appointment[];
  onView: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  fetchData: () => void;
}

const TableComponent: React.FC<TableComponentProps> = ({
  appointments,
  onView,
  onEdit,
  fetchData,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] =
    useState<Appointment | null>(null);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(appointments.length / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setSelectedRows([]);
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAppointments = appointments?.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const confirmDelete = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
    setIsModalOpen(true);
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
        setIsModalOpen(false);
        setAppointmentToDelete(null);
      }
    }
  };

  return (
    <div className="overflow-x-auto lg:px-10 px-5 mb-5">
      {appointments?.length > 0 ? (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white">
                {/* <th className="border border-gray-200 px-4 py-2 text-center font-medium">
                  <input type="checkbox" />
                </th> */}
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
                  SECTIE
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left font-medium">
                  TELEFON
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left font-medium">
                  DOCTOR
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left font-medium">
                  OBSERVATII
                </th>

                
              </tr>
            </thead>
            <tbody>
              {paginatedAppointments.map((appointment, index) => (
                <tr
                  key={index}
                  className={`${
                    appointment.isConfirmed === true ? "bg-red-200" : "bg-green-300"
                  } transition-colors `}
                >
                  {/* <td className="border border-gray-200 px-4 py-2 text-center">
                    <input type="checkbox" />
                  </td> */}
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
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-700">
                    {appointment.time}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-700">
                    {appointment.patientName}
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
                  <td className="border border-gray-200 px-4 py-2 text-gray-700 text-[12px] text-wrap overflow-x-auto">
                    {appointment.notes}
                  </td>
                 
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-700">
              Pagina {currentPage} din {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
            >
              Următor
            </button>
          </div>
        </>
      ) : (
        <div className="text-center flex-col justify-center items-center py-5 bg-slate-200 text-red-500 rounded-md mt-5  h-28 w-[100%]">
          <p className="font-bold text-[20px]">Nicio Rezervare !</p>
        </div>
      )}

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

export default TableComponent;
