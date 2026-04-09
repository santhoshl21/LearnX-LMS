const express = require('express');
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

// Get all courses (public - no auth required for browsing)
router.get('/', async (_req, res) => {
  try {
    const courses = await Course.find().select('-enrolledStudents');
    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all courses with enrollment info (authenticated)
router.get('/auth/all', auth, async (_req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Enroll in a course
router.post('/enroll/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }

    if (course.enrolledStudents.includes(req.user.id)) {
      return res.status(400).json({ msg: 'Already enrolled' });
    }

    course.enrolledStudents.push(req.user.id);
    await course.save();

    res.json({ msg: 'Enrolled successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Add a course (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    console.log('Course creation request received');
    console.log('Request body:', req.body);
    console.log('User ID:', req.user.id);

    // Check if user is admin
    const user = await User.findById(req.user.id);
    console.log('User found:', user);
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admin only.' });
    }

    // Extract all fields from request body
    const {
      title,
      description,
      shortDescription,
      instructor,
      duration,
      level,
      category,
      department,
      credits,
      semester,
      price,
      maxStudents,
      thumbnail,
      rating,
      studentsCount,
      videos,
      quiz
    } = req.body;

    // Validate required fields
    if (!title || !description || !instructor || !category || !department) {
      return res.status(400).json({ msg: 'Missing required fields: title, description, instructor, category, and department are required' });
    }

    // Validate level
    if (level && !['Undergraduate', 'Graduate', 'Postgraduate'].includes(level)) {
      return res.status(400).json({ msg: 'Level must be Undergraduate, Graduate, or Postgraduate' });
    }

    const course = new Course({
      title,
      description,
      shortDescription: shortDescription || description.substring(0, 100) + (description.length > 100 ? '...' : ''),
      instructor,
      duration: duration || '16 weeks',
      level: level || 'Undergraduate',
      category,
      department,
      credits: credits ? parseInt(credits) : 3,
      semester: semester || 'Fall',
      price: price || 0,
      rating: rating || 4.5,
      studentsCount: studentsCount || 0,
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400',
      maxStudents: maxStudents || 50,
      videos: videos || [],
      quiz: quiz || [],
      createdBy: req.user.id
    });

    console.log('Creating course with data:', course);
    await course.save();
    console.log('Course created successfully:', course._id);
    res.status(201).json(course);
  } catch (err) {
    console.error('Course creation error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Get a single course by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }
    res.json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get a single course by ID with enrollment info (authenticated)
router.get('/auth/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('enrolledStudents', 'name email');
    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }
    res.json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get enrolled courses for current user
router.get('/enrolled/my-courses', auth, async (req, res) => {
  try {
    const courses = await Course.find({ enrolledStudents: req.user.id });
    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update a course (Admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admin only.' });
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }

    res.json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete a course (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admin only.' });
    }

    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }

    res.json({ msg: 'Course deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;