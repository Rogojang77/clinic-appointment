// components/TableComponent.tsx
'use client';
import React, { useState } from 'react';
import { Eye, Edit, Trash, ChevronLeft, ChevronRight } from 'lucide-react';

interface Appointment {
  time: string;
  name: string;
  surname: string;
  type: string;
  phone: string;
}

interface TableComponentProps {
  appointments: Appointment[];
  onView: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
}

const UserTable: React.FC<TableComponentProps> = ({ appointments, onView, onEdit, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
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
    setCurrentPage(1);
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
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'surname':
          aValue = a.surname;
          bValue = b.surname;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'phone':
          aValue = a.phone;
          bValue = b.phone;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortedData = sortData(appointments);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAppointments = sortedData.slice(startIndex, startIndex + itemsPerPage);

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
    <div className="lg:px-10 px-5">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <SortableHeader field="time" label="Timp prezent" />
                <SortableHeader field="name" label="Nume" />
                <SortableHeader field="surname" label="Prenume" />
                <SortableHeader field="type" label="Tip Ecografie" />
                <SortableHeader field="phone" label="Telefon" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedAppointments.length > 0 ? (
                paginatedAppointments.map((appointment, index) => (
                  <tr
                    key={startIndex + index}
                    className={`${
                      appointment.name !== "-"
                        ? index % 2 === 0
                          ? "bg-red-100 hover:bg-red-150"
                          : "bg-white hover:bg-gray-50"
                        : "bg-white hover:bg-gray-50"
                    } transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.surname}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 justify-center">
                        <button onClick={() => onView(appointment)} className="text-blue-600 hover:text-blue-900" title="Vizualizează">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => onEdit(appointment)} className="text-indigo-600 hover:text-indigo-900" title="Editează">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => onDelete(appointment)} className="text-red-600 hover:text-red-900" title="Șterge">
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-4 text-center text-sm text-gray-500" colSpan={7}>
                    Nu sunt date disponibile
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
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
                  <span className="font-medium">{startIndex + 1}</span>
                  {' '}până la{' '}
                  <span className="font-medium">
                    {Math.min(startIndex + itemsPerPage, sortedData.length)}
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

export default UserTable;
