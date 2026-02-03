#!/usr/bin/env node

/**
 * AST-BASED GLASS TOKEN REFACTOR
 * 
 * THE PRESERVATION DIRECTIVE:
 * This script uses Abstract Syntax Tree (AST) transformation to understand
 * code structure and preserve functional elements while enforcing style compliance.
 * 
 * BANNED: Regex text matching (dumb deletion)
 * REQUIRED: AST transformation (semantic preservation)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';

// ========================================
// SEMANTIC ELEMENT CLASSIFICATION
// ========================================

const ELEMENT_TYPES = {
    INTERACTIVE: ['button', 'a', 'input', 'select', 'textarea'],
    CONTAINER: ['div', 'section', 'article', 'main', 'aside', 'header', 'footer'],
    MODAL: ['dialog', 'div'], // div can be modal if has role="dialog" or modal classes
};

const MODAL_INDICATORS = [
    'modal',
    'dialog',
    'popup',
    'overlay',
    'backdrop',
    'fixed inset-0',
];

// ========================================
// MAPPING RULES: Context-Aware Replacement
// ========================================

const REPLACEMENT_RULES = {
    // Interactive Elements (PRESERVE - Never Delete)
    BUTTON: {
        'bg-orange-500': 'glass-button-primary',
        'bg-green-500': 'glass-button-success',
        'bg-red-500': 'glass-button-danger',
        'bg-blue-500': 'glass-button-info',
        'bg-white': 'glass-button', // Preserve button, just change class
    },

    // Container Elements
    CONTAINER: {
        'bg-white': 'glass-panel',
        'bg-slate-700': 'surface-card',
        'bg-slate-800': 'surface-card',
        'bg-slate-900': 'glass-panel',
        'bg-gray-700': 'surface-card',
        'bg-gray-800': 'surface-card',
        'bg-gray-900': 'glass-panel',
    },

    // Modal Elements
    MODAL: {
        'bg-white': 'surface-modal',
        'bg-black/60': 'bg-white/5', // Light backdrop
        'bg-black/80': 'bg-white/5',
        'bg-slate-900': 'surface-modal',
    },
};

// ========================================
// ELEMENT COUNT SAFETY CHECK
// ========================================

class ElementCounter {
    constructor() {
        this.before = {};
        this.after = {};
    }

    countElements(ast, phase) {
        const counts = {
            button: 0,
            a: 0,
            input: 0,
            select: 0,
            textarea: 0,
            total_interactive: 0,
        };

        traverse(ast, {
            JSXElement(path) {
                const elementName = path.node.openingElement.name.name?.toLowerCase();
                if (ELEMENT_TYPES.INTERACTIVE.includes(elementName)) {
                    counts[elementName] = (counts[elementName] || 0) + 1;
                    counts.total_interactive++;
                }
            },
        });

        this[phase] = counts;
        return counts;
    }

    validate() {
        const errors = [];

        for (const [element, beforeCount] of Object.entries(this.before)) {
            const afterCount = this.after[element] || 0;
            if (afterCount < beforeCount) {
                errors.push(
                    `❌ SAFETY CHECK FAILED: ${element} count dropped from ${beforeCount} to ${afterCount}`
                );
            }
        }

        return {
            passed: errors.length === 0,
            errors,
            before: this.before,
            after: this.after,
        };
    }
}

// ========================================
// AST TRANSFORMATION LOGIC
// ========================================

function classifyElement(path) {
    const elementName = path.node.openingElement.name.name?.toLowerCase();
    const attributes = path.node.openingElement.attributes;

    // Get className attribute
    const classNameAttr = attributes.find(
        attr => attr.name?.name === 'className'
    );

    let classNameValue = '';
    if (classNameAttr?.value?.type === 'StringLiteral') {
        classNameValue = classNameAttr.value.value;
    } else if (classNameAttr?.value?.type === 'JSXExpressionContainer') {
        // Handle dynamic classNames (template literals, etc.)
        // For now, we'll skip these to be safe
        return { type: 'UNKNOWN', className: '' };
    }

    // Classify element
    if (ELEMENT_TYPES.INTERACTIVE.includes(elementName)) {
        return { type: 'INTERACTIVE', className: classNameValue, elementName };
    }

    // Check if it's a modal
    const isModal = MODAL_INDICATORS.some(indicator =>
        classNameValue.includes(indicator)
    );
    if (isModal) {
        return { type: 'MODAL', className: classNameValue, elementName };
    }

    if (ELEMENT_TYPES.CONTAINER.includes(elementName)) {
        return { type: 'CONTAINER', className: classNameValue, elementName };
    }

    return { type: 'UNKNOWN', className: classNameValue, elementName };
}

function replaceClassName(className, elementType) {
    const rules = REPLACEMENT_RULES[elementType];
    if (!rules) return className;

    let newClassName = className;
    let replacements = 0;

    for (const [oldClass, newClass] of Object.entries(rules)) {
        if (newClassName.includes(oldClass)) {
            newClassName = newClassName.replace(new RegExp(oldClass, 'g'), newClass);
            replacements++;
        }
    }

    return { newClassName, replacements };
}

function transformFile(filePath) {
    const code = readFileSync(filePath, 'utf-8');

    // Parse to AST
    const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
    });

    const counter = new ElementCounter();
    const stats = {
        file: filePath,
        interactive_preserved: 0,
        containers_updated: 0,
        modals_updated: 0,
        skipped: 0,
    };

    // Count BEFORE
    counter.countElements(ast, 'before');

    // Transform
    traverse(ast, {
        JSXElement(path) {
            const classification = classifyElement(path);

            if (classification.type === 'UNKNOWN') {
                stats.skipped++;
                return;
            }

            const { newClassName, replacements } = replaceClassName(
                classification.className,
                classification.type
            );

            if (replacements > 0) {
                // Update className attribute
                const classNameAttr = path.node.openingElement.attributes.find(
                    attr => attr.name?.name === 'className'
                );

                if (classNameAttr?.value?.type === 'StringLiteral') {
                    classNameAttr.value.value = newClassName;

                    // Track stats
                    if (classification.type === 'INTERACTIVE') {
                        stats.interactive_preserved++;
                    } else if (classification.type === 'CONTAINER') {
                        stats.containers_updated++;
                    } else if (classification.type === 'MODAL') {
                        stats.modals_updated++;
                    }
                }
            }
        },
    });

    // Count AFTER
    counter.countElements(ast, 'after');

    // Safety Check
    const validation = counter.validate();
    if (!validation.passed) {
        console.error(`\n❌ ABORTING: ${filePath}`);
        validation.errors.forEach(err => console.error(err));
        console.error('\n🔄 AUTO-REVERTING: No changes written to disk.\n');
        return { success: false, stats, validation };
    }

    // Generate new code
    const output = generate(ast, {
        retainLines: true,
        compact: false,
    });

    // Write to disk
    writeFileSync(filePath, output.code, 'utf-8');

    return { success: true, stats, validation };
}

// ========================================
// FILE DISCOVERY
// ========================================

function findTsxFiles(dir, fileList = []) {
    const files = readdirSync(dir);

    files.forEach(file => {
        const filePath = join(dir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
            // Skip node_modules, dist, build
            if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
                findTsxFiles(filePath, fileList);
            }
        } else if (['.tsx', '.jsx'].includes(extname(file))) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

// ========================================
// MAIN EXECUTION
// ========================================

function main() {
    console.log('🔬 AST-BASED GLASS TOKEN REFACTOR');
    console.log('📋 THE PRESERVATION DIRECTIVE: Semantic preservation enabled\n');

    const srcDir = join(process.cwd(), 'src');
    const files = findTsxFiles(srcDir);

    console.log(`📁 Found ${files.length} component files\n`);

    const results = {
        success: [],
        failed: [],
        totalStats: {
            interactive_preserved: 0,
            containers_updated: 0,
            modals_updated: 0,
            skipped: 0,
        },
    };

    files.forEach(file => {
        console.log(`🔄 Processing: ${file}`);
        const result = transformFile(file);

        if (result.success) {
            results.success.push(file);
            results.totalStats.interactive_preserved += result.stats.interactive_preserved;
            results.totalStats.containers_updated += result.stats.containers_updated;
            results.totalStats.modals_updated += result.stats.modals_updated;
            results.totalStats.skipped += result.stats.skipped;

            console.log(`  ✅ Success`);
            console.log(`     Interactive: ${result.validation.after.total_interactive} (preserved)`);
            console.log(`     Containers: ${result.stats.containers_updated} updated`);
            console.log(`     Modals: ${result.stats.modals_updated} updated\n`);
        } else {
            results.failed.push(file);
        }
    });

    // Final Report
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL REPORT');
    console.log('='.repeat(60));
    console.log(`✅ Files Processed: ${results.success.length}`);
    console.log(`❌ Files Failed: ${results.failed.length}`);
    console.log(`\n🔘 Interactive Elements Preserved: ${results.totalStats.interactive_preserved}`);
    console.log(`📦 Containers Updated: ${results.totalStats.containers_updated}`);
    console.log(`🪟 Modals Updated: ${results.totalStats.modals_updated}`);
    console.log(`⏭️  Elements Skipped: ${results.totalStats.skipped}`);
    console.log('='.repeat(60) + '\n');

    if (results.failed.length > 0) {
        console.error('❌ FAILED FILES:');
        results.failed.forEach(f => console.error(`  - ${f}`));
        process.exit(1);
    }

    console.log('✅ ALL FILES PROCESSED SUCCESSFULLY');
}

main();
