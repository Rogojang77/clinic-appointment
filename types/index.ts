// types/index.ts
export interface Location {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  _id?: string;
  location: string;
  day: string;
  date: Date;
  time: string;
  patientName: string;
  doctorName: string; // Keep for backward compatibility
  testType: string;
  phoneNumber: string;
  isConfirmed: boolean;
  isDefault?: boolean;
  notes: string;
  // New relationship fields - support both string IDs and populated objects
  sectionId?: string | { _id: string; name: string; description?: string };
  doctorId?: string | { _id: string; name: string; specialization?: string };
  // Populated fields from backend
  section?: Section | { _id: string; name: string; description?: string };
  doctor?: Doctor | { _id: string; name: string; specialization?: string };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Colors {
  location: string;
  date: Date;
  color: string;
  createdAt?: Date;
}

export interface Notes{
  date: Date;
  notes: string; 
  location: string; 
  createdAt?: Date;
}

export interface User {
  username: string;
  email : string; 
  password: string;
  accessSection: string;
  role: "admin" | "operator";
  createdAt?: Date;
}


export type Schedule = {
  day: string;
  startTime: string;
  endTime: string;
};

export type DoctorSchedule = {
  name: string;
  schedule: Schedule[];
};

export type Department = {
  name: string;
  doctors: DoctorSchedule[];
};

// Section interface
export interface Section {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  locationIds?: string[] | Array<{ _id: string; name: string; isActive: boolean }>; // References to Locations (multiple)
  locationId?: string | { _id: string; name: string; isActive: boolean }; // Legacy field for backward compatibility
  doctors?: Doctor[];
  createdAt: Date;
  updatedAt: Date;
}

// Doctor interfaces
export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface DailySchedule {
  day: string;
  timeSlots: TimeSlot[];
  isWorkingDay: boolean;
}

export interface Doctor {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  specialization?: string;
  locationId: string | { _id: string; name: string; isActive: boolean }; // Reference to Location
  sectionId: string | { _id: string; name: string; description?: string };
  schedule: DailySchedule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Note: TimeSlot and DailySchedule are defined above in Doctor interfaces

// Activity schedule interface
export interface ActivitySchedule {
  _id: string;
  userId: string | { _id: string; username: string; email: string; role: string };
  sectionId: string | { _id: string; name: string; description?: string };
  schedule: DailySchedule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Populated fields from backend
  user?: User | { _id: string; username: string; email: string; role: string };
  section?: Section | { _id: string; name: string; description?: string };
}

// User with populated section
export interface UserWithSection extends User {
  section?: Section;
}
