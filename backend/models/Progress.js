const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  videosWatched: [{ type: Number }], // Array of video indices watched
  quizCompleted: { type: Boolean, default: false },
  quizScore: { type: Number, default: 0 },
  quizAttempts: { type: Number, default: 0 },
  completionPercentage: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date },
  lastAccessedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient queries
progressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);
