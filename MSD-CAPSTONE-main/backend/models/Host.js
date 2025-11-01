const mongoose = require('mongoose');

const hostSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    organization: String
});

module.exports = mongoose.models.Host || mongoose.model('Host', hostSchema);