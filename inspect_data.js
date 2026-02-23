
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const dataDir = path.join(process.cwd(), 'data');

function inspect(file) {
    console.log(`\n--- Inspecting ${file} ---`);
    const wb = XLSX.readFile(path.join(dataDir, file));
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log(JSON.stringify(rows, null, 2));
}

inspect('faculty_sample.xlsx');
inspect('students_sample.xlsx');
inspect('academic_structure_sample.xlsx');
