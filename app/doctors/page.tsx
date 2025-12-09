'use client';

import { departmentsData } from '@/lib/department';
import React, { useState } from 'react';


const DepartmentList: React.FC = () => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  // Filter departments based on the selection
  const filteredDepartments = selectedDepartment
    ? departmentsData.filter((dep) => dep.name === selectedDepartment)
    : departmentsData;

  const handleDepartmentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDepartment(event.target.value);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Department and Doctor List</h1>

      {/* Search Dropdown */}
      <div className="mb-6 flex space-x-5 justify-end">
        <label htmlFor="department" className="block text-lg font-medium mb-2">
          Search by Department : 
        </label>
        <select
          id="department"
          className="border rounded-md p-2 w-52 px-4 outline-none focus:ring-0 "
          value={selectedDepartment}
          onChange={handleDepartmentChange}
        >
          <option value="">All Departments</option>
          {departmentsData.map((department, index) => (
            <option key={index} value={department.name}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      {/* Department List */}
      <div className="grid lg:grid-cols-4 gap-5 ">
        {filteredDepartments.map((department, index) => (
          <div key={index} className="border rounded-md shadow-lg hover:shadow-xl">
            <div className="bg-indigo-500 rounded-t-lg">
              <h2 className="lg:text-[18px] text-[16px] font-semibold mb-4 text-white  text-center py-1">{department.name}</h2>
            </div>
            {department.doctors.map((doctor, doctorIndex) => (
              <div key={doctorIndex} className="mb-4 px-4">
                <h3 className="text-[15px] font-semibold">🩺 {doctor.name}</h3>
                <ul className="list-disc pl-5 mt-2 ml-3">
                  {doctor.schedule.map((slot, scheduleIndex) => (
                    <div key={scheduleIndex}>
                      ⏱️ {slot.day}: {slot.startTime} - {slot.endTime}
                    </div>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentList;
