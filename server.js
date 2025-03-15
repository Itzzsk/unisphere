require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const cors = require('cors');  // ✅ Added CORS
const app = express();

// ✅ Enable CORS for all requests (WebView compatibility)
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Admin login page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '/admin.html'));
});

// ✅ Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ Connected to MongoDB Atlas');
  initializeAdmin(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
}).catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Schemas & Models
const postSchema = new mongoose.Schema({
  content: String,
  imageUrl: String,
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

// ✅ Initialize Admin
async function initializeAdmin(username, password) {
  if (!username || !password) {
    console.log("⚠️ Username and password are required.");
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  let admin = await Admin.findOne({ username });

  if (admin) {
    admin.password = hashedPassword;
    await admin.save();
    console.log(`✅ Admin "${username}" password updated.`);
  } else {
    admin = new Admin({ username, password: hashedPassword });
    await admin.save();
    console.log(`✅ Admin "${username}" created.`);
  }
}

// ✅ Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Upload Post Image (with Cloudinary)
app.post('/api/upload/post', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    const dataURI = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataURI, { folder: "posts" });

    res.json({ imageUrl: result.secure_url });
  } catch (error) {
    console.error('❌ Image upload failed:', error);
    res.status(500).json({ message: 'Image upload failed' });
  }
});

// ✅ Create Post (Text/Image)
app.post('/api/posts', async (req, res) => {
  try {
    const { content, imageUrl } = req.body;
    if (!content && !imageUrl) return res.status(400).json({ message: 'Post requires text or image' });

    await new Post({ content, imageUrl }).save();
    res.status(201).json({ message: '✅ Post created successfully' });
  } catch (error) {
    console.error('❌ Error creating post:', error);
    res.status(500).json({ message: 'Error creating post' });
  }
});

// ✅ Fetch Posts
app.get('/api/posts', async (req, res) => {
  try {
    res.json(await Post.find().sort({ createdAt: -1 }));
  } catch (error) {
    console.error('❌ Error fetching posts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Like a Post
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
    console.error('❌ Error liking post:', error);
    res.status(500).json({ message: "Failed to like post" });
  }
});

// ✅ Add Comment
app.post('/api/posts/:postId/comments', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const newComment = { content: req.body.content };
    post.comments.push(newComment);
    await post.save();

    res.json(newComment);
  } catch (error) {
    console.error('❌ Error submitting comment:', error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Fetch Comments
app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    res.json(post.comments);
  } catch (error) {
    console.error('❌ Error fetching comments:', error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Poll Schema
const pollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ text: String, votes: { type: Number, default: 0 } }],
  createdAt: { type: Date, default: Date.now }
});
const Poll = mongoose.model("Poll", pollSchema);

// ✅ Vote on Poll
app.post("/api/polls/:pollId/vote", async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionIndex } = req.body;
    
    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ message: "Poll not found" });

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ message: "Invalid option index" });
    }

    poll.options[optionIndex].votes += 1;
    await poll.save();
    
    res.json({ message: "✅ Vote recorded", poll });
  } catch (error) {
    console.error('❌ Error voting:', error);
    res.status(500).json({ message: "Error voting" });
  }
});

// ✅ Get Polls
app.get("/api/polls", async (req, res) => {
  try {
    const polls = await Poll.find().sort({ createdAt: -1 });
    res.json(polls);
  } catch (error) {
    console.error('❌ Error fetching polls:', error);
    res.status(500).json({ message: "Error fetching polls" });
  }
});

// ✅ Serve Homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// ✅ Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

