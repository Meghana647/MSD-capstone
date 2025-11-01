const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    grade: String
});

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);