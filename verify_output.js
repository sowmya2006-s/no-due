
const API_URL = 'http://localhost:5000/api';

async function verifyStudentDashboard() {
    try {
        console.log('--- Student Dashboard Verification (S001) ---');

        // 1. Login
        console.log('1. Logging in as S001...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'S001',
                password: 'stud123',
                role: 'student'
            })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(`Login Failed: ${JSON.stringify(loginData)}`);
        const token = loginData.token;
        const authHeaders = { 'Authorization': `Bearer ${token}` };
        console.log('✓ Login Success');

        // 2. Fetch Structure (Standard Sync)
        console.log('2. Fetching Academic Structure...');
        const structureRes = await fetch(`${API_URL}/academic/structure`, { headers: authHeaders });
        const structure = await structureRes.json();
        console.log('✓ Structure Received');

        // 3. Fetch Student Dashboard Data (Deep Sync)
        console.log('3. Fetching Profile, Records, and Faculty...');
        const [profileRes, recordsRes, facultyRes] = await Promise.all([
            fetch(`${API_URL}/academic/profile`, { headers: authHeaders }),
            fetch(`${API_URL}/nodue/student-records`, { headers: authHeaders }),
            fetch(`${API_URL}/academic/faculty`, { headers: authHeaders })
        ]);

        const profile = await profileRes.json();
        const records = await recordsRes.json();
        const faculty = await facultyRes.json();

        if (!profileRes.ok) throw new Error('Profile Fetch Failed');

        console.log('\n--- DEBUG DATA ---');
        console.log('Structure Summary:', JSON.stringify(structure, null, 2));
        console.log('Profile Data:', JSON.stringify(profile, null, 2));
        console.log('------------------\n');

        console.log('\n--- CORRECT DASHBOARD OUTPUT ---');
        console.log(`Student ID: ${profile.student_id}`);
        console.log(`Department: ${profile.department}`);
        console.log(`Year: ${profile.year}, Section: ${profile.section}`);
        console.log('---------------------------------');

        // Simulate Dashboard logic to find subjects
        const sDept = String(profile.department).trim().toUpperCase();
        const sYear = Number(profile.year);
        const sSec = String(profile.section).trim().toUpperCase();

        const dept = structure.find(d => String(d.name).trim().toUpperCase() === sDept);
        if (!dept) {
            console.log(`✗ Error: Department ${sDept} not found in structure.`);
        } else {
            const yr = dept.years.find(y => Number(y.year) === sYear);
            if (!yr) {
            } else {
                const sec = yr.sections.find(s => s.section.trim().toUpperCase() === sSec);
                if (!sec) {
                    console.log(`✗ Error: Section ${sSec} not found.`);
                } else {
                    console.log('My Subject Statuses:');
                    sec.subjects.forEach(sub => {
                        const record = records.find(r => r.subject === sub.subject);
                        const status = record ? record.status : 'pending';
                        const fac = faculty.find(f => f.faculty_id === sub.faculty_id);
                        console.log(`- [${status.toUpperCase()}] ${sub.subject} (${fac ? fac.name : 'Unassigned'})`);
                    });
                }
            }
        }
        console.log('---------------------------------');

    } catch (err) {
        console.error('✗ Verification Failed:', err.message);
    }
}

verifyStudentDashboard();
