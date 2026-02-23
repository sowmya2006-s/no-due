
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const dataDir = path.join(process.cwd(), 'data');

function fixExcel(filename, idColumns) {
    const filePath = path.join(dataDir, filename);
    console.log(`Fixing ${filename}...`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const fixedData = data.map(row => {
        const newRow = { ...row };
        idColumns.forEach(col => {
            if (newRow[col]) {
                newRow[col] = String(newRow[col]).trim().toUpperCase();
            }
        });
        return newRow;
    });

    const newWorksheet = XLSX.utils.json_to_sheet(fixedData);
    workbook.Sheets[sheetName] = newWorksheet;
    XLSX.writeFile(workbook, filePath);
    console.log(`✓ ${filename} fixed.`);
}

try {
    fixExcel('students_sample.xlsx', ['Student ID', 'student_id']);
    fixExcel('faculty_sample.xlsx', ['Faculty ID', 'faculty_id']);
    fixExcel('academic_structure_sample.xlsx', ['Faculty ID', 'faculty_id']);
} catch (err) {
    console.error('Error fixing Excel files:', err.message);
}
