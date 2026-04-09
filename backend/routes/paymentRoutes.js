const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Course = require('../models/Course');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo', // Demo key for testing
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'demo_secret'
});

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

// Generate unique transaction ID
const generateTransactionId = () => {
  return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Generate verification code
const generateVerificationCode = () => {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
};

// Create PhonePe instant payment order
router.post('/create-phonepe-order', auth, async (req, res) => {
  try {
    const { courseId } = req.body;

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }

    // Check if user already has access
    const existingPayment = await Payment.findOne({
      userId: req.user.id,
      courseId: courseId,
      paymentStatus: 'completed'
    });

    if (existingPayment) {
      return res.status(400).json({ msg: 'You already have access to this course' });
    }

    // Create PhonePe payment order
    const orderId = `phonepe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create payment record
    const payment = new Payment({
      userId: req.user.id,
      courseId: courseId,
      amount: course.price,
      paymentMethod: 'phonepe',
      transactionId: generateTransactionId(),
      paymentStatus: 'pending',
      paymentDetails: {
        phonePeOrderId: orderId,
        upiId: '9392963190@ybl'
      },
      receiverAccount: {
        accountNumber: '9392963190',
        accountHolder: 'LearnX',
        bankName: 'PhonePe',
        upiId: '9392963190@ybl'
      }
    });

    await payment.save();

    res.json({
      success: true,
      orderId: orderId,
      amount: course.price,
      currency: 'INR',
      upiId: '9392963190@ybl',
      paymentId: payment._id,
      qrCodeUrl: `upi://pay?pa=9392963190@ybl&pn=LearnX&am=${course.price}&cu=INR&tn=Course Payment - ${course.title}`
    });

  } catch (err) {
    console.error('PhonePe order creation error:', err);
    res.status(500).json({ msg: 'Failed to create payment order' });
  }
});

// Verify PhonePe payment instantly
router.post('/verify-phonepe-payment', auth, async (req, res) => {
  try {
    const { orderId, transactionId, amount } = req.body;

    if (!transactionId || transactionId.length < 8) {
      return res.status(400).json({ msg: 'Please provide a valid PhonePe transaction ID' });
    }

    // Find payment record
    const payment = await Payment.findOne({
      'paymentDetails.phonePeOrderId': orderId,
      userId: req.user.id
    });

    if (!payment) {
      return res.status(404).json({ msg: 'Payment record not found' });
    }

    // Verify amount matches
    if (payment.amount !== amount) {
      return res.status(400).json({ msg: 'Payment amount mismatch' });
    }

    // Check if transaction ID is already used
    const existingTransaction = await Payment.findOne({
      realTransactionId: transactionId,
      paymentStatus: 'completed'
    });

    if (existingTransaction && existingTransaction._id.toString() !== payment._id.toString()) {
      return res.status(400).json({ msg: 'Transaction ID already used' });
    }

    // Update payment as completed instantly
    payment.paymentStatus = 'completed';
    payment.paymentVerified = true;
    payment.adminVerified = true;
    payment.realTransactionId = transactionId;
    payment.paymentDetails.phonePeTransactionId = transactionId;
    payment.paymentDetails.verifiedAt = new Date();

    await payment.save();

    res.json({
      success: true,
      message: 'Payment verified successfully! You now have instant access to the course.',
      paymentId: payment._id,
      courseId: payment.courseId,
      transactionId: transactionId
    });

  } catch (err) {
    console.error('PhonePe payment verification error:', err);
    res.status(500).json({ msg: 'Payment verification failed' });
  }
});

// Process payment
router.post('/process', auth, async (req, res) => {
  try {
    const { courseId, amount, paymentMethod, paymentDetails } = req.body;
    
    // Verify course exists and price matches
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }
    
    if (course.price !== amount) {
      return res.status(400).json({ msg: 'Payment amount does not match course price' });
    }
    
    // Check if user already paid for this course
    const existingPayment = await Payment.findOne({
      userId: req.user.id,
      courseId: courseId,
      paymentStatus: 'completed'
    });
    
    if (existingPayment) {
      return res.status(400).json({ msg: 'Payment already completed for this course' });
    }
    
    // Create payment record - PENDING until verified
    const verificationCode = generateVerificationCode();
    const payment = new Payment({
      userId: req.user.id,
      courseId: courseId,
      amount: amount,
      paymentMethod: paymentMethod,
      transactionId: generateTransactionId(),
      paymentDetails: paymentDetails,
      paymentStatus: 'verification_required', // Requires verification before access
      verificationCode: verificationCode,
      paymentVerified: false,
      adminVerified: false,
      receiverAccount: {
        accountNumber: '9392963190',
        accountHolder: 'LearnX',
        bankName: 'PhonePe',
        upiId: '9392963190@ybl'
      }
    });

    await payment.save();

    res.json({
      success: true,
      message: 'Payment initiated. Please complete the actual payment and provide verification.',
      transactionId: payment.transactionId,
      paymentId: payment._id,
      verificationCode: verificationCode,
      requiresVerification: true
    });
    
  } catch (err) {
    console.error('Payment processing error:', err);
    res.status(500).json({ msg: 'Payment processing failed' });
  }
});

