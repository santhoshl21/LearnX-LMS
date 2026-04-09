const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    console.log('Server will continue without database connection (using fallback authentication)');
    // Don't exit, allow server to run without database
  }
};

module.exports = connectDB;