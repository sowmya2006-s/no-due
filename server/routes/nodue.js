const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Faculty Check
const isFaculty = (req, res, next) => {
    if (req.user.role !== 'FACULTY' && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Access denied: Faculty only' });
    }
    next();
};

// Set No Due Status
router.post('/set-status', auth, isFaculty, async (req, res) => {
    const { studentId, subjectName, status, message } = req.body;
    const normalizedStudentId = String(studentId).trim().toUpperCase();

    try {
        const student = await prisma.student.findUnique({ where: { studentId: normalizedStudentId } });
        const subject = await prisma.subject.findFirst({ where: { name: subjectName } });

        if (!student || !subject) {
            return res.status(404).json({ message: 'Student or Subject not found' });
        }

        const currentFaculty = await prisma.faculty.findUnique({ where: { facultyId: req.user.username } });
        if (!currentFaculty) {
            return res.status(403).json({ message: 'Faculty profile not found' });
        }

        const record = await prisma.noDueRecord.upsert({
            where: {
                studentId_subject: {
                    studentId: student.id,
                    subject: subjectName
                }
            },
            update: {
                status,
                message,
                facultyId: currentFaculty.id
            },
            create: {
                studentId: student.id,
                facultyId: currentFaculty.id,
                subject: subjectName,
                status,
                message
            }
        });

        res.json(record);
    } catch (err) {
        res.status(500).json({ message: 'Error updating status', error: err.message });
    }
});

// Update Message Only
router.post('/update-message', auth, isFaculty, async (req, res) => {
    const { studentId, subjectName, message } = req.body;
    const normalizedStudentId = String(studentId).trim().toUpperCase();

    try {
        const student = await prisma.student.findUnique({ where: { studentId: normalizedStudentId } });
        const subject = await prisma.subject.findFirst({ where: { name: subjectName } });

        if (!student || !subject) {
            return res.status(404).json({ message: 'Student or Subject not found' });
        }

        const record = await prisma.noDueRecord.update({
            where: {
                studentId_subject: {
                    studentId: student.id,
                    subject: subjectName
                }
            },
            data: { message }
        });

        res.json(record);
    } catch (err) {
        res.status(500).json({ message: 'Error updating message', error: err.message });
    }
});

// Get all records (For Admin and Faculty Dashboards)
router.get('/all-records', auth, isFaculty, async (req, res) => {
    try {
        const records = await prisma.noDueRecord.findMany({
            include: { student: true, faculty: true }
        });
        // Map to frontend expectation
        const mapped = records.map(r => ({
            student_id: r.student.studentId,
            faculty_id: r.faculty.facultyId,
            subject: r.subject,
            status: r.status,
            message: r.message
        }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching records', error: err.message });
    }
});

// Get records for a specific student (For Student Dashboard)
router.get('/student-records', auth, async (req, res) => {
    try {
        const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
        if (!student) return res.status(404).json({ message: 'Student profile not found' });

        const records = await prisma.noDueRecord.findMany({
            where: { studentId: student.id }
        });
        // Map to frontend
        const mapped = records.map(r => ({
            student_id: student.studentId,
            faculty_id: "system",
            subject: r.subject,
            status: r.status,
            message: r.message
        }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching records', error: err.message });
    }
});

module.exports = router;
