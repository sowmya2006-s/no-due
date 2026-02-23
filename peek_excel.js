
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const workbook = XLSX.readFile(path.join(process.cwd(), 'data/academic_structure_sample.xlsx'));
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);
console.log('Headers:', Object.keys(rows[0] || {}));
console.log('First Row:', rows[0]);
