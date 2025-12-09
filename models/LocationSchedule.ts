import { Document, Schema, model, models } from "mongoose";

// Type for the Time schema
export interface ITime {
  time: string;
  date: string;
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

// Type for the LocationSchedule schema
export interface ILocationSchedule extends Document {
  location: string;
  schedule: ISchedule;
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

const LocationScheduleSchema = new Schema<ILocationSchedule>({
  location: {
    type: String,
    required: true,
  },
  schedule: {
    type: ScheduleSchema,
    required: true,
  },
});

// Model definition with check for existing model
const LocationScheduleModel =
  models.LocationSchedule ||
  model<ILocationSchedule>("LocationSchedule", LocationScheduleSchema);

export default LocationScheduleModel;
