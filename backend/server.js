const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Dedicated PDF serving route with proper headers and debugging
app.get('/uploads/pdfs/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads/pdfs', filename);

  console.log(`📄 PDF Request: ${filename}`);
  console.log(`📁 File Path: ${filePath}`);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return res.status(404).json({ error: 'PDF file not found' });
  }

  // Get file stats
  const stats = fs.statSync(filePath);
  console.log(`📊 File Size: ${stats.size} bytes`);

  // Set proper headers for PDF
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="' + filename + '"');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Length', stats.size);

  console.log(`✅ Serving PDF: ${filename} (${stats.size} bytes)`);

  // Send file
  res.sendFile(filePath, (err) => {
    if (err) {
      console.log(`❌ Error sending file: ${err.message}`);
    } else {
      console.log(`✅ PDF sent successfully: ${filename}`);
    }
  });
});

// Serve static files from uploads directory with proper headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }
}));

// PDF diagnostic route
app.get('/api/pdf-status', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads/pdfs');
  const files = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];

  res.json({
    uploadsDirectory: uploadsDir,
    filesFound: files.length,
    files: files,
    serverTime: new Date().toISOString()
  });
});

// PDF test page
app.get('/test-pdf', (req, res) => {
  const testHtmlPath = path.join(__dirname, 'test-pdf.html');
  res.sendFile(testHtmlPath);
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/student-details', require('./routes/studentRoutes'));
app.use('/api/progress', require('./routes/progressRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/pdfs', require('./routes/pdfRoutes'));



const PORT = process.env.PORT || 5002;

// Only listen if NOT running as a serverless function (e.g., in local development)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;