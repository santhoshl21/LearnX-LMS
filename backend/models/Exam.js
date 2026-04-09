const mongoose = require('mongoose');

const examQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true },
  explanation: { type: String },
  marks: { type: Number, default: 1 },
  negativeMarks: { type: Number, default: 0 }
});

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  duration: { type: Number, required: true }, // in minutes
  totalMarks: { type: Number, required: true },
  passingMarks: { type: Number, required: true },
  questions: [examQuestionSchema],
  instructions: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  allowTabSwitching: { type: Boolean, default: false },
  requireScreenRecording: { type: Boolean, default: true },
  maxAttempts: { type: Number, default: 1 },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
