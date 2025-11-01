const mongoose = require("mongoose");

const webinarSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
  },
  date: {
    type: String,
  },
  time: {
    type: String,
  },
  price: {
    type: Number,
    default: 0,
  },
  hostname: {
    type: String,
    required: true,
  },
  hostemail: {
    type: String,
    required: true,
  },
  meetingLink: {
    type: String,
  },
  participants: [
    {
      name: String,
      email: String,
      registeredAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

module.exports = mongoose.model("Webinar", webinarSchema);
