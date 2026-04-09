const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Academic', 'Research', 'Tutorial', 'Reference', 'Study Material', 'Other'],
    default: 'Study Material',
    index: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  pdfUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileSize: {
    type: String,
    default: 'Unknown'
  },
  fileSizeBytes: {
    type: Number,
    default: 0
  },
  pages: {
    type: Number,
    default: 0
  },
  mimeType: {
    type: String,
    default: 'application/pdf'
  },
  tags: [{
    type: String,
    trim: true
  }],
  downloadCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'pdfs' // Explicitly set collection name
});

// Update the updatedAt field before saving
pdfSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better search performance
pdfSchema.index({ title: 'text', description: 'text', subject: 'text', tags: 'text' });

module.exports = mongoose.model('PDF', pdfSchema);
