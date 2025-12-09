const dbConnect = require("./connect");
const { userData } = require("./data/userdata");
const UserModel = require("./schema/User");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

async function createUser() {
    try {
      await dbConnect();
      const user = await UserModel.findOne({ email: userData.email });
      if (user) throw new Error("Default admin user already exists.");
  
      const hashedPassword = await bcrypt.hash(userData.password, 10);
  
      const createdUser = new UserModel({
        ...userData,
        password: hashedPassword,
      });
  
      await createdUser.save();
      console.log("Default admin user created successfully.", createdUser);
    } catch (error) {
      console.error("Seeding failed:", error.message);
    } finally {
      mongoose.connection.close();
      console.log("Seeding completed.");
    }
};

module.exports = createUser; 
  