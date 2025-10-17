const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'Downloads');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const uploadToDisk = multer({ storage });

const users = {
  admin: { username: 'admin', password: 'password', role: 'admin' },
  student: { username: 'student', password: '1234', role: 'student' },
};

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (user && user.password === password) {
    res.json({ success: true, user: { username, role: user.role } });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const role = req.headers['x-user-role'];
    if (!role) return res.status(403).json({ message: 'No role provided' });
    if (!allowedRoles.includes(role))
      return res.status(403).json({ message: 'Access denied' });
    next();
  };
}

app.post(
  '/api/upload',
  authorizeRoles('admin'),
  uploadToDisk.single('file'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    res.json({
      message: 'File uploaded successfully',
      filename: req.file.filename,
      path: req.file.path,
    });
  }
);

app.get('/api/uploads', authorizeRoles('admin', 'student'), (req, res) => {
  const filename = req.query.filename;
  if (!filename) {
    return res.status(400).json({ message: 'Filename is required' });
  }

  const filePath = path.join(__dirname, 'Downloads', filename);
  res.download(filePath, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      res.status(404).json({ message: 'File not found' });
    }
  });
});

app.listen(3000, () => {
  console.log(`Server running at http://localhost:3000`);
});
