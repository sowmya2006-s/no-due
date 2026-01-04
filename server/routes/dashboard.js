const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ADMIN: Global Stats
router.get('/admin/stats', auth, authorize('ADMIN'), async (req, res) => {
    try {
        const totalStudents = await prisma.student.count();
        const totalFaculty = await prisma.faculty.count();
        const departments = await prisma.department.count();
        const approvedDues = await prisma.noDueRecord.count({ where: { status: 'APPROVED' } });
        const totalDues = await prisma.noDueRecord.count();

        const clearanceRate = totalDues > 0 ? `${Math.round((approvedDues / totalDues) * 100)}%` : '0%';

        res.json({
            totalStudents,
            totalFaculty,
            departments,
            clearanceRate
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// STUDENT DASHBOARD
router.get('/student', auth, authorize('STUDENT'), async (req, res) => {
    try {
        const student = await prisma.student.findUnique({
            where: { userId: req.user.userId },
            include: {
                user: true,
                class: { include: { department: true } },
                noDueRecords: { include: { subject: true } },
                feeStatus: true
            }
        });

        if (!student) return res.status(404).json({ error: 'Student not found' });

        res.json(student);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// FACULTY DASHBOARD: Show classes and subjects handled
router.get('/faculty', auth, authorize('FACULTY'), async (req, res) => {
    try {
        const faculty = await prisma.faculty.findUnique({
            where: { userId: req.user.userId },
            include: {
                user: true,
                department: true,
                assignments: {
                    include: {
                        class: { include: { department: true } },
                        subject: true
                    }
                },
                advisorClass: {
                    include: { department: true }
                }
            }
        });

        res.json(faculty);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// FACULTY: Get students in a specific class for a specific subject
router.get('/faculty/students', auth, authorize('FACULTY'), async (req, res) => {
    const { classId, subjectId } = req.query;
    try {
        const records = await prisma.noDueRecord.findMany({
            where: {
                subjectId: parseInt(subjectId),
                student: { classId: parseInt(classId) }
            },
            include: { student: { include: { user: true } } }
        });
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADVISOR: Get students and fee status for their class
router.get('/advisor/students', auth, authorize('FACULTY'), async (req, res) => {
    try {
        const faculty = await prisma.faculty.findUnique({
            where: { userId: req.user.userId },
            include: { advisorClass: true }
        });

        if (!faculty.advisorClass) return res.status(403).json({ error: 'Not an advisor' });

        const students = await prisma.student.findMany({
            where: { classId: faculty.advisorClass.id },
            include: { user: true, feeStatus: true }
        });

        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATES
router.post('/update-no-due', auth, authorize('FACULTY'), async (req, res) => {
    const { recordId, status } = req.body;
    try {
        const record = await prisma.noDueRecord.update({
            where: { id: recordId },
            data: { status, approvedBy: req.user.userId }
        });
        res.json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/update-fees', auth, authorize('FACULTY'), async (req, res) => {
    const { studentId, status } = req.body;
    try {
        const fee = await prisma.feeStatus.update({
            where: { studentId },
            data: { status }
        });
        res.json(fee);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
