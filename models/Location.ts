import mongoose, { Schema, Document } from "mongoose";

export interface ILocation extends Document {
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Location name is required"],
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

LocationSchema.index({ name: 1 });

const LocationModel = mongoose.models.Location || mongoose.model<ILocation>("Location", LocationSchema);
export default LocationModel;

