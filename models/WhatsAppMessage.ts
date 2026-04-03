import mongoose, { Document, Schema } from "mongoose";

export interface IWhatsAppMessage extends Document {
  appointmentId?: mongoose.Types.ObjectId | null;
  phoneNumber: string;
  direction: "inbound" | "outbound";
  provider: "meta";
  messageSid: string;
  text: string;
  buttonPayload?: string | null;
  buttonText?: string | null;
  status?: "pending" | "sent" | "delivered" | "read" | "failed";
  statusError?: string | null;
  metaTimestamp?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppMessageSchema = new Schema<IWhatsAppMessage>(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: false,
      default: null,
    },
    phoneNumber: { type: String, required: true, index: true },
    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["meta"],
      default: "meta",
      index: true,
    },
    messageSid: { type: String, required: true },
    text: { type: String, default: "" },
    buttonPayload: { type: String, default: null },
    buttonText: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "read", "failed"],
      default: "pending",
      index: true,
    },
    statusError: { type: String, default: null },
    metaTimestamp: { type: Date, default: null },
  },
  { timestamps: true }
);

WhatsAppMessageSchema.index({ messageSid: 1 }, { unique: true });
WhatsAppMessageSchema.index({ appointmentId: 1, createdAt: 1 });

const WhatsAppMessageModel =
  mongoose.models.WhatsAppMessage ||
  mongoose.model<IWhatsAppMessage>("WhatsAppMessage", WhatsAppMessageSchema);

export default WhatsAppMessageModel;
