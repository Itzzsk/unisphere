const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema({
    date: { type: Date, required: true, default: Date.now },
    subject: { type: String, required: true, trim: true },
    presentStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }]
}, { timestamps: true });

const Attendance = mongoose.model("Attendance", AttendanceSchema);
module.exports = Attendance; // ✅ Correct Export
