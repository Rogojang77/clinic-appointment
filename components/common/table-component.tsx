import React, { useState } from "react";
import { Eye, Edit, Trash, Loader, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] =
    useState<Appointment | null>(null);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const itemsPerPage = 10;

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const sortData = (data: Appointment[]) => {
    if (!sortField) return data;
    
    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'time':
          aValue = a.time;
          bValue = b.time;
          break;
        case 'patientName':
          aValue = a.patientName;
          bValue = b.patientName;
          break;
        case 'section':
          aValue = a.section?.name || a.testType || '';
          bValue = b.section?.name || b.testType || '';
          break;
        case 'phoneNumber':
          aValue = a.phoneNumber;
          bValue = b.phoneNumber;
          break;
        case 'doctor':
          aValue = a.doctor?.name || a.doctorName || '';
          bValue = b.doctor?.name || b.doctorName || '';
          break;
        case 'notes':
          aValue = a.notes || '';
          bValue = b.notes || '';
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Separate appointments by isDefault
  const defaultAppointments = appointments?.filter((apt: Appointment) => apt.isDefault !== false) || [];
  const nonDefaultAppointments = appointments?.filter((apt: Appointment) => apt.isDefault === false) || [];

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

  const renderTable = (appointmentsToRender: Appointment[], title?: string) => {
    const sortedData = sortData(appointmentsToRender);
    const totalPages = title ? 1 : Math.ceil(sortedData.length / itemsPerPage);
    const startIdx = title ? 0 : (currentPage - 1) * itemsPerPage;
    const endIdx = title ? sortedData.length : startIdx + itemsPerPage;
    const paginated = sortedData.slice(startIdx, endIdx);

    if (appointmentsToRender.length === 0) {
      return null;
    }

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

    return (
      <div className={title ? "mt-8" : ""}>
        {title && (
          <div className="p-3 bg-blue-100 border-l-4 border-blue-500 rounded mb-4">
            <h3 className="text-lg font-semibold text-blue-800">{title}</h3>
          </div>
        )}
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
                  <SortableHeader field="section" label="Secție" />
                  <SortableHeader field="phoneNumber" label="Telefon" />
                  <SortableHeader field="doctor" label="Doctor" />
                  <SortableHeader field="notes" label="Observații" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginated.map((appointment, index) => (
                  <tr
                    key={`${appointment._id}-${index}`}
                    className={`${
                      appointment.isConfirmed === true 
                        ? "bg-red-100 hover:bg-red-200" 
                        : "bg-green-200 hover:bg-green-200"
                    } transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
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
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {appointment.time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {appointment.patientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {appointment.section?.name || appointment.testType || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {appointment.phoneNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {appointment.doctor?.name || appointment.doctorName || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={appointment.notes || "-"}>
                      {appointment.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {!title && totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Următor
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Afișare{' '}
                    <span className="font-medium">{startIdx + 1}</span>
                    {' '}până la{' '}
                    <span className="font-medium">
                      {Math.min(startIdx + itemsPerPage, sortedData.length)}
                    </span>
                    {' '}din{' '}
                    <span className="font-medium">{sortedData.length}</span>
                    {' '}rezultate
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    
                    {[...Array(totalPages)].map((_, i) => {
                      const page = i + 1;
                      const isCurrentPage = page === currentPage;
                      
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            isCurrentPage
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="lg:px-10 px-5 mb-5">
      {appointments?.length > 0 ? (
        <>
          {renderTable(defaultAppointments)}
          {nonDefaultAppointments.length > 0 && renderTable(nonDefaultAppointments, "Programări Temporare")}
        </>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 text-center">
            <p className="text-gray-500 font-medium text-lg">Nicio Rezervare!</p>
          </div>
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
