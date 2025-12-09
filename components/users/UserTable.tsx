// components/TableComponent.tsx
'use client';
import React, { useState } from 'react';
import { Eye, Edit, Trash } from 'lucide-react';

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
  const itemsPerPage = 10;

  const totalPages = Math.ceil(appointments.length / itemsPerPage);

  

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
   
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAppointments = appointments.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="overflow-x-auto lg:px-10 px-5  ">
    <table className="w-full text-sm ">
      <thead className=''>
        <tr className="bg-white ">
          <th className="border border-gray-200 px-4 py-2 text-center font-medium">
            ID
          </th>
          <th className="border border-gray-200 px-4 py-2 text-left font-medium">Timp prezent</th>
          <th className="border border-gray-200 px-4 py-2 text-left font-medium">Nume</th>
          <th className="border border-gray-200 px-4 py-2 text-left font-medium">Prenume</th>
          <th className="border border-gray-200 px-4 py-2 text-left font-medium">Tip Ecografie</th>
          <th className="border border-gray-200 px-4 py-2 text-left font-medium">Telefon</th>
          <th className="border border-gray-200 px-4 py-2 text-left font-medium">Actions</th>
        </tr>
      </thead>
      <tbody className='rounded-b-2xl'>
        {paginatedAppointments.map((appointment, index) => (
          <tr
            key={index}
            className={`${
              appointment.name !== "-"
                ? index % 2 === 0
                  ? "bg-red-500"
                  : "bg-white"
                : "bg-white"
            } transition-colors hover:bg-gray-50`}
          >
            <td className="border border-gray-200 px-4 py-2 bg-white text-center ">
              {index}
            </td>
            <td className="border border-gray-200 px-4 py-2 text-gray-700">{appointment.time}</td>
            <td className="border border-gray-200 px-4 py-2 text-gray-700">{appointment.name}</td>
            <td className="border border-gray-200 px-4 py-2 text-gray-700">{appointment.surname}</td>
            <td className="border border-gray-200 px-4 py-2 text-gray-700">{appointment.type}</td>
            <td className="border border-gray-200 px-4 py-2 text-gray-700">{appointment.phone}</td>
            <td className="border border-gray-200 px-4 py-2 bg-white flex space-x-2 justify-center">
              <button onClick={() => onView(appointment)} className="text-blue-500">
                <Eye size={20} />
              </button>
              <button onClick={() => onEdit(appointment)} className="text-yellow-500">
                <Edit size={20} />
              </button>
              <button onClick={() => onDelete(appointment)} className="text-red-500">
                <Trash size={20} />
              </button>
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
  </div>
  
  );
};

export default UserTable;
