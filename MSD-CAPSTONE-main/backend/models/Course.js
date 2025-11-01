// models/Course.js
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  url: String,
  public_id: String,
  resource_type: { type: String, enum: ['video','image','raw','auto'], default: 'auto' }
}, { _id: false });

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  videos: [mediaSchema],   // cloudinary video objects
  pdfs: [mediaSchema],     // resource_type: raw
  ppts: [mediaSchema],     // resource_type: raw (or auto)
  thumbnail: mediaSchema,
  drive: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', CourseSchema);
