import mongoose, { Schema, Document } from "mongoose";

export interface IMedicalLetterFields {
  pacientNume: string;
  pacientDataNasterii: string;
  pacientCnp: string;
  dataConsult: string;
  internarePerioada: string;
  nrFO: string;

  motivePrezentare: string;
  oncologic: "DA" | "NU" | "";
  diagnosticText: string;
  diagnosticCod: string;

  anamneza: string;
  factoriRisc: string;

  exClinGeneral: string;
  exClinLocal: string;

  labNormale: string;
  labPatologice: string;

  ekg: string;
  eco: string;
  rx: string;
  paracliniceAlte: string;

  tratamentEfectuat: string;
  alteInformatii: string;

  tratamentRecomandat: string;
  durataTratament: string;

  revenireInternare: "da" | "nu" | "";
  revenireTermen: string;

  prescriptie: "eliberata" | "nuNecesara" | "nuEliberata" | "";
  prescriptieSerieNumar: string;

  concediu: "eliberat" | "nuNecesara" | "nuEliberat" | "";
  concediuSerieNumar: string;

  ingrijiriDomiciliu: "eliberata" | "nuNecesara" | "";
  dispozitive: "eliberata" | "nuNecesara" | "";

  dataScrisoare: string;
  semnaturaMedic: string;

  caleTransmitere: "asigurat" | "posta" | "";
  detaliiPosta: string;
}

export interface IMedicalFile extends Document {
  appointmentId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  diagnosis: string;
  prescription: string;
  clinicalNotes: string;
  fields?: IMedicalLetterFields;
  createdAt: Date;
  updatedAt: Date;
}

const MedicalFileSchema = new Schema<IMedicalFile>(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
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
    fields: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  { timestamps: true }
);

MedicalFileSchema.index({ appointmentId: 1 }, { unique: true });

const MedicalFileModel =
  mongoose.models.MedicalFile ||
  mongoose.model<IMedicalFile>("MedicalFile", MedicalFileSchema);
export default MedicalFileModel;
