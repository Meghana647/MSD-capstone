const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    childUsername: String
});

module.exports = mongoose.models.Parent || mongoose.model('Parent', parentSchema);