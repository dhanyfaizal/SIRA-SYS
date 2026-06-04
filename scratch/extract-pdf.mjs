import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const buf = readFileSync('ref_rps/Blanko Review RPS.pdf');
const data = await pdfParse(buf);
console.log('=== TOTAL PAGES:', data.numpages, '===\n');
console.log(data.text);
