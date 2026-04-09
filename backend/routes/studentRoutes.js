const express = require('express');
const StudentDetails = require('../models/StudentDetails');
const Progress = require('../models/Progress');
const Course = require('../models/Course');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to verify JWT
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Submit student details for course enrollment
router.post('/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { fullName, email, phone, address, dateOfBirth, education, experience, motivation } = req.body;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }

    // Check if student details already exist
    const existingDetails = await StudentDetails.findOne({ userId: req.user.id, courseId });
    if (existingDetails) {
      return res.status(400).json({ msg: 'Student details already submitted for this course' });
    }

    // Create student details
    const studentDetails = new StudentDetails({
      userId: req.user.id,
      courseId,
      fullName,
      email,
      phone,
      address,
      dateOfBirth,
      education,
      experience,
      motivation
    });

    await studentDetails.save();

    // Initialize progress tracking
    const progress = new Progress({
      userId: req.user.id,
      courseId,
      videosWatched: [],
      quizCompleted: false,
      quizScore: 0,
      completionPercentage: 0,
      isCompleted: false
    });

    await progress.save();

    res.status(201).json({ msg: 'Student details submitted successfully', studentDetails });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get student details for a course
router.get('/:courseId', auth, async (req, res) => {
  try {
    const studentDetails = await StudentDetails.findOne({ 
      userId: req.user.id, 
      courseId: req.params.courseId 
    });
    
    if (!studentDetails) {
      return res.status(404).json({ msg: 'Student details not found' });
    }

    res.json(studentDetails);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all student details (Admin only)
router.get('/all/details', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admin only.' });
    }

    const studentDetails = await StudentDetails.find()
      .populate('userId', 'name email')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 });

    res.json(studentDetails);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
