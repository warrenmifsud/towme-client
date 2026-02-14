import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FORBIDDEN_PATTERNS = [
    { regex: /#FF6D00/i, message: 'Found forbidden legacy Orange hex code (#FF6D00)' },
    { regex: /rgb\s*\(\s*255\s*,\s*109\s*,\s*0\s*\)/, message: 'Found forbidden legacy Orange RGB value' },
    { regex: /rgba\s*\(\s*255\s*,\s*109\s*,\s*0\s*,/, message: 'Found forbidden legacy Orange RGBA value' }
];

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.DS_Store'];
const TARGET_EXTENSIONS = ['.ts', '.tsx', '.css', '.scss', '.js', '.jsx'];

let errorCount = 0;

function scanDirectory(directory) {
    const files = fs.readdirSync(directory);

    for (const file of files) {
        if (IGNORE_DIRS.includes(file)) continue;

        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDirectory(fullPath);
        } else {
            const ext = path.extname(file);
            if (TARGET_EXTENSIONS.includes(ext)) {
                checkFile(fullPath);
            }
        }
    }
}

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Skip this file itself (the linter)
    if (filePath.includes('guardrail-linter.js')) return;

    FORBIDDEN_PATTERNS.forEach(pattern => {
        if (pattern.regex.test(content)) {
            console.error(`\x1b[31m[GUARDRAIL FAIL] ${filePath}: ${pattern.message}\x1b[0m`);
            // Find line number
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                if (pattern.regex.test(line)) {
                    console.error(`  Line ${index + 1}: ${line.trim()}`);
                }
            });
            errorCount++;
        }
    });
}

console.log('🛡️  Starting Guardrail Linter Scan...');
console.log('   Targeting: #FF6D00 and rgb(255, 109, 0)');

const srcDir = path.resolve(__dirname, '../src');
if (fs.existsSync(srcDir)) {
    scanDirectory(srcDir);
} else {
    console.warn('⚠️  src directory not found, scanning current directory instead.');
    scanDirectory(path.resolve(__dirname, '..'));
}


if (errorCount > 0) {
    console.error(`\n❌ Guardrail Failed! Found ${errorCount} legacy color violations.`);
    console.error('   The build has been blocked. Please replace these values with #F9A825 or brand variables.');
    process.exit(1);
} else {
    console.log('\n✅ Guardrail Passed. No legacy colors found.');
    process.exit(0);
}
