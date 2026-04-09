const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['card', 'upi', 'qr', 'razorpay', 'phonepe'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'verification_required'], default: 'pending' },
  transactionId: { type: String, unique: true },
  realTransactionId: { type: String }, // Actual transaction ID from PhonePe
  paymentVerified: { type: Boolean, default: false },
  verificationCode: { type: String }, // Code for manual verification
  adminVerified: { type: Boolean, default: false },
  razorpayOrderId: { type: String }, // Razorpay order ID
  razorpayPaymentId: { type: String }, // Razorpay payment ID
  paymentDetails: {
    // For card payments
    cardLast4: String,
    cardType: String,
    // For UPI payments
    upiId: String,
    // For QR payments
    qrReference: String,
    // For Razorpay payments
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    // For PhonePe payments
    phonePeOrderId: String,
    phonePeTransactionId: String,
    verifiedAt: Date
  },
  paymentDate: { type: Date, default: Date.now },
  // Bank account details for receiving money
  receiverAccount: {
    accountNumber: { type: String, default: '9392963190' },
    accountHolder: { type: String, default: 'LearnX' },
    bankName: { type: String, default: 'PhonePe' },
    upiId: { type: String, default: '9392963190@ybl' }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
