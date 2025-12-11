import mongoose, { Schema, Document } from "mongoose";

// Interface for time slots
export interface ITimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

// Interface for daily schedule
export interface IDailySchedule {
  day: string; // Monday, Tuesday, etc.
  timeSlots: ITimeSlot[];
  isWorkingDay: boolean;
}

// Interface for Doctor document
export interface IDoctor extends Document {
  name: string;
  email?: string;
  phone?: string;
  specialization?: string;
  locationIds: mongoose.Types.ObjectId[]; // References to Locations (multiple)
  locationId?: mongoose.Types.ObjectId; // Legacy field for backward compatibility
  sectionId: mongoose.Types.ObjectId;
  schedule: IDailySchedule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Time slot schema
const TimeSlotSchema = new Schema<ITimeSlot>({
  startTime: { 
    type: String, 
    required: true 
  },
  endTime: { 
    type: String, 
    required: true 
  },
  isAvailable: { 
    type: Boolean, 
    default: true 
  }
});

// Daily schedule schema
const DailyScheduleSchema = new Schema<IDailySchedule>({
  day: { 
    type: String, 
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  timeSlots: { 
    type: [TimeSlotSchema], 
    default: [] 
  },
  isWorkingDay: { 
    type: Boolean, 
    default: true 
  }
});

// Doctor schema
const DoctorSchema = new Schema<IDoctor>(
  {
    name: { 
      type: String, 
      required: [true, "Doctor name is required"],
      trim: true
    },
    email: { 
      type: String, 
      trim: true,
      lowercase: true
    },
    phone: { 
      type: String, 
      trim: true 
    },
    specialization: { 
      type: String, 
      trim: true 
    },
    locationIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Location',
      default: [],
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: false, // Legacy field for backward compatibility
    },
    sectionId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Section', 
      required: true 
    },
    schedule: { 
      type: [DailyScheduleSchema], 
      default: [] 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    }
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient queries
DoctorSchema.index({ sectionId: 1 });
DoctorSchema.index({ name: 1 });
DoctorSchema.index({ email: 1 });

// Create and export the model
const DoctorModel = mongoose.models.Doctor || mongoose.model<IDoctor>("Doctor", DoctorSchema);
export default DoctorModel;
