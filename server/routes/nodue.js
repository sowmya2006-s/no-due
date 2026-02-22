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

    try {
        const student = await prisma.student.findUnique({ where: { studentId } });
        const subject = await prisma.subject.findFirst({ where: { name: subjectName } });

        if (!student || !subject) {
            return res.status(404).json({ message: 'Student or Subject not found' });
        }

        const record = await prisma.noDueRecord.upsert({
            where: {
                studentId_subjectId: {
                    studentId: student.id,
                    subjectId: subject.id
                }
            },
            update: { status, message },
            create: {
                studentId: student.id,
                subjectId: subject.id,
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

    try {
        const student = await prisma.student.findUnique({ where: { studentId } });
        const subject = await prisma.subject.findFirst({ where: { name: subjectName } });

        if (!student || !subject) {
            return res.status(404).json({ message: 'Student or Subject not found' });
        }

        const record = await prisma.noDueRecord.update({
            where: {
                studentId_subjectId: {
                    studentId: student.id,
                    subjectId: subject.id
                }
            },
            data: { message }
        });

        res.json(record);
    } catch (err) {
        res.status(500).json({ message: 'Error updating message', error: err.message });
    }
});

// Get records for a specific student (For Student Dashboard)
router.get('/student-records', auth, async (req, res) => {
    try {
        const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
        if (!student) return res.status(404).json({ message: 'Student profile not found' });

        const records = await prisma.noDueRecord.findMany({
            where: { studentId: student.id },
            include: { subject: true }
        });
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching records', error: err.message });
    }
});

module.exports = router;
