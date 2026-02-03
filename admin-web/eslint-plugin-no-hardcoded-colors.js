/**
 * Custom ESLint Plugin: No Hardcoded Colors
 * 
 * Prevents usage of hardcoded Tailwind color utilities that violate
 * the "Theme-First Architecture" mandate.
 * 
 * BANNED: bg-slate-*, bg-zinc-*, bg-neutral-*, bg-gray-700/800/900, bg-white (on containers),
 *         raw status colors (bg-green-500, bg-red-500, etc.)
 * ALLOWED: surface-*, text-theme-*, bg-status-*, bg-white/[opacity], translucent accents (bg-green-500/10)
 */

export default {
    rules: {
        'no-hardcoded-colors': {
            meta: {
                type: 'problem',
                docs: {
                    description: 'Disallow hardcoded Tailwind color utilities in className attributes',
                    category: 'Best Practices',
                    recommended: true,
                },
                messages: {
                    bannedSlate: '❌ BANNED: "{{className}}" uses hardcoded bg-slate-*. Use semantic tokens like surface-card, surface-inner instead.',
                    bannedZinc: '❌ BANNED: "{{className}}" uses hardcoded bg-zinc-*. Use semantic tokens instead.',
                    bannedNeutral: '❌ BANNED: "{{className}}" uses hardcoded bg-neutral-*. Use semantic tokens instead.',
                    bannedGray700: '❌ BANNED: "{{className}}" uses bg-gray-700 (dark slab). Use semantic tokens like surface-card instead. Gray is only allowed for text/borders or light backgrounds (bg-gray-100/200/300).',
                    bannedGray800: '❌ BANNED: "{{className}}" uses bg-gray-800 (dark slab). Use semantic tokens like surface-card instead. Gray is only allowed for text/borders or light backgrounds (bg-gray-100/200/300).',
                    bannedGray900: '❌ BANNED: "{{className}}" uses bg-gray-900 (dark slab). Use semantic tokens like surface-card instead. Gray is only allowed for text/borders or light backgrounds (bg-gray-100/200/300).',
                    bannedWhiteSolid: '❌ BANNED: "{{className}}" uses solid bg-white on a container. Use semantic tokens like glass-panel or surface-card instead. Only bg-white/[opacity] is allowed for translucent accents.',
                    bannedGreenSolid: '❌ BANNED: "{{className}}" uses solid bg-green-500. Use bg-status-success or bg-green-500/10 for translucent accents.',
                    bannedRedSolid: '❌ BANNED: "{{className}}" uses solid bg-red-500. Use bg-status-error or bg-red-500/10 for translucent accents.',
                    bannedYellowSolid: '❌ BANNED: "{{className}}" uses solid bg-yellow-500. Use bg-status-warning or bg-yellow-500/10 for translucent accents.',
                    bannedBlueSolid: '❌ BANNED: "{{className}}" uses solid bg-blue-500. Use bg-status-info or bg-blue-500/10 for translucent accents.',
                },
                schema: [],
            },
            create(context) {
                // Regex patterns for banned classes
                // NOTE: bg-gray-500 is ALLOWED for status indicators (offline, inactive, disabled)
                // NOTE: bg-gray-700/800/900 are BANNED for backgrounds (creates dark slabs - "tinted window" effect)
                // NOTE: bg-white is BANNED on containers (must use semantic tokens)
                // NOTE: Translucent variants (bg-green-500/10, bg-white/10) are ALLOWED for accent highlights
                const bannedPatterns = [
                    // Aesthetic colors (no semantic meaning)
                    { pattern: /\bbg-slate-\d+(?:\/\d+)?\b/, message: 'bannedSlate' },
                    { pattern: /\bbg-zinc-\d+(?:\/\d+)?\b/, message: 'bannedZinc' },
                    { pattern: /\bbg-neutral-\d+(?:\/\d+)?\b/, message: 'bannedNeutral' },

                    // Dark gray backgrounds (creates opaque slabs - "tinted window" effect)
                    { pattern: /\bbg-gray-700(?:\/\d+)?\b/, message: 'bannedGray700' },
                    { pattern: /\bbg-gray-800(?:\/\d+)?\b/, message: 'bannedGray800' },
                    { pattern: /\bbg-gray-900(?:\/\d+)?\b/, message: 'bannedGray900' },

                    // Solid white backgrounds (no transparency - breaks glass aesthetic)
                    // Negative lookahead (?!\/\d) ensures we only match solid bg-white
                    { pattern: /\bbg-white(?!\/\d)\b/, message: 'bannedWhiteSolid' },

                    // Raw status colors (SOLID ONLY - translucent variants allowed)
                    // Negative lookahead (?!\/\d) ensures we only match solid colors
                    { pattern: /\bbg-green-500(?!\/\d)\b/, message: 'bannedGreenSolid' },
                    { pattern: /\bbg-red-500(?!\/\d)\b/, message: 'bannedRedSolid' },
                    { pattern: /\bbg-yellow-500(?!\/\d)\b/, message: 'bannedYellowSolid' },
                    { pattern: /\bbg-blue-500(?!\/\d)\b/, message: 'bannedBlueSolid' },
                ];

                return {
                    JSXAttribute(node) {
                        // Only check className attributes
                        if (node.name.name !== 'className') return;

                        // Get the className value
                        let classNameValue = '';
                        if (node.value?.type === 'Literal') {
                            classNameValue = node.value.value;
                        } else if (node.value?.type === 'JSXExpressionContainer') {
                            // Handle template literals and string concatenation
                            const expression = node.value.expression;
                            if (expression.type === 'TemplateLiteral') {
                                classNameValue = expression.quasis.map(q => q.value.raw).join('');
                            } else if (expression.type === 'Literal') {
                                classNameValue = expression.value;
                            }
                        }

                        if (typeof classNameValue !== 'string') return;

                        // Check for banned patterns
                        for (const { pattern, message } of bannedPatterns) {
                            const match = classNameValue.match(pattern);
                            if (match) {
                                context.report({
                                    node: node.value || node,
                                    messageId: message,
                                    data: {
                                        className: match[0],
                                    },
                                });
                            }
                        }
                    },
                };
            },
        },
    },
};
