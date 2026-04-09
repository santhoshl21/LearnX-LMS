const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  videoUrl: { type: String, required: true }, // YouTube URL or video file path
  duration: { type: String, required: true }, // e.g., "15:30"
  order: { type: Number, required: true }
});

const quizQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true }, // Index of correct option
  explanation: { type: String }
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  shortDescription: { type: String, default: '' },
  instructor: { type: String, required: true },
  duration: { type: String, default: '16 weeks' },
  level: { type: String, enum: ['Undergraduate', 'Graduate', 'Postgraduate'], default: 'Undergraduate' },
  category: { type: String, required: true },
  department: { type: String, required: true },
  credits: { type: Number, default: 3, min: 1, max: 6 },
  semester: { type: String, enum: ['Fall', 'Spring', 'Summer'], default: 'Fall' },
  price: { type: Number, default: 0 },
  rating: { type: Number, default: 4.5 },
  studentsCount: { type: Number, default: 0 },
  thumbnail: { type: String, default: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400' },
  maxStudents: { type: Number, default: 50 },
  videos: [videoSchema],
  quiz: [quizQuestionSchema],
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', courseSchema);