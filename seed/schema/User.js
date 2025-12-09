const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    accessSection: { type: String, required: true },
    role: { type: String, enum: ["admin", "operator"], default: "operator" },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

module.exports = User;
