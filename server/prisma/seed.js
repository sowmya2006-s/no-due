const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    // Create admin user
    const existingAdmin = await prisma.user.findFirst({
        where: { username: 'ADMIN', role: 'ADMIN' }
    });

    if (!existingAdmin) {
        // Also check if lowercase exists and delete it to prevent conflict
        const oldAdmin = await prisma.user.findFirst({ where: { username: 'admin' } });
        if (oldAdmin) await prisma.user.delete({ where: { id: oldAdmin.id } });

        const hashedPassword = await bcrypt.hash('admin123', 10);
        await prisma.user.create({
            data: {
                username: 'ADMIN',
                password: hashedPassword,
                role: 'ADMIN',
            }
        });
        console.log('Admin user created (ADMIN / admin123)');
    } else {
        console.log('Admin user already exists');
    }

    // Load test data
    try {
        // Load faculty FIRST
        const facultyPath = path.join(__dirname, '../../test_faculty.json');
        if (fs.existsSync(facultyPath)) {
            const facultyData = JSON.parse(fs.readFileSync(facultyPath, 'utf8'));
            console.log('Loading faculty...');

            for (const rawF of facultyData) {
                const f = {
                    faculty_id: String(rawF.faculty_id).trim(),
                    name: String(rawF.name).trim(),
                    password: rawF.password || 'faculty123'
                };
                const hashedPassword = await bcrypt.hash(f.password, 10);

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
            console.log('Faculty loaded');
        }

        // Load academic structure SECOND
        const academicPath = path.join(__dirname, '../../test_academic.json');
        if (fs.existsSync(academicPath)) {
            const academicData = JSON.parse(fs.readFileSync(academicPath, 'utf8'));
            console.log('Loading academic structure...');

            for (const rawDept of academicData.departments) {
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
            console.log('Academic structure loaded');
        }

        // Load students LAST
        const studentsPath = path.join(__dirname, '../../test_students.json');
        if (fs.existsSync(studentsPath)) {
            const studentsData = JSON.parse(fs.readFileSync(studentsPath, 'utf8'));
            console.log('Loading students...');

            for (const rawS of studentsData) {
                const s = {
                    student_id: String(rawS.student_id).trim(),
                    password: rawS.password || 'student123',
                    department: String(rawS.department).trim().toUpperCase(),
                    year: Number(rawS.year),
                    section: String(rawS.section).trim().toUpperCase()
                };
                const hashedPassword = await bcrypt.hash(s.password, 10);

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

                    const student = await tx.student.upsert({
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

                    // Create NoDue records for all subjects this student should have
                    const dept = await tx.department.findUnique({
                        where: { name: s.department },
                        include: {
                            years: {
                                where: { year: s.year },
                                include: {
                                    sections: {
                                        where: { section: s.section },
                                        include: { subjects: true }
                                    }
                                }
                            }
                        }
                    });

                    if (dept && dept.years.length > 0 && dept.years[0].sections.length > 0) {
                        const subjects = dept.years[0].sections[0].subjects;
                        for (const subject of subjects) {
                            if (subject.facultyId) {
                                const faculty = await tx.faculty.findUnique({
                                    where: { facultyId: subject.facultyId }
                                });
                                if (faculty) {
                                    await tx.noDueRecord.upsert({
                                        where: {
                                            studentId_subject: {
                                                studentId: student.id,
                                                subject: subject.name
                                            }
                                        },
                                        update: {},
                                        create: {
                                            studentId: student.id,
                                            facultyId: faculty.id,
                                            subject: subject.name,
                                            status: 'pending'
                                        }
                                    });
                                }
                            }
                        }
                    }
                });
            }
            console.log('Students loaded with NoDue records');
        }

    } catch (error) {
        console.error('Error loading test data:', error);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
