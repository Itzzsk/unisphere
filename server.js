require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// 🔹 Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// 🔹 CORS Configuration
app.use(cors({
  origin: [
    'http://localhost:5000', // Local development
    'https://unisphere.onrender.com', // Deployed web app
    'https://res.cloudinary.com' // Cloudinary image uploads
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Allow authentication if needed
}));

// 🔹 Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 🔹 MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB Atlas');
  initializeAdmin(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
}).catch(err => console.error('❌ MongoDB connection error:', err));

// =========================================
// ✅ Schemas & Models
// =========================================
const postSchema = new mongoose.Schema({
  content: { type: String },
  imageUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  comments: [{ content: String, createdAt: { type: Date, default: Date.now } }],
  likes: { type: Number, default: 0 }
});
const Post = mongoose.model('Post', postSchema);

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const Admin = mongoose.model('Admin', adminSchema);

const backgroundSchema = new mongoose.Schema({
  image: Buffer,
  contentType: String,
  updatedAt: { type: Date, default: Date.now }
});
const Background = mongoose.model('Background', backgroundSchema);

const pollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ text: String, votes: { type: Number, default: 0 } }],
  createdAt: { type: Date, default: Date.now }
});
const Poll = mongoose.model("Poll", pollSchema);

// =========================================
// ✅ Helper Function: Initialize Admin
// =========================================
async function initializeAdmin(username, newPassword) {
  if (!username || !newPassword) {
    console.log("⚠️ Username and password are required.");
    return;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  let admin = await Admin.findOne({ username });

  if (admin) {
    admin.password = hashedPassword;
    await admin.save();
    console.log(`✅ Admin "${username}" password updated successfully.`);
  } else {
    admin = new Admin({ username, password: hashedPassword });
    await admin.save();
    console.log(`✅ Admin "${username}" created successfully.`);
  }
}

// =========================================
// ✅ Admin Login Route
// =========================================
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  res.json({ success: true, message: 'Login successful' });
});

// =========================================
// ✅ File Upload Configuration
// =========================================
const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static("uploads"));

// =========================================
// ✅ Background Image Upload & Fetch
// =========================================
app.post('/api/upload/background', upload.single('background'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  await Background.findOneAndUpdate(
    {},
    { image: req.file.buffer, contentType: req.file.mimetype, updatedAt: Date.now() },
    { upsert: true }
  );

  res.json({ message: "Background updated" });
});

app.get('/api/background', async (req, res) => {
  try {
    const background = await Background.findOne();
    if (!background) return res.status(404).json({ error: "No background found" });

    res.set('Content-Type', background.contentType);
    res.send(background.image);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch background" });
  }
});

// =========================================
// ✅ Post Upload, Fetch, Like & Comment
// =========================================
app.post('/api/upload/post', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    const dataURI = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataURI, { folder: "posts" });

    res.json({ imageUrl: result.secure_url });
  } catch (error) {
    res.status(500).json({ message: 'Image upload failed' });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { content, imageUrl } = req.body;
    if (!content && !imageUrl) return res.status(400).json({ message: 'Post requires text or image' });

    await new Post({ content, imageUrl }).save();
    res.status(201).json({ message: 'Post created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating post' });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    res.json(await Post.find().sort({ createdAt: -1 }));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/posts/:postId/like', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.likes += req.body.liked ? 1 : -1;
    await post.save();

    res.json({ likes: post.likes });
  } catch (error) {
    res.status(500).json({ message: "Failed to like post" });
  }
});

// =========================================
// ✅ Poll Routes
// =========================================
app.post("/api/polls/:pollId/vote", async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionIndex } = req.body;

    const poll = await Poll.findById(pollId);
    if (!poll || optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ message: "Invalid vote" });
    }

    poll.options[optionIndex].votes += 1;
    await poll.save();

    res.json({ message: "Vote recorded", poll });
  } catch (error) {
    res.status(500).json({ message: "Error voting" });
  }
});

// =========================================
// ✅ Server Start
// =========================================
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
