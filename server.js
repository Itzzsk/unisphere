require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const streamifier = require('streamifier');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const studentRoutes = require("./routes/studentRoutes");
const customResponses = require("./responses"); 
const Marks = require('./models/marks');

// 🔹 Serve static files
app.use(express.static('public'))


// 🔹 CORS Configuration
app.use(cors({
  origin: [
    'http://localhost:5000', // Backend itself (not needed in most cases) // Your deployed frontend
    'https://res.cloudinary.com' // If making requests to Cloudinary from the backend
  ],
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
// 🔹 MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI_UNISPHERE, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ MongoDB (Unisphere) Connected Successfully");

    // Connect to Attendance Database
    global.attendanceDB = mongoose.createConnection(process.env.MONGO_URI_ATTENDANCE, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ MongoDB (Attendance) Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};
connectDB();
// ✅ Middleware
app.use(express.json()); // Allow JSON request body
// Routes
app.use("/api/students", studentRoutes);

// Default Route
app.get('/', (req, res) => {
    res.send('✅ Attendance Management API is running');
});
+
// Handle Undefined Routes
 
// =========================================
// ✅ Admin Login System
// =========================================
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return res.json({ success: true });
  } else {
    return res.status(401).json({ success: false });
  }
});

const BackgroundSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});
const Background = mongoose.model("Background", BackgroundSchema);

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
app.get("/api/background", async (req, res) => {
  try {
    const background = await Background.findOne();  // Ensure 'Background' is correct
    if (!background) {
      return res.status(404).json({ error: "No background image found" });
    }
    res.status(200).json({ imageUrl: background.imageUrl });
  } catch (error) {
    console.error("❌ Failed to fetch background:", error.message);
    res.status(500).json({ error: "Failed to fetch background" });
  }
});



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
// ✅ Add a New Post (Admin Only)
// =========================================
app.post('/api/posts', async (req, res) => {
  try {
    const { content, imageUrl } = req.body;
    if (!content && !imageUrl) {
      return res.status(400).json({ message: 'Post requires text or image' });
    }

    const newPost = new Post({ content, imageUrl });
    await newPost.save();
    
    res.status(201).json({ message: 'Post created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating post' });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    
    if (!posts || posts.length === 0) {
      return res.status(404).json({ message: "No posts found" });
    }
    
    res.json(posts);
  } catch (error) {
    console.error("❌ Error fetching posts:", error);
    res.status(500).json({ message: "Server error" });
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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Ensure it's stored correctly
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const lowerCaseMessage = message.toLowerCase().trim();

    // ✅ Check if message exists in customResponses (case-insensitive)
    if (customResponses[lowerCaseMessage]) {
      return res.json({ reply: `UniAI: ${customResponses[lowerCaseMessage]}` });
    }

    // ✅ Otherwise, send request to Google Gemini API
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: message }] }] },
      { headers: { "Content-Type": "application/json" } }
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
    return res.json({ reply: `UniAI: ${reply}` });

  } catch (error) {
    console.error("🔥 UniAI API Error:", error.response?.data || error.message);

    if (!res.headersSent) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
  
});


app.get('/api/marks/:reg_no', async (req, res) => {
  try {
    const reg_no = req.params.reg_no;
    const marks = await Marks.find({ reg_no });

    if (marks.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(marks);
  } catch (error) {
    console.error("❌ Error fetching student marks:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// =========================================
// ✅ Serve Frontend
// =========================================
app.use(express.static("public"));
app.get("/", (req, res) => res.sendFile(__dirname + "/public/index.html"));

// =========================================
// ✅ Handle 404 Errors
// =========================================
app.use((req, res) => res.status(404).json({ message: "❌ Route Not Found" }));

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
