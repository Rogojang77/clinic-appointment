import mongoose, { Schema, Document } from "mongoose";
import { User } from "../types"; // Ensure "../types" exports a `User` interface/type

const UserSchema: Schema = new Schema(
  {
    username: { type: String, required:[true,"please provide a username"], },
    email: { type: String, required: true, unique: true },
    password: { type: String, required:[true,"please provide a password"], },
    isverified:{
      type:Boolean,
      default:false,
    },
    isAdmin:{
        type:Boolean,
        default:false,

    },
    accessSection: { type: String, required: true },
    role: { type: String, enum: ["admin", "operator"], default: "operator" },
    forgotpasswordToken: String,
    forgotpasswordToeknExpiry: Date,
    verifyToken: String,
    verifyTokenExpiry: Date,
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export interface IUser extends User, Document {}

const UserModel = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default UserModel;
