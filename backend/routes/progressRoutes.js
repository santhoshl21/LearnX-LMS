const express = require('express');
const Progress = require('../models/Progress');
const Course = require('../models/Course');
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

// Get progress for a course
router.get('/:courseId', auth, async (req, res) => {
  try {
    const progress = await Progress.findOne({ 
      userId: req.user.id, 
      courseId: req.params.courseId 
    });
    
    if (!progress) {
      return res.status(404).json({ msg: 'Progress not found' });
    }

    res.json(progress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Mark video as watched
router.post('/:courseId/video', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { videoIndex } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }

    let progress = await Progress.findOne({ userId: req.user.id, courseId });
    if (!progress) {
      progress = new Progress({
        userId: req.user.id,
        courseId,
        videosWatched: [],
        quizCompleted: false,
        quizScore: 0,
        completionPercentage: 0,
        isCompleted: false
      });
    }

    // Add video to watched list if not already watched
    if (!progress.videosWatched.includes(videoIndex)) {
      progress.videosWatched.push(videoIndex);
    }

    // Calculate completion percentage
    const totalVideos = course.videos.length;
    const watchedVideos = progress.videosWatched.length;
    progress.completionPercentage = Math.round((watchedVideos / totalVideos) * 100);
    progress.lastAccessedAt = new Date();

    await progress.save();

    res.json(progress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Submit quiz results
router.post('/:courseId/quiz', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { score, answers } = req.body;

    let progress = await Progress.findOne({ userId: req.user.id, courseId });
    if (!progress) {
      return res.status(404).json({ msg: 'Progress not found' });
    }

    progress.quizCompleted = true;
    progress.quizScore = score;
    progress.quizAttempts += 1;
    progress.lastAccessedAt = new Date();

    // Mark course as completed if score >= 70%
    if (score >= 70) {
      progress.isCompleted = true;
      progress.completedAt = new Date();
      progress.completionPercentage = 100;
    }

    await progress.save();

    res.json(progress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all completed courses for user
router.get('/completed/all', auth, async (req, res) => {
  try {
    const completedProgress = await Progress.find({ 
      userId: req.user.id, 
      isCompleted: true 
    }).populate('courseId');

    res.json(completedProgress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all progress data (Admin only)
router.get('/all/admin', auth, async (req, res) => {
  try {
    // Check if user is admin
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admin only.' });
    }

    const allProgress = await Progress.find()
      .populate('userId', 'name email')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 });

    res.json(allProgress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
