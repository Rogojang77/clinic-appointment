import mongoose, { Schema, Document } from "mongoose";

// Interface for Section document
export interface ISection extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  locationIds: mongoose.Types.ObjectId[]; // References to locations (multiple)
  doctors?: mongoose.Types.ObjectId[]; // Reference to doctors
  createdAt: Date;
  updatedAt: Date;
}

// Section schema
const SectionSchema: Schema = new Schema(
  {
    name: { 
      type: String, 
      required: [true, "Section name is required"],
      unique: true,
      trim: true
    },
    description: { 
      type: String, 
      trim: true 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    locationIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Location',
    }],
    doctors: [{
      type: Schema.Types.ObjectId,
      ref: 'Doctor'
    }]
  },
  {
    timestamps: true,
  }
);

// Create and export the model
const SectionModel = mongoose.models.Section || mongoose.model<ISection>("Section", SectionSchema);
export default SectionModel;
