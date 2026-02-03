#!/usr/bin/env node

/**
 * AUTOMATED CODEMOD: Glass Token Enforcement
 * 
 * This script systematically purges hardcoded background colors
 * and enforces semantic glass token usage across the entire codebase.
 * 
 * Operations:
 * 1. Modal Normalization - Force all modals to use glass-panel
 * 2. Hardcode Purge - Replace bg-slate/gray/zinc/neutral-700/800/900
 * 3. Container Standardization - Ensure all containers use semantic tokens
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Statistics tracking
const stats = {
    filesScanned: 0,
    filesModified: 0,
    replacements: {
        modalBackgrounds: 0,
        darkGrayBackgrounds: 0,
        whiteBackgrounds: 0,
        slateBackgrounds: 0,
    },
    modifiedFiles: []
};

// Patterns to find and replace
const replacementPatterns = [
    // Modal/Dialog/Popup containers with hardcoded backgrounds
    {
        name: 'Modal with bg-white',
        pattern: /(className="[^"]*)(bg-white)([^"]*")/g,
        replacement: (match, before, bg, after) => {
            // Only replace if it's a modal/dialog container (contains 'modal' or 'dialog' or similar keywords)
            const fullClass = before + bg + after;
            if (fullClass.includes('modal') || fullClass.includes('dialog') || fullClass.includes('popup')) {
                stats.replacements.modalBackgrounds++;
                return before + 'glass-panel' + after.replace(/\s+bg-white/g, '');
            }
            return match;
        }
    },

    // Dark gray backgrounds (700/800/900) - the "tinted window" slabs
    {
        name: 'Dark gray backgrounds',
        pattern: /(className="[^"]*)(bg-(?:slate|gray|zinc|neutral)-(?:700|800|900)(?:\/\d+)?)([^"]*")/g,
        replacement: (match, before, bg, after) => {
            stats.replacements.darkGrayBackgrounds++;
            // Replace with appropriate semantic token
            if (before.includes('modal') || before.includes('dialog')) {
                return before + 'glass-panel' + after.replace(new RegExp('\\s+' + bg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
            }
            return before + 'surface-card' + after.replace(new RegExp('\\s+' + bg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
        }
    },

    // Slate backgrounds (all shades)
    {
        name: 'Slate backgrounds',
        pattern: /(className="[^"]*)(bg-slate-\d+(?:\/\d+)?)([^"]*")/g,
        replacement: (match, before, bg, after) => {
            stats.replacements.slateBackgrounds++;
            return before + 'surface-card' + after.replace(new RegExp('\\s+' + bg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
        }
    }
];

/**
 * Recursively scan directory for .tsx and .jsx files
 */
function scanDirectory(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Skip node_modules and build directories
            if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist' && file !== 'build') {
                scanDirectory(filePath, fileList);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

/**
 * Process a single file
 */
function processFile(filePath) {
    stats.filesScanned++;

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let originalContent = content;

    // Apply all replacement patterns
    replacementPatterns.forEach(({ pattern, replacement }) => {
        const newContent = content.replace(pattern, replacement);
        if (newContent !== content) {
            modified = true;
            content = newContent;
        }
    });

    // Write back if modified
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        stats.filesModified++;
        stats.modifiedFiles.push(filePath);

        // Show diff for this file
        console.log(`\n✅ Modified: ${path.relative(process.cwd(), filePath)}`);
    }
}

/**
 * Main execution
 */
function main() {
    console.log('🚀 AUTOMATED CODEMOD: Glass Token Enforcement\n');
    console.log('Scanning src/ directory for hardcoded backgrounds...\n');

    const srcDir = path.join(path.dirname(__dirname), 'src');
    const files = scanDirectory(srcDir);

    console.log(`Found ${files.length} component files to process\n`);
    console.log('Processing...\n');

    files.forEach(processFile);

    // Print statistics
    console.log('\n' + '='.repeat(60));
    console.log('📊 CODEMOD STATISTICS');
    console.log('='.repeat(60));
    console.log(`Files Scanned:           ${stats.filesScanned}`);
    console.log(`Files Modified:          ${stats.filesModified}`);
    console.log(`\nReplacements Made:`);
    console.log(`  Modal Backgrounds:     ${stats.replacements.modalBackgrounds}`);
    console.log(`  Dark Gray Backgrounds: ${stats.replacements.darkGrayBackgrounds}`);
    console.log(`  Slate Backgrounds:     ${stats.replacements.slateBackgrounds}`);
    console.log(`  White Backgrounds:     ${stats.replacements.whiteBackgrounds}`);
    console.log(`\nTotal Replacements:      ${Object.values(stats.replacements).reduce((a, b) => a + b, 0)}`);
    console.log('='.repeat(60));

    if (stats.filesModified > 0) {
        console.log('\n✅ Codemod completed successfully!');
        console.log('\nModified files:');
        stats.modifiedFiles.forEach(file => {
            console.log(`  - ${path.relative(process.cwd(), file)}`);
        });
    } else {
        console.log('\n✨ No hardcoded backgrounds found - codebase is already clean!');
    }
}

// Execute
main();
