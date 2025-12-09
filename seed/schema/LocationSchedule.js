const mongoose = require("mongoose");

const TimeSchema = new mongoose.Schema({
  time: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
});

const ScheduleSchema = new mongoose.Schema({
  Luni: [TimeSchema],
  Marți: [TimeSchema],
  Miercuri: [TimeSchema],
  Joi: [TimeSchema],
  Vineri: [TimeSchema],
  Sâmbătă: [TimeSchema],
  Duminica: [TimeSchema],
});

const LocationScheduleSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true,
  },
  schedule: ScheduleSchema,
});

const LocationSchedule = mongoose.model("LocationSchedule", LocationScheduleSchema);

module.exports = LocationSchedule;
