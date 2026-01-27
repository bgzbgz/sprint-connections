# Fast Track Brand System - CSS Documentation

## Overview

This CSS design system implements the Fast Track brand guidelines for Boss Office.

**Entry Point**: `main.css`

---

## Brand Rules

### Colors (4 ONLY)

| Color | Hex | Variable | Usage |
|-------|-----|----------|-------|
| Black | `#000000` | `--ft-color-black` | Primary text, borders, dark backgrounds |
| White | `#FFFFFF` | `--ft-color-white` | Backgrounds, text on dark |
| Grey | `#B2B2B2` | `--ft-color-grey` | Muted text, disabled states |
| Yellow | `#FFF469` | `--ft-color-yellow` | Accent, CTAs, focus states |

### Typography (3 Typefaces)

| Font | Variable | Usage | Case |
|------|----------|-------|------|
| Plaak | `--ft-font-headline` | Headlines (h1-h6) | UPPERCASE |
| Riforma | `--ft-font-body` | Body copy, buttons | Sentence case |
| Monument | `--ft-font-mono` | Labels, meta, badges | UPPERCASE |

### Forbidden Patterns

- NO rounded corners (`border-radius > 0`)
- NO drop shadows (`box-shadow`)
- NO gradients
- NO red for errors (use yellow)
- NO green for success (use black checkmark)
- NO fancy transitions (buttons only: 0.1s)

---

## File Structure

```
src/styles/
├── tokens/
│   ├── _colors.css      # Color custom properties
│   ├── _typography.css  # Font families, sizes, line-heights
│   ├── _spacing.css     # 8px-based spacing scale
│   └── _borders.css     # Border widths, radius (always 0)
├── base/
│   ├── _fonts.css       # @font-face declarations
│   ├── _reset.css       # Brand-enforcing CSS reset
│   ├── _base.css        # Body, container styles
│   └── _typography.css  # Heading, paragraph, label styles
├── components/
│   ├── _header.css      # Header with F mark
│   ├── _cards.css       # Card containers
│   ├── _buttons.css     # Primary, secondary, tertiary buttons
│   ├── _feedback.css    # Error, success, warning states
│   └── _forms.css       # Inputs, selects, checkboxes
├── utilities/
│   ├── _backgrounds.css # .ft-bg-* classes
│   ├── _text.css        # .ft-text-* classes
│   ├── _grid.css        # 12-column grid system
│   ├── _spacing.css     # .ft-mt-*, .ft-mb-*, .ft-p-* classes
│   ├── _alignment.css   # .ft-left, .ft-flex, etc.
│   └── _responsive.css  # Breakpoint utilities
└── main.css             # Entry point (imports all)
```

---

## Component Classes

### Header

```html
<header class="ft-header">
  <nav class="ft-header__nav">
    <a href="#" class="ft-header__nav-item ft-header__nav-item--active">Tools</a>
  </nav>
  <div class="ft-header__logo">
    <img src="assets/images/FastTrack_F_White.png" alt="Fast Track">
  </div>
</header>
```

### Cards

```html
<div class="ft-card">
  <span class="ft-card__meta">TOOL ID: FT-2024-001</span>
  <h2 class="ft-card__title">CARD TITLE</h2>
  <p class="ft-card__body">Card body text.</p>
  <div class="ft-card__actions">
    <button class="ft-button ft-button--primary">Action</button>
  </div>
</div>
```

### Buttons

```html
<button class="ft-button ft-button--primary">Primary</button>
<button class="ft-button ft-button--secondary">Secondary</button>
<button class="ft-button ft-button--tertiary">Tertiary</button>
<button class="ft-button ft-button--icon">X</button>
```

### Forms

```html
<div class="ft-form-group">
  <label class="ft-form-label ft-form-label--required">Label</label>
  <input type="text" class="ft-input" placeholder="Enter value">
  <span class="ft-helper-text">Helper text</span>
</div>
```

### Feedback

```html
<!-- Error (yellow background, NOT red) -->
<div class="ft-error">
  <span class="ft-error__title">Error Title</span>
  <span class="ft-error__message">Error message.</span>
</div>

<!-- Success (black checkmark, NOT green) -->
<span class="ft-success">Action completed.</span>
```

---

## Utility Classes

### Spacing

- `.ft-mt-{0-8}` - Margin top
- `.ft-mb-{0-8}` - Margin bottom
- `.ft-ml-{0-4}` - Margin left
- `.ft-mr-{0-4}` - Margin right
- `.ft-p-{0-6}` - Padding
- `.ft-px-{0-4}` - Padding horizontal
- `.ft-py-{0-6}` - Padding vertical
- `.ft-gap-{1-4}` - Flex/grid gap

### Colors

- `.ft-bg-white`, `.ft-bg-black`, `.ft-bg-accent`, `.ft-bg-muted`
- `.ft-text-primary`, `.ft-text-inverse`, `.ft-text-muted`, `.ft-text-accent`

### Grid

```html
<div class="ft-grid">
  <div class="ft-col-6">Half width</div>
  <div class="ft-col-6">Half width</div>
</div>
```

### Alignment

- `.ft-left`, `.ft-right`, `.ft-center`
- `.ft-flex`, `.ft-flex-col`
- `.ft-items-start`, `.ft-items-center`, `.ft-items-end`
- `.ft-justify-start`, `.ft-justify-center`, `.ft-justify-end`, `.ft-justify-between`

---

## Responsive Breakpoints

| Name | Width | Columns |
|------|-------|---------|
| Desktop | 1024px+ | 12 |
| Tablet | 768px - 1023px | 8 |
| Mobile | < 768px | 4 |

---

## Validation

Run the brand compliance checklist at:
`specs/005-boss-office-brand/checklists/requirements.md`
