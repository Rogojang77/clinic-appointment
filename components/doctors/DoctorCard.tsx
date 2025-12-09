import { Department } from '@/types';
import React from 'react';


type DepartmentCardProps = {
  department: Department;
};

const DepartmentCard: React.FC<DepartmentCardProps> = ({ department }) => {
  return (
    <div className="border p-4 rounded-md shadow-md">
      <h2 className="text-xl font-semibold mb-2">{department.name}</h2>
      {department.doctors.map((doctor, index) => (
        <div key={index} className="mb-4">
          <h3 className="text-lg font-medium">{doctor.name}</h3>
          <ul className="list-disc pl-5">
            {doctor.schedule.map((slot, i) => (
              <li key={i}>
                {slot.day}: {slot.startTime} - {slot.endTime}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default DepartmentCard;
