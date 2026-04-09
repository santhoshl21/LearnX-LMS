const mongoose = require('mongoose');

const studentDetailsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  education: { type: String, required: true },
  experience: { type: String },
  motivation: { type: String, required: true },
  enrolledAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudentDetails', studentDetailsSchema);
