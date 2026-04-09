const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};



const seedDatabase = async () => {
  try {
    await connectDB();
    
    // Create admin user if doesn't exist
    let adminUser = await User.findOne({ email: 'admin@learnx.edu.in' });
    if (!adminUser) {
      adminUser = new User({
        name: 'LearnX Admin',
        email: 'admin@learnx.edu.in',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin'
      });
      await adminUser.save();
      console.log('Created LearnX admin user');
    } else {
      console.log('Admin user already exists');
    }

    console.log('Database setup completed!');
    console.log('Admin login: admin@learnx.edu.in / admin123');
    console.log('You can now create courses using the admin account.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
};

seedDatabase();
