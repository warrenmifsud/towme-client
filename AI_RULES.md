# PROJECT: LIQUID GLASS OS - AI BEHAVIOR RULES

## 1. VISUAL STANDARDS (NON-NEGOTIABLE)
- **Glass Chemistry:** NEVER use black-based transparency. ALWAYS use White-based: `rgba(255, 255, 255, 0.6)`.
- **Hardcoding Banned:** NEVER use `bg-slate-*`, `bg-gray-*`, `bg-white`, or `bg-black` on containers. Use semantic tokens (e.g., `glass-panel`) ONLY.
- **Status Colors:** NEVER use solid `bg-green-500` or `bg-red-500`. Use translucent `bg-success-subtle` or `bg-danger-subtle`.

## 2. REFACTORING PROTOCOLS (DO NOT DELETE FUNCTIONALITY)
- **AST Transformation Only:** When refactoring styles, use AST (Abstract Syntax Tree) logic.
- **The "Functional Veto":** NEVER delete a `<button>`, `<a>`, or `onClick` element to satisfy a style rule.
- **Preservation:** If a component violates a style rule, RETAIN the component and SWAP the class. Do not remove the component.

## 3. UNIFORMITY & INHERITANCE
- **Modal Uniformity:** ALL Modals/Dialogs must utilize the global `GlassWrapper` component.
- **Deep Inheritance:** Sub-routes (Details/Settings) must inherit the Main Layout background. Do not apply specific backgrounds to child pages.

## 4. LINTING & SAFETY
- **No Phantom Tokens:** Do not invent class names. Check `index.css` before applying a class.
- **Visual Check:** If a container looks "Solid Grey" or "Solid White," it is BROKEN. It must be "Frosted."

---

## DETAILED IMPLEMENTATION GUIDE

### Glass Chemistry Reference
```css
/* ✅ CORRECT - White-based frosted glass */
background: rgba(255, 255, 255, 0.6);
backdrop-filter: blur(20px);

/* ❌ WRONG - Black-based tinted window */
background: rgba(15, 23, 42, 0.6);
```

### Semantic Token Reference
**Available Tokens (check `admin-web/src/index.css`):**
- `glass-panel` - Main container glass
- `surface-card` - Inner card surface
- `surface-modal` - Modal/dialog surface
- `surface-inner` - Nested inner surface
- `glass-button` - Interactive glass button
- `bg-status-success` - Success state (green/10)
- `bg-status-error` - Error state (red/10)
- `bg-status-warning` - Warning state (yellow/10)
- `bg-status-info` - Info state (blue/10)

### Refactoring Checklist
Before making ANY automated style changes:
1. ✅ Parse code with AST (not regex)
2. ✅ Classify elements (interactive vs. container)
3. ✅ Count interactive elements BEFORE changes
4. ✅ Apply semantic token replacements
5. ✅ Count interactive elements AFTER changes
6. ✅ If count drops → AUTO-REVERT
7. ✅ Visual verification in browser

### Modal Implementation Pattern
```tsx
// ✅ CORRECT - Uses semantic modal class
<div className="fixed inset-0 bg-white/5 backdrop-blur-sm">
  <div className="surface-modal">
    {/* Modal content */}
  </div>
</div>

// ❌ WRONG - Hardcoded dark backdrop
<div className="fixed inset-0 bg-black/60">
  <div className="bg-white rounded-lg">
    {/* Modal content */}
  </div>
</div>
```

### Enforcement Tools
- **ESLint Plugin:** `eslint-plugin-no-hardcoded-colors.js`
- **AST Refactor:** `scripts/ast-glass-refactor.js`
- **Build Check:** Linter must pass before deployment

### Visual Verification Protocol
1. Open DevTools → Elements → Computed
2. Select modal/container element
3. Check `background-color` property
4. **MUST show:** `rgba(255, 255, 255, ...)` (white-based)
5. **MUST NOT show:** `rgba(0, 0, 0, ...)` or `rgba(15, 23, 42, ...)` (black-based)

### Common Violations & Fixes

| Violation | Fix |
|-----------|-----|
| `bg-white` on container | Replace with `glass-panel` |
| `bg-slate-900` on card | Replace with `surface-card` |
| `bg-black/60` on modal backdrop | Replace with `bg-white/5` |
| `bg-green-500` solid button | Replace with `bg-status-success` |
| Deleting button to fix style | **NEVER** - Swap class instead |

---

## ANTI-PATTERNS (NEVER DO THIS)

### ❌ Regex-Based Refactoring
```javascript
// BANNED - Blind text replacement
code.replace(/bg-orange-500/g, '');
```

### ❌ Deleting Functional Elements
```javascript
// BANNED - Removing buttons to satisfy linter
if (hasHardcodedColor) {
  removeElement(button); // ❌ NEVER
}
```

### ❌ Inventing Class Names
```javascript
// BANNED - Using non-existent tokens
className="glass-container-dark" // Not in index.css
```

### ❌ Transparency Stacking
```css
/* BANNED - Dark backdrop under white modal */
.backdrop { background: rgba(0, 0, 0, 0.6); }
.modal { background: rgba(255, 255, 255, 0.5); }
/* Result: Modal looks grey (stacking issue) */
```

---

## EMERGENCY PROCEDURES

### If Linter Fails
1. Check `admin-web/src/index.css` for available tokens
2. Use semantic token, not hardcoded color
3. If no token exists, create one in `index.css` first

### If Buttons Disappear
1. Check git diff for deleted elements
2. Revert immediately
3. Use AST refactor script instead of regex
4. Verify element count before/after

### If Modal Looks Grey
1. Open DevTools → Computed → background-color
2. If shows `rgba(0, 0, 0, ...)` → Fix to `rgba(255, 255, 255, ...)`
3. Check backdrop element for `bg-black/*` → Replace with `bg-white/5`
4. Apply nuclear override if needed

---

## RESOURCES

- **Theme Definition:** `admin-web/src/index.css`
- **ESLint Plugin:** `admin-web/eslint-plugin-no-hardcoded-colors.js`
- **AST Refactor Tool:** `admin-web/scripts/ast-glass-refactor.js`
- **Knowledge Base:** See "Liquid Glass OS UI Theme Implementation" KI
