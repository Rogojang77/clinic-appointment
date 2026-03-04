import mongoose, { Schema, Document } from "mongoose";

export interface IMedicalFile extends Document {
  appointmentId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  diagnosis: string;
  prescription: string;
  clinicalNotes: string;
  createdAt: Date;
  updatedAt: Date;
}

const MedicalFileSchema = new Schema<IMedicalFile>(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    diagnosis: { type: String, default: "" },
    prescription: { type: String, default: "" },
    clinicalNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

MedicalFileSchema.index({ appointmentId: 1 }, { unique: true });

const MedicalFileModel =
  mongoose.models.MedicalFile ||
  mongoose.model<IMedicalFile>("MedicalFile", MedicalFileSchema);
export default MedicalFileModel;
