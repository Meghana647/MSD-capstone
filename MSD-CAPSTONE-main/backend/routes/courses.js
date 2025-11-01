// routes/courses.js
const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

// Multer storage: route will decide folder/resource_type per field
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // choose folder and resource type by field name
    // expected fields: video, pdf, ppt, thumbnail
    const field = file.fieldname;
    let folder = 'courses';
    let resource_type = 'auto'; // default
    if (field === 'video') {
      folder = 'courses/videos';
      resource_type = 'video';
    } else if (field === 'pdf' || field === 'ppt') {
      folder = 'courses/files';
      resource_type = 'raw';
    } else if (field === 'thumbnail') {
      folder = 'courses/thumbnails';
      resource_type = 'image';
    }
    return {
      folder,
      resource_type
    };
  },
});

const parser = multer({ storage });

// GET /api/courses  -> list all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/course/:id or /api/course/title/:title
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET by title (useful if frontend uses titles)
router.get('/title/:title', async (req, res) => {
  try {
    const course = await Course.findOne({ title: req.params.title });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/*
  POST /api/courses
  Use multipart/form-data:
    - fields: title (string), description (string), drive (string)
    - files (optional): video (multiple), pdf, ppt, thumbnail
  Example using fetch + FormData or Postman.
*/
router.post('/', parser.fields([
  { name: 'video', maxCount: 5 },
  { name: 'pdf', maxCount: 5 },
  { name: 'ppt', maxCount: 5 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, description, drive } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    // Build media arrays from uploaded files
    const videos = (req.files['video'] || []).map(f => ({
      url: f.path,
      public_id: f.filename || f.public_id,
      resource_type: 'video'
    }));
    const pdfs = (req.files['pdf'] || []).map(f => ({
      url: f.path,
      public_id: f.filename || f.public_id,
      resource_type: 'raw'
    }));
    const ppts = (req.files['ppt'] || []).map(f => ({
      url: f.path,
      public_id: f.filename || f.public_id,
      resource_type: 'raw'
    }));
    const thumbnailFile = (req.files['thumbnail'] || [])[0];
    const thumbnail = thumbnailFile
      ? { url: thumbnailFile.path, public_id: thumbnailFile.filename || thumbnailFile.public_id, resource_type: 'image' }
      : undefined;

    // Create course document
    const course = new Course({
      title,
      description,
      drive,
      videos,
      pdfs,
      ppts,
      thumbnail
    });

    await course.save();
    res.status(201).json(course);
  } catch (err) {
    console.error(err);
    // handle duplicates
    if (err.code === 11000) return res.status(400).json({ error: 'Course title already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE course and associated Cloudinary resources (optional)
router.delete('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    // delete remote resources - iterate over videos/pdf/ppts/thumbnail and remove by public_id
    const toDelete = [];
    course.videos.forEach(v => v.public_id && toDelete.push({ public_id: v.public_id, resource_type: 'video' }));
    course.pdfs.forEach(p => p.public_id && toDelete.push({ public_id: p.public_id, resource_type: 'raw' }));
    course.ppts.forEach(pp => pp.public_id && toDelete.push({ public_id: pp.public_id, resource_type: 'raw' }));
    if (course.thumbnail?.public_id) toDelete.push({ public_id: course.thumbnail.public_id, resource_type: 'image' });

    // attempt to remove (best-effort)
    await Promise.all(toDelete.map(item => cloudinary.uploader.destroy(item.public_id, { resource_type: item.resource_type })));

    await course.remove();
    res.json({ message: 'Course and media deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
