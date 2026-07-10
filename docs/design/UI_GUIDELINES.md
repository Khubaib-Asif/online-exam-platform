# Online Exam Platform — UI Guidelines (UI)

**Project:** `online-exam-platform`
**Document Maintainer:** M. Khubaib Asif
**Version:** 1.0
**Related Documents:** `HIGH_LEVEL_DESIGN.md`, `LOW_LEVEL_DESIGN.md`

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Design Philosophy](#2-design-philosophy)
3. [What We Explicitly Avoid](#3-what-we-explicitly-avoid)
4. [Design Identity](#4-design-identity)
5. [Timelessness](#5-timelessness)
6. [Visual Language](#6-visual-language)
7. [Information Density](#7-information-density)
8. [Consistency](#8-consistency)
9. [Interaction](#9-interaction)
10. [Accessibility](#10-accessibility)
11. [AI Development Rule](#11-development-rule)
12. [Source of Truth](#12-source-of-truth)

---

## 1.Purpose

This document defines the visual design language for every user interface
within the Online Exam Platform.

It establishes the principles that guide design decisions across all
modules.

Component specifications, layout patterns, and implementation details are
defined elsewhere.

---

## 2. Design Philosophy

This platform is an examination system, not a marketing website.

The interface must communicate confidence, precision, professionalism,
and trustworthiness.

Every screen should feel intentionally designed by experienced product
designers rather than automatically assembled from generic component
libraries.

The design language prioritizes:

- clarity over decoration
- consistency over novelty
- density over excessive whitespace
- precision over visual trends
- usability under pressure over aesthetics for screenshots

The interface should present a coherent and recognizable product identity.
Users should immediately recognize the interface as purpose-built
software, not a template.

---

## 3. What We Explicitly Avoid

Do not imitate current generic,AI-generated dashboard aesthetics.

Avoid:

- oversized rounded cards
- excessive border radii
- pastel gradients
- floating glassmorphism
- neumorphism
- random accent colors
- oversized hero sections
- unnecessary illustrations
- oversized icons
- decorative animations
- empty whitespace used only for visual trendiness
- inconsistent spacing
- consumer-app styling

If a design resembles a generic Figma template, a Tailwind landing page,
or an automatically generated dashboard, it should be reconsidered.

---

## 4. Design Identity

The visual language should resemble professional examination, financial,
aviation, medical, and engineering software.

Reference quality:

- Pearson VUE
- ExamSoft
- Bloomberg Terminal (information density, not visual style)
- JetBrains IDEs (clarity and consistency)

The objective is timeless professional software, not trend-driven web
design.

---

## 5. Timelessness

Interfaces should still look appropriate five to ten years from now.

Do not chase design trends.

Prioritize longevity.

Every visual decision should continue to make sense even after current
UI trends disappear.

---

## 6. Visual Language

### Color

Primary: Dark navy

Accent: Muted slate blue

Feedback colors: Reserved exclusively for semantic meaning.

Never use color purely for decoration.

### Typography

Body: System sans-serif

Numeric information: Monospace

Hierarchy should come from typography, spacing, and alignment rather than
excessive color.

### Geometry

Corners: 2px radius maximum.

Buttons: Rectangular.

Tables: Dense.

Forms: Compact.

Avoid soft, pill-shaped interfaces.

---

## 7. Information Density

Every pixel should contribute useful information.

Whitespace exists to improve readability, not to imitate modern design
trends.

Large monitors should expose more information, not larger empty areas.

---

## 8. Consistency

Every module belongs to one product.

Authentication, Student, Teacher, Proctor, Administration, Grading,
Reporting must all appear to have been designed by the same design team.

Do not introduce different visual styles between modules.

---

## 9. Interaction

Interfaces should minimize user effort.

Common actions must always appear in predictable locations.

Keyboard navigation is a first-class requirement.

Focus indicators must always be visible.

Dialogs should never interrupt workflow unnecessarily.

---

## 10. Accessibility

Accessibility is part of the design, not an optional enhancement.

Meet WCAG AA contrast requirements.

Support keyboard-only operation.

Never communicate meaning using color alone.

---

## 11. Development Rule

When multiple reasonable UI implementations exist, prefer the one that
best preserves:

- visual consistency
- professional appearance
- information density
- long-term maintainability

Do not introduce trendy design elements unless explicitly requested by
the project owner.

---

## 12. Source of Truth

This document defines the project's UI design language.

Other project documentation should reference this document rather than
duplicating UI rules.