// models/Reminder.js
const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema({
  webinarId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Webinar",
    required: true,
  },
  recipientEmail: {
    type: String,
    required: true,
  },
  recipientName: String,
  type: {
    type: String,
    enum: ["1day", "1hour", "30min", "1min"],
    required: true,
  },
  sentAt: Date,
  status: {
    type: String,
    enum: ["pending", "sent", "failed"],
    default: "pending",
  },
  errorMessage: String,
});

module.exports = mongoose.model("Reminder", reminderSchema);
