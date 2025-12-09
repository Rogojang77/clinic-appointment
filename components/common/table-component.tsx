import React, { useState } from "react";
import { Eye, Edit, Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"; // Adjust the import path based on your structure
import { Button } from "@/components/ui/button"; // Adjust the import path
import axios from "axios";
import toast from "react-hot-toast";
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
        await axios.delete(`/api/appointments?id=${appointmentToDelete?._id}`);
        toast.success("Appointment Deleted Successfully !");
        fetchData();
      } catch (err) {
        console.error(err);
        toast.error("Something went wrong !");
      }
    }
    setIsModalOpen(false);
    setAppointmentToDelete(null);
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
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
            >
              Next
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
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Are you sure you want to delete this appointment?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TableComponent;
