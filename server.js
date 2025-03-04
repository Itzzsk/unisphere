require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const app = express();
app.use(express.static(path.join(__dirname, 'public')));


// Admin login route (if it's outside 'public')
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '/admin.html'));
});

const PORT = process.env.PORT || 5000;

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB Atlas');
  initializeAdmin();
})
.catch(err => console.error('MongoDB connection error:', err));

// Schemas & Models
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

// Initialize Admin
async function initializeAdmin() {
  const username = 'itzzsk'; // Set the admin username you want
  const newPassword = 'saymyname123'; // Change this to the new password
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const result = await Admin.findOneAndUpdate(
    { username }, // Find admin with the same username
    { password: hashedPassword }, // Update password
    { upsert: false, new: true } // Only update, don’t insert a duplicate
  );

  if (result) {
    console.log("✅ Admin password updated successfully:", result);
  } else {
    console.log("⚠️ Admin with this username does not exist.");
  }
}


// Multer Storage

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  res.json({ success: true, message: 'Login successful' });
});



// Configure multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true }); // Create uploads folder if not exist
}
app.use("/uploads", express.static("uploads"));

const BackgroundSchema = new mongoose.Schema({
  image: Buffer,
  contentType: String,
  updatedAt: { type: Date, default: Date.now }
});
const Background = mongoose.model('Background', BackgroundSchema);

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload Background
app.post('/api/upload/background', upload.single('background'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  await Background.findOneAndUpdate(
    {},
    {
      image: req.file.buffer,
      contentType: req.file.mimetype,
      updatedAt: Date.now()
    },
    { upsert: true }
  );

  res.json({ message: "Background updated" });
});

// Fetch Background
app.get('/api/background', async (req, res) => {
  try {
    const background = await Background.findOne();
    if (!background) return res.status(404).json({ error: "No background found" });

    res.set('Content-Type', background.contentType);
    res.send(background.image);
  } catch (err) {
    console.error("Failed to fetch background:", err);
    res.status(500).json({ error: "Failed to fetch background" });
  }
});


// ✅ Serve Static Files

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
    const { postId } = req.params;
    const { liked } = req.body;
    const post = await Post.findById(postId);

    if (!post) return res.status(404).json({ message: "Post not found" });

    post.likes = liked ? post.likes + 1 : Math.max(0, post.likes - 1);
    await post.save();

    res.json({ likes: post.likes, liked });
  } catch (error) {
    res.status(500).json({ message: "Failed to like post" });
  }
});

app.post('/api/posts/:postId/comments', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const newComment = { content: req.body.content };
    post.comments.push(newComment);
    await post.save();

    res.json(newComment);
  } catch (error) {
    console.error("Error submitting comment:", error);
    res.status(500).json({ message: "Server error" });
  }
});
app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    res.json(post.comments); // send the comments array
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔥

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
