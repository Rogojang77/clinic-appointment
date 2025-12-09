import mongoose, { Schema, Document } from 'mongoose';
import { Appointment } from '../types';

const AppointmentSchema: Schema = new Schema({
  location: { type: String, required: true },
  date: { type: Date, required: true },
  day: { type: String, required: true },
  time: { type: String, required: true },
  patientName: { type: String, required: true },
  testType: { type: String, required: true },
  doctorName: { type: String, required: true }, // Keep for backward compatibility
  phoneNumber: { type: String, required: true },
  isConfirmed: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },
  notes: { type: String, default: '' },
  // New relationship fields
  sectionId: {
    type: Schema.Types.ObjectId,
    ref: 'Section',
    required: false // Optional for backward compatibility
  },
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: 'Doctor',
    required: false // Optional for backward compatibility
  },
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true
});

export interface IAppointment extends Omit<Appointment, '_id'>, Document {}

const AppointModel = mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema); 

export default AppointModel;
