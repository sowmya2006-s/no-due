const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Seeding...');

  // 0. Cleanup
  await prisma.noDueRecord.deleteMany();
  await prisma.feeStatus.deleteMany();
  await prisma.facultyAssignment.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Departments
  const deptNames = ["AIML", "AIDS", "CSE", "CSBS", "ECE", "MECH", "RA", "IT", "CYBER"];
  const depts = {};

  for (const name of deptNames) {
    depts[name] = await prisma.department.create({ data: { name } });
    console.log(`Created Dept: ${name}`);
  }

  // 2. Create Classes & Sections
  // AIDS, CSE, ECE -> Sections A & B
  // Others -> Section A only
  const classes = [];

  for (const deptName of deptNames) {
    const years = [1, 2, 3, 4];
    const sections = ["A"];
    if (["AIDS", "CSE", "ECE"].includes(deptName)) sections.push("B");

    for (const year of years) {
      for (const section of sections) {
        const cls = await prisma.class.create({
          data: {
            year,
            section,
            departmentId: depts[deptName].id
          }
        });
        classes.push({ ...cls, deptName }); // Store for later
      }
    }
  }
  console.log(`Created ${classes.length} Classes.`);

  // 3. Create Admin
  await prisma.user.create({
    data: {
      email: 'admin@college.edu',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'ADMIN'
    }
  });
  console.log('Created Admin: admin@college.edu');

  // 4. Create Subjects & Faculties
  // Strategy: For each Dept, create 5 "Academic" subjects + Lab + Library
  // Create Faculties and assign them.

  for (const deptName of deptNames) {
    const deptId = depts[deptName].id;

    // Create Subjects
    const subjectsData = [
      { name: `${deptName} Core 1`, type: 'THEORY' },
      { name: `${deptName} Core 2`, type: 'THEORY' },
      { name: `${deptName} Lab`, type: 'LAB' },
      { name: 'Library', type: 'LIBRARY' },
      { name: 'Innovation', type: 'INNOVATION' }
    ];

    const subjects = [];
    for (const sub of subjectsData) {
      const s = await prisma.subject.create({
        data: { ...sub, departmentId: deptId }
      });
      subjects.push(s);
    }

    // Track assigned advisors to avoid unique constraint violations
    const assignedAdvisorIds = new Set();

    // Create 3 Faculties per Dept
    for (let i = 1; i <= 3; i++) {
      const fEmail = `faculty.${deptName.toLowerCase()}${i}@college.edu`;
      const fUser = await prisma.user.create({
        data: {
          email: fEmail,
          password: hashedPassword,
          name: `Prof. ${deptName} ${i}`,
          role: 'FACULTY'
        }
      });

      const faculty = await prisma.faculty.create({
        data: {
          userId: fUser.id,
          departmentId: deptId
        }
      });

      // Assignments: Distribute subjects among these faculties for THIS dept's classes
      const deptClasses = classes.filter(c => c.departmentId === deptId);

      for (const cls of deptClasses) {
        // Check if class already has an advisor
        const clsData = await prisma.class.findUnique({
          where: { id: cls.id },
          select: { advisorId: true }
        });

        // If class has no advisor AND this faculty isn't an advisor yet, assign them
        if (!clsData.advisorId && !assignedAdvisorIds.has(faculty.id)) {
          if (Math.random() > 0.5) {
            await prisma.class.update({
              where: { id: cls.id },
              data: { advisorId: faculty.id }
            });
            assignedAdvisorIds.add(faculty.id);
          }
        }

        // Subject Assignment
        const subjectToAssign = subjects[i % subjects.length];
        await prisma.facultyAssignment.create({
          data: {
            facultyId: faculty.id,
            subjectId: subjectToAssign.id,
            classId: cls.id
          }
        });
      }
    }
  }

  console.log('Created Faculties & Assignments.');

  // 5. Create Students (5 per class to keep it fast, NOT 65 for seed speed, but code scales)
  for (const cls of classes) {
    for (let i = 1; i <= 5; i++) {
      const sEmail = `student.${cls.deptName.toLowerCase()}${cls.year}${cls.section}${i}@college.edu`;
      const sUser = await prisma.user.create({
        data: {
          email: sEmail,
          password: hashedPassword,
          name: `Student ${cls.deptName} ${i}`,
          role: 'STUDENT'
        }
      });

      const student = await prisma.student.create({
        data: {
          userId: sUser.id,
          rollNumber: `${cls.deptName}-${cls.year}-${cls.section}-${i}`,
          classId: cls.id
        }
      });

      // Initialize NoDue Records for all subjects in this dept
      const deptSubjects = await prisma.subject.findMany({ where: { departmentId: cls.departmentId } });
      for (const sub of deptSubjects) {
        await prisma.noDueRecord.create({
          data: {
            studentId: student.id,
            subjectId: sub.id,
            status: 'PENDING'
          }
        });
      }

      // Initialize Fee Status
      await prisma.feeStatus.create({
        data: {
          studentId: student.id,
          status: 'PENDING'
        }
      });
    }
  }
  console.log('Created Students & NoDue Records.');
  console.log('✅ Seeding Complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
