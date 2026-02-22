const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Helper to check admin role
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Access denied: Admin only' });
    }
    next();
};

// Reset All Data (preserving admins)
router.post('/reset', auth, isAdmin, async (req, res) => {
    try {
        await prisma.$transaction([
            prisma.noDueRecord.deleteMany(),
            prisma.subject.deleteMany(),
            prisma.section.deleteMany(),
            prisma.year.deleteMany(),
            prisma.department.deleteMany(),
            prisma.student.deleteMany(),
            prisma.faculty.deleteMany(),
            prisma.user.deleteMany({
                where: { role: { not: 'ADMIN' } }
            })
        ]);
        res.json({ message: 'All academic data has been reset' });
    } catch (err) {
        res.status(500).json({ message: 'Error resetting data', error: err.message });
    }
});

// Upload Academic Structure
router.post('/upload-structure', auth, isAdmin, async (req, res) => {
    const { departments } = req.body;

    try {
        for (const dept of departments) {
            const d = await prisma.department.upsert({
                where: { name: dept.name },
                update: {},
                create: { name: dept.name }
            });

            for (const yr of dept.years) {
                const y = await prisma.year.upsert({
                    where: {
                        year_departmentId: { year: yr.year, departmentId: d.id }
                    },
                    update: {},
                    create: { year: yr.year, departmentId: d.id }
                });

                for (const sec of yr.sections) {
                    const s = await prisma.section.upsert({
                        where: {
                            section_yearId: { section: sec.section, yearId: y.id }
                        },
                        update: {},
                        create: { section: sec.section, yearId: y.id }
                    });

                    for (const sub of sec.subjects) {
                        await prisma.subject.upsert({
                            where: {
                                name_sectionId: { name: sub.subject, sectionId: s.id }
                            },
                            update: {
                                faculty: sub.faculty_id ? { connect: { facultyId: sub.faculty_id } } : undefined
                            },
                            create: {
                                name: sub.subject,
                                sectionId: s.id,
                                faculty: sub.faculty_id ? { connect: { facultyId: sub.faculty_id } } : undefined
                            }
                        });
                    }
                }
            }
        }
        res.json({ message: 'Academic structure uploaded successfully' });
    } catch (err) {
        res.status(400).json({ message: 'Error uploading structure', error: err.message });
    }
});

// Upload Students
router.post('/upload-students', auth, isAdmin, async (req, res) => {
    const { students } = req.body;

    try {
        for (const s of students) {
            const hashedPassword = await bcrypt.hash(s.password || 'student123', 10);

            await prisma.$transaction(async (tx) => {
                const user = await tx.user.upsert({
                    where: { username: s.student_id },
                    update: {},
                    create: {
                        username: s.student_id,
                        password: hashedPassword,
                        role: 'STUDENT'
                    }
                });

                await tx.student.upsert({
                    where: { studentId: s.student_id },
                    update: {
                        department: s.department,
                        year: s.year,
                        section: s.section
                    },
                    create: {
                        studentId: s.student_id,
                        userId: user.id,
                        department: s.department,
                        year: s.year,
                        section: s.section
                    }
                });
            });
        }
        res.json({ message: `${students.length} students uploaded successfully` });
    } catch (err) {
        res.status(400).json({ message: 'Error uploading students', error: err.message });
    }
});

// Upload Faculty
router.post('/upload-faculty', auth, isAdmin, async (req, res) => {
    const { faculty } = req.body;

    try {
        for (const f of faculty) {
            const hashedPassword = await bcrypt.hash(f.password || 'faculty123', 10);

            await prisma.$transaction(async (tx) => {
                const user = await tx.user.upsert({
                    where: { username: f.faculty_id },
                    update: {},
                    create: {
                        username: f.faculty_id,
                        password: hashedPassword,
                        role: 'FACULTY'
                    }
                });

                await tx.faculty.upsert({
                    where: { facultyId: f.faculty_id },
                    update: { name: f.name },
                    create: {
                        facultyId: f.faculty_id,
                        userId: user.id,
                        name: f.name
                    }
                });
            });
        }
        res.json({ message: `${faculty.length} faculty members uploaded successfully` });
    } catch (err) {
        res.status(400).json({ message: 'Error uploading faculty', error: err.message });
    }
});

// Get Academic Structure
// Get Profile (for Students and Faculty)
router.get('/profile', auth, async (req, res) => {
    try {
        if (req.user.role === 'STUDENT') {
            const student = await prisma.student.findUnique({
                where: { userId: req.user.id },
                include: { user: true }
            });
            res.json(student);
        } else if (req.user.role === 'FACULTY') {
            const faculty = await prisma.faculty.findUnique({
                where: { userId: req.user.id },
                include: { subjects: true }
            });
            res.json(faculty);
        } else {
            res.status(400).json({ message: 'Not applicable for Admin' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error fetching profile', error: err.message });
    }
});

// Get All Students (Admin only)
router.get('/students', auth, isAdmin, async (req, res) => {
    try {
        const students = await prisma.student.findMany();
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching students', error: err.message });
    }
});

// Get All Faculty (Admin only)
router.get('/faculty', auth, isAdmin, async (req, res) => {
    try {
        const faculty = await prisma.faculty.findMany();
        res.json(faculty);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching faculty', error: err.message });
    }
});

router.get('/structure', auth, async (req, res) => {
    try {
        const structure = await prisma.department.findMany({
            include: {
                years: {
                    include: {
                        sections: {
                            include: {
                                subjects: true
                            }
                        }
                    }
                }
            }
        });
        res.json(structure);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching structure', error: err.message });
    }
});

module.exports = router;
