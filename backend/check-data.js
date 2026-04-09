const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
const StudentDetails = require('./models/StudentDetails');
const Progress = require('./models/Progress');

async function checkData() {
  try {
    console.log('🔍 CHECKING LMS DATA...\n');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/LMS', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Check Users
    console.log('👥 USERS:');
    console.log('=========');
    const users = await User.find();
    console.log(`Total Users: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - Role: ${user.role} - Created: ${user.createdAt || 'N/A'}`);
    });
    console.log('');

    // Check Courses
    console.log('📚 COURSES:');
    console.log('===========');
    const courses = await Course.find();
    console.log(`Total Courses: ${courses.length}`);
    courses.forEach((course, index) => {
      console.log(`${index + 1}. "${course.title}" by ${course.instructor}`);
      console.log(`   - Videos: ${course.videos?.length || 0}, Quiz Questions: ${course.quiz?.length || 0}`);
      console.log(`   - Category: ${course.category}, Level: ${course.level}`);
      console.log(`   - Enrolled Students: ${course.enrolledStudents?.length || 0}`);
      console.log('');
    });

    // Check Student Details
    console.log('🎓 STUDENT ENROLLMENTS:');
    console.log('=======================');
    const studentDetails = await StudentDetails.find()
      .populate('userId', 'name email')
      .populate('courseId', 'title');
    console.log(`Total Enrollments: ${studentDetails.length}`);
    studentDetails.forEach((detail, index) => {
      console.log(`${index + 1}. ${detail.fullName} (${detail.userId?.email || 'Unknown'})`);
      console.log(`   - Course: "${detail.courseId?.title || 'Unknown Course'}"`);
      console.log(`   - Phone: ${detail.phone}, Education: ${detail.education}`);
      console.log(`   - Enrolled: ${detail.createdAt ? new Date(detail.createdAt).toLocaleDateString() : 'N/A'}`);
      console.log('');
    });

    // Check Progress
    console.log('📈 LEARNING PROGRESS:');
    console.log('====================');
    const progress = await Progress.find()
      .populate('userId', 'name email')
      .populate('courseId', 'title');
    console.log(`Total Progress Records: ${progress.length}`);
    progress.forEach((prog, index) => {
      console.log(`${index + 1}. ${prog.userId?.name || 'Unknown'} (${prog.userId?.email || 'Unknown'})`);
      console.log(`   - Course: "${prog.courseId?.title || 'Unknown Course'}"`);
      console.log(`   - Videos Watched: ${prog.videosWatched?.length || 0}`);
      console.log(`   - Quiz Score: ${prog.quizScore || 0}%`);
      console.log(`   - Completion: ${prog.completionPercentage || 0}%`);
      console.log(`   - Status: ${prog.isCompleted ? 'Completed' : 'In Progress'}`);
      if (prog.completedAt) {
        console.log(`   - Completed: ${new Date(prog.completedAt).toLocaleDateString()}`);
      }
      console.log('');
    });

    // Summary Statistics
    console.log('📊 SUMMARY STATISTICS:');
    console.log('======================');
    const adminCount = users.filter(u => u.role === 'admin').length;
    const studentCount = users.filter(u => u.role === 'student').length;
    const completedCourses = progress.filter(p => p.isCompleted).length;
    const avgScore = progress.length > 0 ? 
      Math.round(progress.reduce((sum, p) => sum + (p.quizScore || 0), 0) / progress.length) : 0;

    console.log(`Total Users: ${users.length} (${adminCount} admins, ${studentCount} students)`);
    console.log(`Total Courses: ${courses.length}`);
    console.log(`Total Enrollments: ${studentDetails.length}`);
    console.log(`Total Progress Records: ${progress.length}`);
    console.log(`Completed Courses: ${completedCourses}`);
    console.log(`Average Quiz Score: ${avgScore}%`);
    console.log('');

    console.log('✅ Data check completed successfully!');

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the data check
checkData();
