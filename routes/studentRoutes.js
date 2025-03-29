const express = require('express');
const router = express.Router();
const Student = require('../models/student');

// Get all students
router.get('/students', async (req, res) => {
    try {
        const students = await Student.find({}, 'studentID name subjects'); // Fetch only necessary fields
        res.json(students);
    } catch (err) {
        console.error("Error fetching students:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get student attendance by ID
router.get("/attendance/:studentID", async (req, res) => {
    try {
        const studentID = req.params.studentID.trim();
        console.log("Received studentID:", studentID);

        const student = await Student.findOne({ studentID });

        if (!student) {
            console.log("Student not found!");
            return res.status(404).json({ message: "Student not found" });
        }

        console.log("Student data found:", student);
        res.json(student);
    } catch (error) {
        console.error("Error fetching attendance:", error);
        res.status(500).json({ message: "Server error" });
    }
});


module.exports = router;

