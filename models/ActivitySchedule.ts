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

// Interface for ActivitySchedule document
export interface IActivitySchedule extends Document {
  userId: mongoose.Types.ObjectId;
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

// Activity schedule schema
const ActivityScheduleSchema = new Schema<IActivitySchedule>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
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

// Create index for efficient queries
ActivityScheduleSchema.index({ userId: 1, sectionId: 1 }, { unique: true });

// Create and export the model
const ActivityScheduleModel = mongoose.models.ActivitySchedule || mongoose.model<IActivitySchedule>("ActivitySchedule", ActivityScheduleSchema);
export default ActivityScheduleModel;
