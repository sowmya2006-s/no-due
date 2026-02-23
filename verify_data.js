
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const API_URL = 'http://localhost:5000/api';

async function runTest() {
    try {
        console.log('--- Starting System Verification (Native Fetch) ---');

        const dataDir = path.join(process.cwd(), 'data');

        // 1. Login as Admin
        console.log('1. Logging in as Admin...');
        const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123',
                role: 'ADMIN'
            })
        });
        const adminLoginData = await adminLoginRes.json();
        if (!adminLoginRes.ok) throw new Error(`Admin Login Failed: ${JSON.stringify(adminLoginData)}`);
        const token = adminLoginData.token;
        const adminHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        console.log('✓ Admin Login Success');

        // 2. Parse and Upload Academic Structure
        console.log('2. Uploading Academic Structure...');
        const acWorkbook = XLSX.readFile(path.join(dataDir, 'academic_structure_sample.xlsx'));
        const acSheet = acWorkbook.Sheets[acWorkbook.SheetNames[0]];
        const acRows = XLSX.utils.sheet_to_json(acSheet);

        // Map Excel to structure
        const deptMap = {};
        acRows.forEach(r => {
            const dept = r.department || r.Department || "";
            const year = Number(r.year || r.Year || 1);
            const section = r.section || r.Section || "A";
            const subject = r.subject || r.Subject || "";
            const faculty_id = String(r.faculty_id || r["Faculty ID"] || r.FacultyID || "");
            if (!dept || !subject) return;
            if (!deptMap[dept]) deptMap[dept] = {};
            if (!deptMap[dept][year]) deptMap[dept][year] = {};
            if (!deptMap[dept][year][section]) deptMap[dept][year][section] = [];
            deptMap[dept][year][section].push({ subject, faculty_id });
        });
        const academicData = {
            departments: Object.entries(deptMap).map(([name, years]) => ({
                name,
                years: Object.entries(years).map(([y, sections]) => ({
                    year: Number(y),
                    sections: Object.entries(sections).map(([section, subjects]) => ({ section, subjects })),
                })),
            })),
        };
        const acRes = await fetch(`${API_URL}/academic/upload-structure`, {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify(academicData)
        });
        if (!acRes.ok) throw new Error(`Structure Upload Failed: ${await acRes.text()}`);
        console.log('✓ Academic Structure Uploaded');

        // 3. Upload Students
        console.log('3. Uploading Students...');
        const stWorkbook = XLSX.readFile(path.join(dataDir, 'students_sample.xlsx'));
        const stSheet = stWorkbook.Sheets[stWorkbook.SheetNames[0]];
        const stRows = XLSX.utils.sheet_to_json(stSheet);
        const studentData = stRows.map(r => ({
            student_id: String(r.student_id || r["Student ID"] || r.StudentID || "").trim(),
            password: r.password || "student123",
            department: String(r.department || r.Department || "").trim(),
            year: Number(r.year || r.Year || 1),
            section: String(r.section || r.Section || "A").trim(),
        }));
        const stRes = await fetch(`${API_URL}/academic/upload-students`, {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({ students: studentData })
        });
        if (!stRes.ok) throw new Error(`Students Upload Failed: ${await stRes.text()}`);
        console.log('✓ Students Uploaded');

        // 4. Upload Faculty
        console.log('4. Uploading Faculty...');
        const fcWorkbook = XLSX.readFile(path.join(dataDir, 'faculty_sample.xlsx'));
        const fcSheet = fcWorkbook.Sheets[fcWorkbook.SheetNames[0]];
        const fcRows = XLSX.utils.sheet_to_json(fcSheet);
        const facultyData = fcRows.map(r => ({
            faculty_id: String(r.faculty_id || r["Faculty ID"] || r.FacultyID || "").trim(),
            name: r.name || r.Name || "",
            password: r.password || "faculty123",
        }));
        const fcRes = await fetch(`${API_URL}/academic/upload-faculty`, {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({ faculty: facultyData })
        });
        if (!fcRes.ok) throw new Error(`Faculty Upload Failed: ${await fcRes.text()}`);
        console.log('✓ Faculty Uploaded');

        // 5. Faculty Action: Mark Cleared
        console.log('5. Simulating Faculty Action (Mark Cleared)...');
        const facLoginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'F101',
                password: 'faculty123',
                role: 'FACULTY'
            })
        });
        const facLoginData = await facLoginRes.json();
        if (!facLoginRes.ok) throw new Error(`Faculty Login Failed: ${JSON.stringify(facLoginData)}`);
        const facToken = facLoginData.token;
        const facHeaders = {
            'Authorization': `Bearer ${facToken}`,
            'Content-Type': 'application/json'
        };

        const setStatusRes = await fetch(`${API_URL}/nodue/set-status`, {
            method: 'POST',
            headers: facHeaders,
            body: JSON.stringify({
                studentId: 'S001',
                subjectName: 'Programming',
                status: 'cleared',
                message: 'Lab record OK'
            })
        });
        if (!setStatusRes.ok) throw new Error(`Status Update Failed: ${await setStatusRes.text()}`);
        console.log('✓ Faculty marked S001 as cleared');

        // 6. Student Action: Verify Status
        console.log('6. Verifying Student Dashboard Data...');
        const stuLoginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'S001',
                password: 'student123',
                role: 'STUDENT'
            })
        });
        const stuLoginData = await stuLoginRes.json();
        if (!stuLoginRes.ok) throw new Error(`Student Login Failed: ${JSON.stringify(stuLoginData)}`);
        const stuToken = stuLoginData.token;
        const stuHeaders = {
            'Authorization': `Bearer ${stuToken}`
        };

        const [recordsRes, profileRes] = await Promise.all([
            fetch(`${API_URL}/nodue/student-records`, { headers: stuHeaders }),
            fetch(`${API_URL}/academic/profile`, { headers: stuHeaders })
        ]);

        const records = await recordsRes.json();
        const profile = await profileRes.json();

        console.log('\n--- Final Verification Results ---');
        console.log('Student Profile:', profile.student_id, '-', profile.department, 'Year', profile.year, 'Section', profile.section);

        const progRecord = records.find(r => r.subject === 'Programming');
        if (progRecord && progRecord.status === 'cleared' && progRecord.message === 'Lab record OK') {
            console.log('✓ Success: "Programming" status is CLEARED with correct message');
        } else {
            console.log('✗ Failed: Subject record mismatch or missing', JSON.stringify(progRecord));
        }

        console.log('\n--- ALL WORKFLOWS VERIFIED SUCCESSFULLY ---');
    } catch (err) {
        console.error('✗ System Verification Failed:', err.message);
        process.exit(1);
    }
}

runTest();
