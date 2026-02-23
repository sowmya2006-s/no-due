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

// Helper to check faculty or admin role
const isFacultyOrAdmin = (req, res, next) => {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'FACULTY') {
        return res.status(403).json({ message: 'Access denied: Faculty or Admin required' });
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
        for (const rawDept of departments) {
            const deptName = String(rawDept.name).trim().toUpperCase();
            const d = await prisma.department.upsert({
                where: { name: deptName },
                update: {},
                create: { name: deptName }
            });

            for (const rawYr of rawDept.years) {
                const yearVal = Number(rawYr.year);
                const y = await prisma.year.upsert({
                    where: {
                        year_departmentId: { year: yearVal, departmentId: d.id }
                    },
                    update: {},
                    create: { year: yearVal, departmentId: d.id }
                });

                for (const rawSec of rawYr.sections) {
                    const sectionName = String(rawSec.section).trim().toUpperCase();
                    const s = await prisma.section.upsert({
                        where: {
                            section_yearId: { section: sectionName, yearId: y.id }
                        },
                        update: {},
                        create: { section: sectionName, yearId: y.id }
                    });

                    for (const rawSub of rawSec.subjects) {
                        const subName = String(rawSub.subject).trim();
                        const facultyId = String(rawSub.faculty_id || "").trim() || null;

                        await prisma.subject.upsert({
                            where: {
                                name_sectionId: { name: subName, sectionId: s.id }
                            },
                            update: {
                                facultyId: facultyId
                            },
                            create: {
                                name: subName,
                                sectionId: s.id,
                                facultyId: facultyId
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
        for (const rawS of students) {
            const studentId = String(rawS.student_id).trim().toUpperCase();
            const s = {
                student_id: studentId,
                password: rawS.password,
                department: String(rawS.department).trim().toUpperCase(),
                year: Number(rawS.year),
                section: String(rawS.section).trim().toUpperCase()
            };
            const hashedPassword = await bcrypt.hash(s.password || 'student123', 10);

            await prisma.$transaction(async (tx) => {
                const user = await tx.user.upsert({
                    where: { username: s.student_id },
                    update: {
                        password: hashedPassword
                    },
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
                        section: s.section,
                        userId: user.id
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
        for (const rawF of faculty) {
            const facultyId = String(rawF.faculty_id).trim().toUpperCase();
            const f = {
                faculty_id: facultyId,
                name: String(rawF.name).trim(),
                password: rawF.password
            };
            const hashedPassword = await bcrypt.hash(f.password || 'faculty123', 10);

            await prisma.$transaction(async (tx) => {
                const user = await tx.user.upsert({
                    where: { username: f.faculty_id },
                    update: {
                        password: hashedPassword
                    },
                    create: {
                        username: f.faculty_id,
                        password: hashedPassword,
                        role: 'FACULTY'
                    }
                });

                await tx.faculty.upsert({
                    where: { facultyId: f.faculty_id },
                    update: {
                        name: f.name,
                        userId: user.id
                    },
                    create: {
                        facultyId: f.faculty_id,
                        name: f.name,
                        userId: user.id
                    }
                });
            });
        }
        res.json({ message: `${faculty.length} faculty members uploaded successfully` });
    } catch (err) {
        res.status(400).json({ message: 'Error uploading faculty', error: err.message });
    }
});

const mapStructure = (departments) => {
    return departments.map(d => ({
        name: d.name,
        years: d.years.map(y => ({
            year: y.year,
            sections: y.sections.map(s => ({
                section: s.section,
                subjects: s.subjects.map(sub => ({
                    id: sub.id,
                    subject: sub.name,
                    faculty_id: sub.facultyId || ""
                }))
            }))
        }))
    }));
};

const mapStudent = (s) => ({
    student_id: s.studentId,
    name: s.name,
    department: s.department,
    year: s.year,
    section: s.section,
    password: '***' // Don't send passwords
});

const mapFaculty = (f) => ({
    faculty_id: f.facultyId,
    name: f.name,
    password: '***'
});

router.get('/profile', auth, async (req, res) => {
    try {
        if (req.user.role === 'STUDENT') {
            const student = await prisma.student.findUnique({
                where: { userId: req.user.id }
            });
            if (!student) return res.status(404).json({ message: 'Student profile not found' });
            res.json(mapStudent(student));
        } else if (req.user.role === 'FACULTY') {
            const faculty = await prisma.faculty.findUnique({
                where: { userId: req.user.id }
            });
            if (!faculty) return res.status(404).json({ message: 'Faculty profile not found' });
            res.json(mapFaculty(faculty));
        } else {
            res.status(400).json({ message: 'Not applicable for Admin' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error fetching profile', error: err.message });
    }
});

// Get All Students (Admin and Faculty)
router.get('/students', auth, isFacultyOrAdmin, async (req, res) => {
    try {
        const students = await prisma.student.findMany();
        res.json(students.map(mapStudent));
    } catch (err) {
        res.status(500).json({ message: 'Error fetching students', error: err.message });
    }
});

// Get All Faculty (All Auth Users)
router.get('/faculty', auth, async (req, res) => {
    try {
        const faculty = await prisma.faculty.findMany();
        res.json(faculty.map(mapFaculty));
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
        res.json(mapStructure(structure));
    } catch (err) {
        res.status(500).json({ message: 'Error fetching structure', error: err.message });
    }
});

// Granular Admin Operations

// Remove Academic Structure (All)
router.delete('/remove-structure', auth, isAdmin, async (req, res) => {
    try {
        await prisma.$transaction([
            prisma.noDueRecord.deleteMany(),
            prisma.subject.deleteMany(),
            prisma.section.deleteMany(),
            prisma.year.deleteMany(),
            prisma.department.deleteMany()
        ]);
        res.json({ message: 'Academic structure removed' });
    } catch (err) {
        res.status(500).json({ message: 'Removal failed', error: err.message });
    }
});

// Remove All Students
router.delete('/remove-students', auth, isAdmin, async (req, res) => {
    try {
        await prisma.$transaction([
            prisma.noDueRecord.deleteMany(),
            prisma.student.deleteMany(),
            prisma.user.deleteMany({ where: { role: 'STUDENT' } })
        ]);
        res.json({ message: 'All students removed' });
    } catch (err) {
        res.status(500).json({ message: 'Removal failed', error: err.message });
    }
});

// Remove All Faculty
router.delete('/remove-faculty-all', auth, isAdmin, async (req, res) => {
    try {
        await prisma.$transaction([
            prisma.noDueRecord.deleteMany(),
            prisma.faculty.deleteMany(),
            prisma.user.deleteMany({ where: { role: 'FACULTY' } })
        ]);
        res.json({ message: 'All faculty removed' });
    } catch (err) {
        res.status(500).json({ message: 'Removal failed', error: err.message });
    }
});

// Promote Students
router.post('/promote-students', auth, isAdmin, async (req, res) => {
    const { department, fromYear } = req.body;
    try {
        await prisma.student.updateMany({
            where: { department, year: fromYear },
            data: { year: fromYear + 1 }
        });
        res.json({ message: 'Students promoted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Promotion failed', error: err.message });
    }
});

// Update Student Section
router.patch('/update-student-section', auth, isAdmin, async (req, res) => {
    const { studentId, section } = req.body;
    const normalizedStudentId = String(studentId).trim().toUpperCase();
    try {
        await prisma.student.update({
            where: { studentId: normalizedStudentId },
            data: { section: String(section).trim().toUpperCase() }
        });
        res.json({ message: 'Section updated' });
    } catch (err) {
        res.status(500).json({ message: 'Update failed', error: err.message });
    }
});

// Reset Password
router.post('/reset-password', auth, isAdmin, async (req, res) => {
    const { username } = req.body;
    const normalizedUsername = String(username).trim().toUpperCase();
    try {
        const hashedPassword = await bcrypt.hash('reset123', 10);
        await prisma.user.update({
            where: { username: normalizedUsername },
            data: { password: hashedPassword }
        });
        res.json({ message: 'Password reset to reset123' });
    } catch (err) {
        res.status(500).json({ message: 'Reset failed', error: err.message });
    }
});

// Add Faculty
router.post('/add-faculty', auth, isAdmin, async (req, res) => {
    const { facultyId, name } = req.body;
    const normalizedFacultyId = String(facultyId).trim().toUpperCase();
    try {
        const hashedPassword = await bcrypt.hash('faculty123', 10);
        await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    username: normalizedFacultyId,
                    password: hashedPassword,
                    role: 'FACULTY'
                }
            });
            await tx.faculty.create({
                data: {
                    facultyId: normalizedFacultyId,
                    name,
                    userId: user.id
                }
            });
        });
        res.json({ message: 'Faculty added' });
    } catch (err) {
        res.status(500).json({ message: 'Add failed', error: err.message });
    }
});

// Remove Faculty
router.delete('/remove-faculty/:id', auth, isAdmin, async (req, res) => {
    const { id } = req.params;
    const normalizedFacultyId = String(id).trim().toUpperCase();
    try {
        const faculty = await prisma.faculty.findUnique({ where: { facultyId: normalizedFacultyId } });
        if (!faculty) return res.status(404).json({ message: 'Faculty not found' });

        await prisma.$transaction([
            prisma.noDueRecord.deleteMany({ where: { facultyId: faculty.id } }),
            prisma.faculty.delete({ where: { facultyId: normalizedFacultyId } }),
            prisma.user.delete({ where: { id: faculty.userId } })
        ]);
        res.json({ message: 'Faculty removed' });
    } catch (err) {
        res.status(500).json({ message: 'Removal failed', error: err.message });
    }
});

// Add/Update Subject
router.post('/add-subject', auth, isAdmin, async (req, res) => {
    const { department, year, section, subject, facultyId } = req.body;
    try {
        const dept = await prisma.department.findUnique({ where: { name: department } });
        if (!dept) return res.status(404).json({ message: 'Department not found' });

        const yr = await prisma.year.findFirst({ where: { year, departmentId: dept.id } });
        if (!yr) return res.status(404).json({ message: 'Year not found' });

        const sec = await prisma.section.findFirst({ where: { section, yearId: yr.id } });
        if (!sec) return res.status(404).json({ message: 'Section not found' });

        await prisma.subject.create({
            data: {
                name: subject,
                sectionId: sec.id,
                facultyId: facultyId || null
            }
        });
        res.json({ message: 'Subject added' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to add subject', error: err.message });
    }
});

// Change Subject Faculty
router.patch('/change-faculty', auth, isAdmin, async (req, res) => {
    const { subjectId, facultyId } = req.body;
    try {
        await prisma.subject.update({
            where: { id: subjectId },
            data: { facultyId }
        });
        res.json({ message: 'Faculty reassigned' });
    } catch (err) {
        res.status(500).json({ message: 'Reassignment failed', error: err.message });
    }
});

module.exports = router;
