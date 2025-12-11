import { Document, Schema, model, models } from "mongoose";

// Type for the Time schema (same as LocationSchedule)
export interface ITime {
  time: string;
  date: string; // "00:00:00" for default weekly schedule, or specific date "YYYY-MM-DD" for overrides
}

// Type for the Schedule schema
export interface ISchedule {
  Luni: ITime[];
  Marți: ITime[];
  Miercuri: ITime[];
  Joi: ITime[];
  Vineri: ITime[];
  Sâmbătă: ITime[];
  Duminica: ITime[];
}

// Type for the SectionSchedule schema
export interface ISectionSchedule extends Document {
  sectionId: Schema.Types.ObjectId; // Reference to Section
  location: string; // Location name (e.g., "Beiuș", "Oradea")
  schedule: ISchedule;
  slotInterval?: number; // Optional: minutes per slot (default 15, allows future customization)
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema definitions
const TimeSchema = new Schema<ITime>({
  time: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
});

const ScheduleSchema = new Schema<ISchedule>({
  Luni: { type: [TimeSchema], default: [] },
  Marți: { type: [TimeSchema], default: [] },
  Miercuri: { type: [TimeSchema], default: [] },
  Joi: { type: [TimeSchema], default: [] },
  Vineri: { type: [TimeSchema], default: [] },
  Sâmbătă: { type: [TimeSchema], default: [] },
  Duminica: { type: [TimeSchema], default: [] },
});

const SectionScheduleSchema = new Schema<ISectionSchedule>(
  {
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    schedule: {
      type: ScheduleSchema,
      required: true,
    },
    slotInterval: {
      type: Number,
      default: 15, // Default 15-minute intervals
      min: 5,
      max: 60,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique section-location combination
SectionScheduleSchema.index({ sectionId: 1, location: 1 }, { unique: true });

// Index for efficient queries
SectionScheduleSchema.index({ location: 1 });
SectionScheduleSchema.index({ sectionId: 1 });

// Model definition with check for existing model
const SectionScheduleModel =
  models.SectionSchedule ||
  model<ISectionSchedule>("SectionSchedule", SectionScheduleSchema);

export default SectionScheduleModel;

