
const mongoose = require("mongoose");
const dbConnect = require("./connect");
const  timeSlotSeedData  = require("./data/timeslotdata");
const TimeSlot = require("./schema/LocationSchedule");


async function seedTimeSlots() {
  await dbConnect();
  try {

    // Clear existing time slots
    // await TimeSlot.deleteMany({});

    // Insert seed data
    await TimeSlot.insertMany(timeSlotSeedData);

    console.log("Time slots seeded successfully!");
  } catch (error) {
    console.error("Error seeding the database:", error);
  }finally {
    // Disconnect from the database
    mongoose.disconnect();
  }
};

module.exports = seedTimeSlots; 