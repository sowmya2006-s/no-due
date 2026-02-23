
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const API_URL = 'http://localhost:5000/api';

async function runRecovery() {
    try {
        console.log('--- Starting System Recovery & Verification ---');

        const dataDir = path.join(process.cwd(), 'data');

        // 1. Login as Admin
        console.log('1. Logging in as Admin...');
        const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin', // Will be normalized to ADMIN
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

        // 2. Clear Existing Data (Deep Clean)
        console.log('2. performing Deep Clean (Removing Students/Faculty/Structure)...');
        await Promise.all([
            fetch(`${API_URL}/academic/remove-students`, { method: 'DELETE', headers: adminHeaders }),
            fetch(`${API_URL}/academic/remove-faculty-all`, { method: 'DELETE', headers: adminHeaders }),
            fetch(`${API_URL}/academic/remove-structure`, { method: 'DELETE', headers: adminHeaders })
        ]);
        console.log('✓ Database Cleared');

        // 3. Re-upload Faculty (MUST BE FIRST DUE TO FK)
        console.log('3. Re-uploading Faculty...');
        const fcWorkbook = XLSX.readFile(path.join(dataDir, 'faculty_sample.xlsx'));
        const fcSheet = fcWorkbook.Sheets[fcWorkbook.SheetNames[0]];
        const fcRows = XLSX.utils.sheet_to_json(fcSheet);
        const facultyData = fcRows.map(r => ({
            faculty_id: String(r["Faculty ID"] || r.faculty_id || r.FacultyID || "").trim(),
            name: r.Name || r.name || "",
            password: r.Password || r.password || "fac123",
        }));
        const facRes = await fetch(`${API_URL}/academic/upload-faculty`, {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({ faculty: facultyData })
        });
        if (!facRes.ok) throw new Error(`Faculty Upload Failed: ${await facRes.text()}`);
        console.log('✓ Faculty Re-uploaded');

        // 4. Re-upload Academic Structure
        console.log('4. Re-uploading Academic Structure...');
        const acWorkbook = XLSX.readFile(path.join(dataDir, 'academic_structure_sample.xlsx'));
        const acSheet = acWorkbook.Sheets[acWorkbook.SheetNames[0]];
        const acRows = XLSX.utils.sheet_to_json(acSheet);

        const deptMap = {};
        acRows.forEach(r => {
            const dept = r.Department || r.department || "";
            const year = Number(r.Year || r.year || 1);
            const section = r.Section || r.section || "A";
            const subject = r.Subject || r.subject || "";
            const faculty_id = String(r["Faculty ID"] || r.faculty_id || r.FacultyID || "");
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
        const structRes = await fetch(`${API_URL}/academic/upload-structure`, {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify(academicData)
        });
        if (!structRes.ok) throw new Error(`Structure Upload Failed: ${await structRes.text()}`);
        console.log('✓ Academic Structure Re-uploaded');

        // 5. Re-upload Students
        console.log('5. Re-uploading Students...');
        const stWorkbook = XLSX.readFile(path.join(dataDir, 'students_sample.xlsx'));
        const stSheet = stWorkbook.Sheets[stWorkbook.SheetNames[0]];
        const stRows = XLSX.utils.sheet_to_json(stSheet);
        const studentData = stRows.map(r => ({
            student_id: String(r["Student ID"] || r.student_id || r.StudentID || "").trim(),
            password: r.Password || r.password || "stud123",
            department: String(r.Department || r.department || "").trim(),
            year: Number(r.Year || r.year || 1),
            section: String(r.Section || r.section || "A").trim(),
        }));
        const studRes = await fetch(`${API_URL}/academic/upload-students`, {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({ students: studentData })
        });
        if (!studRes.ok) throw new Error(`Student Upload Failed: ${await studRes.text()}`);
        console.log('✓ Students Re-uploaded');

        // 6. Test Multi-Case Login
        console.log('6. Verifying Multi-Case Login for S001...');
        const loginResponses = await Promise.all([
            fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'S001', password: 'stud123', role: 'student' })
            }),
            fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 's001', password: 'stud123', role: 'student' })
            })
        ]);

        for (const res of loginResponses) {
            if (!res.ok) throw new Error(`Login Verification Failed: ${await res.text()}`);
            const data = await res.json();
            const profile = await fetch(`${API_URL}/academic/profile`, {
                headers: { 'Authorization': `Bearer ${data.token}` }
            });
            const profileData = await profile.json();
            if (!profile.ok) throw new Error(`Profile Lookup Failed for ${data.user.username}: ${JSON.stringify(profileData)}`);
            console.log(`✓ Access verified for ${data.user.username} -> Profile: ${profileData.student_id}`);
        }

        console.log('\n--- SYSTEM RECOVERED & VERIFIED SUCCESSFULLY ---');
    } catch (err) {
        console.error('✗ System Recovery Failed:', err.message);
        process.exit(1);
    }
}

runRecovery();
