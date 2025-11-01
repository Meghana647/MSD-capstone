
const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
    webinar: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    meetingLink: { type: String, required: true },
     // Jitsi link replaces zoomId & zoomPassword
    registeredAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Registration", registrationSchema);
