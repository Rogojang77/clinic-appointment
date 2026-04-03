import mongoose, { Schema, Document } from 'mongoose';
import { Appointment } from '../types';

const AppointmentSchema: Schema = new Schema({
  location: { type: String, required: true },
  date: { type: Date, required: true },
  day: { type: String, required: true },
  time: { type: String, required: true },
  patientName: { type: String, required: true },
  testType: { type: String, required: true },
  doctorName: { type: String, required: false, default: '' }, // Keep for backward compatibility, now optional
  phoneNumber: { type: String, required: true },
  isConfirmed: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },
  notes: { type: String, default: '' },
  whatsAppReminderStatus: {
    type: String,
    enum: ['not_sent', 'sent', 'failed'],
    default: 'not_sent',
  },
  whatsAppReminderSentAt: { type: Date, default: null },
  whatsAppReminderMessageSid: { type: String, default: null },
  /** Fereastra [start, end) în care cron-ul poate trimite reminderul (setată la creare/actualizare). */
  whatsAppReminderWindowStart: { type: Date, default: null },
  whatsAppReminderWindowEnd: { type: Date, default: null },
  patientDecision: {
    type: String,
    enum: ['pending', 'confirmed', 'declined', 'reschedule'],
    default: 'pending',
  },
  patientDecisionAt: { type: Date, default: null },
  confirmationTokenHash: { type: String, default: null },
  confirmationTokenExpiresAt: { type: Date, default: null },
  whatsAppLastInboundAt: { type: Date, default: null },
  whatsAppLastInboundBody: { type: String, default: "" },
  whatsAppLastInboundMessageSid: { type: String, default: null },
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

AppointmentSchema.index({
  whatsAppReminderWindowStart: 1,
  whatsAppReminderWindowEnd: 1,
  whatsAppReminderStatus: 1,
  isConfirmed: 1,
});

export interface IAppointment extends Omit<Appointment, '_id'>, Document {}

const AppointModel = mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema); 

export default AppointModel;