// Verify payment with real transaction ID
router.post('/verify', auth, async (req, res) => {
  try {
    const { transactionId, realTransactionId, verificationCode } = req.body;

    // Find the payment record
    const payment = await Payment.findOne({
      transactionId: transactionId,
      userId: req.user.id,
      verificationCode: verificationCode
    });

    if (!payment) {
      return res.status(404).json({ msg: 'Payment record not found or invalid verification code' });
    }

    if (payment.paymentVerified) {
      return res.status(400).json({ msg: 'Payment already verified' });
    }

    // Update payment with real transaction ID (to be verified by admin)
    payment.realTransactionId = realTransactionId;
    payment.paymentStatus = 'pending'; // Waiting for admin verification
    await payment.save();

    res.json({
      success: true,
      message: 'Payment verification submitted. Admin will verify and grant access within 24 hours.',
      status: 'pending_admin_verification'
    });

  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ msg: 'Payment verification failed' });
  }
});

// Admin: Verify and approve payment
router.post('/admin/verify/:paymentId', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const { approved } = req.body;
    const payment = await Payment.findById(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({ msg: 'Payment not found' });
    }

    if (approved) {
      payment.paymentStatus = 'completed';
      payment.paymentVerified = true;
      payment.adminVerified = true;
    } else {
      payment.paymentStatus = 'failed';
    }

    await payment.save();

    res.json({
      success: true,
      message: approved ? 'Payment approved and access granted' : 'Payment rejected',
      payment
    });

  } catch (err) {
    console.error('Admin verification error:', err);
    res.status(500).json({ msg: 'Admin verification failed' });
  }
});

// Get payment status
router.get('/status/:transactionId', auth, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      transactionId: req.params.transactionId,
      userId: req.user.id
    }).populate('courseId', 'title');
    
    if (!payment) {
      return res.status(404).json({ msg: 'Payment not found' });
    }
    
    res.json(payment);
  } catch (err) {
    console.error('Error fetching payment status:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get user's payment history
router.get('/history', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.id })
      .populate('courseId', 'title thumbnail')
      .sort({ paymentDate: -1 });
    
    res.json(payments);
  } catch (err) {
    console.error('Error fetching payment history:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Admin: Get all payments
router.get('/admin/all', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    const payments = await Payment.find()
      .populate('userId', 'name email')
      .populate('courseId', 'title')
      .sort({ paymentDate: -1 });
    
    res.json(payments);
  } catch (err) {
    console.error('Error fetching all payments:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Admin: Get payment analytics
router.get('/admin/analytics', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    const totalRevenue = await Payment.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const paymentsByMethod = await Payment.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amount' } } }
    ]);
    
    const recentPayments = await Payment.find({ paymentStatus: 'completed' })
      .populate('userId', 'name')
      .populate('courseId', 'title')
      .sort({ paymentDate: -1 })
      .limit(10);
    
    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      paymentsByMethod,
      recentPayments
    });
  } catch (err) {
    console.error('Error fetching payment analytics:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Check if user has access to a course
router.get('/access/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course is free
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }

    // If course is free, grant access
    if (course.price === 0) {
      return res.json({ hasAccess: true, reason: 'free_course' });
    }

    // Check if user has completed payment for this course
    const payment = await Payment.findOne({
      userId: req.user.id,
      courseId: courseId,
      paymentStatus: 'completed',
      paymentVerified: true,
      adminVerified: true
    });

    if (payment) {
      return res.json({ hasAccess: true, reason: 'payment_verified' });
    }

    // Check if user has pending payment
    const pendingPayment = await Payment.findOne({
      userId: req.user.id,
      courseId: courseId,
      paymentStatus: { $in: ['pending', 'verification_required'] }
    });

    if (pendingPayment) {
      return res.json({
        hasAccess: false,
        reason: 'payment_pending',
        paymentStatus: pendingPayment.paymentStatus,
        transactionId: pendingPayment.transactionId
      });
    }

    // No payment found
    return res.json({ hasAccess: false, reason: 'payment_required' });

  } catch (err) {
    console.error('Access check error:', err);
    res.status(500).json({ msg: 'Access check failed' });
  }
});

module.exports = router;
