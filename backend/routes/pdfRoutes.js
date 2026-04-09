const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDF = require('../models/PDF');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/pdfs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pdf-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// Middleware to verify JWT token
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Get all PDFs (public access for students)
router.get('/', auth, async (req, res) => {
  try {
    const { category, subject, search } = req.query;
    let query = { isActive: true };

    // Add filters
    if (category && category !== 'all') {
      query.category = category;
    }
    if (subject && subject !== 'all') {
      query.subject = new RegExp(subject, 'i');
    }
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { subject: new RegExp(search, 'i') },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const pdfs = await PDF.find(query)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(pdfs);
  } catch (err) {
    console.error('Error fetching PDFs:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get single PDF by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const pdf = await PDF.findById(req.params.id)
      .populate('uploadedBy', 'name email');

    if (!pdf) {
      return res.status(404).json({ msg: 'PDF not found' });
    }

    // Increment view count
    pdf.viewCount += 1;
    await pdf.save();

    res.json(pdf);
  } catch (err) {
    console.error('Error fetching PDF:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Create new PDF (Admin only)
router.post('/', auth, upload.single('pdfFile'), async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admin only.' });
    }

    const {
      title,
      description,
      category,
      subject,
      tags
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !subject) {
      return res.status(400).json({
        msg: 'Please provide title, description, category, and subject'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ msg: 'Please upload a PDF file' });
    }

    // Create PDF URL from uploaded file
    const pdfUrl = `/uploads/pdfs/${req.file.filename}`;
    const fileSize = (req.file.size / (1024 * 1024)).toFixed(2) + ' MB';

    const pdf = new PDF({
      title,
      description,
      category,
      subject,
      pdfUrl,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileSize,
      fileSizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      pages: 0, // Will be calculated later if needed
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      uploadedBy: req.user.id
    });

    await pdf.save();
    await pdf.populate('uploadedBy', 'name email');

    res.status(201).json(pdf);
  } catch (err) {
    console.error('Error creating PDF:', err);
    // Delete uploaded file if PDF creation failed
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
    }
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update PDF (Admin only)
router.put('/:id', auth, upload.single('pdfFile'), async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admin only.' });
    }

    const pdf = await PDF.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ msg: 'PDF not found' });
    }

    const {
      title,
      description,
      category,
      subject,
      tags,
      isActive
    } = req.body;

    // Store old file path for deletion if new file is uploaded
    const oldFilePath = pdf.pdfUrl ? path.join(__dirname, '..', pdf.pdfUrl) : null;

    // Update fields
    if (title) pdf.title = title;
    if (description) pdf.description = description;
    if (category) pdf.category = category;
    if (subject) pdf.subject = subject;
    if (tags) pdf.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    if (isActive !== undefined) pdf.isActive = isActive;

    // Handle new file upload
    if (req.file) {
      pdf.pdfUrl = `/uploads/pdfs/${req.file.filename}`;
      pdf.fileName = req.file.filename;
      pdf.originalName = req.file.originalname;
      pdf.fileSize = (req.file.size / (1024 * 1024)).toFixed(2) + ' MB';
      pdf.fileSizeBytes = req.file.size;
      pdf.mimeType = req.file.mimetype;

      // Delete old file if it exists
      if (oldFilePath && fs.existsSync(oldFilePath)) {
        fs.unlink(oldFilePath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting old file:', unlinkErr);
        });
      }
    }

    await pdf.save();
    await pdf.populate('uploadedBy', 'name email');

    res.json(pdf);
  } catch (err) {
    console.error('Error updating PDF:', err);
    // Delete uploaded file if update failed
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
    }
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete PDF (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admin only.' });
    }

    const pdf = await PDF.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ msg: 'PDF not found' });
    }

    // Delete physical file if it exists
    if (pdf.pdfUrl) {
      const filePath = path.join(__dirname, '..', pdf.pdfUrl);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting file:', unlinkErr);
        });
      }
    }

    await PDF.findByIdAndDelete(req.params.id);
    res.json({ msg: 'PDF deleted successfully' });
  } catch (err) {
    console.error('Error deleting PDF:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get PDF categories and subjects for filters
router.get('/filters/options', auth, async (req, res) => {
  try {
    const categories = await PDF.distinct('category', { isActive: true });
    const subjects = await PDF.distinct('subject', { isActive: true });

    res.json({
      categories,
      subjects
    });
  } catch (err) {
    console.error('Error fetching filter options:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
