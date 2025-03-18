require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// 🔹 Serve static files
app.use(express.static('public'));

// 🔹 CORS Configuration
app.use(cors({
  origin: ['http://localhost:5000','https://res.cloudinary.com','https://unisphere.onrender.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 🔹 Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 🔹 Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🔹 MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB Atlas');
}).catch(err => console.error('❌ MongoDB connection error:', err));

// =========================================
// ✅ Schemas & Models
// =========================================
const postSchema = new mongoose.Schema({
  content: { type: String },
  imageUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  comments: [{
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  likes: { type: Number, default: 0 }
});
const Post = mongoose.model('Post', postSchema);

// =========================================
// ✅ Image Upload Route (Multer + Cloudinary)
// =========================================

app.post('/api/upload/post', upload.single('image'), async (req, res) => {
  try {
      if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;

      const result = await cloudinary.uploader.upload(dataURI, {
          folder: "posts",
          resource_type: "auto"
      });

      res.json({ imageUrl: result.secure_url });
  } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ message: 'Image upload failed' });
  }
});

// =========================================
// ✅ Fetch All Posts with Comments
// =========================================
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================
// ✅ Add a New Post
// =========================================
app.post('/api/posts', async (req, res) => {
  try {
    const { content, imageUrl } = req.body;
    if (!content && !imageUrl) return res.status(400).json({ message: 'Post requires text or image' });

    const newPost = new Post({ content, imageUrl });
    await newPost.save();
    res.status(201).json({ message: 'Post created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating post' });
  }
});

// =========================================
// ✅ Like a Post
// =========================================
app.post('/api/posts/:postId/like', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.likes += req.body.liked ? 1 : -1;
    await post.save();
    res.json({ likes: post.likes });
  } catch (error) {
    res.status(500).json({ message: 'Failed to like post' });
  }
});

// =========================================
// ✅ Add a Comment to a Post
// =========================================
app.post('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Comment cannot be empty' });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.comments.push({ content, createdAt: new Date() });
    await post.save();
    res.json({ message: 'Comment added successfully', comments: post.comments });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

// =========================================
// ✅ Fetch Comments for a Post
// =========================================
app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    res.json(post.comments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
});

// =========================================
// ✅ Server Start
// =========================================
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

