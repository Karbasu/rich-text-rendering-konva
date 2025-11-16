# Building a Custom Rich Text Editor in Canvas with Konva.js

A comprehensive guide to building your own rich text editor from scratch using HTML5 Canvas and Konva.js - no contenteditable, no hidden textareas, just pure canvas rendering.

## Why Build Your Own?

Most web text editors rely on `contenteditable` or hidden DOM elements. This approach has limitations:
- Inconsistent behavior across browsers
- Limited control over rendering
- Difficult to integrate with canvas-based applications (design tools, games)
- Cannot easily support advanced features (text on path, custom decorations)

By building your own, you get:
- Complete rendering control
- Consistent behavior everywhere
- Deep integration with canvas workflows
- Freedom to implement any feature

## Prerequisites

- Intermediate JavaScript/TypeScript knowledge
- Basic understanding of HTML5 Canvas API
- Familiarity with Konva.js basics
- Understanding of event handling and state management

## Tutorial Structure

This tutorial is divided into 6 parts, each building on the previous:

### [Part 1: Foundation - Document Model](./PART1_DOCUMENT_MODEL.md)
- Designing the data structure for rich text
- Spans, styles, and document representation
- Why immutability matters
- Helper functions for document manipulation

### [Part 2: Text Measurement & Layout Engine](./PART2_LAYOUT_ENGINE.md)
- Understanding text metrics in Canvas
- Tokenization: breaking text into words
- Line breaking algorithm
- Positioning characters with mixed styles
- Handling alignment and vertical positioning

### [Part 3: Rendering Pipeline](./PART3_RENDERING.md)
- Offscreen canvas pattern for performance
- Device pixel ratio and sharp text
- Rendering characters with styles
- Drawing decorations (underline, strikethrough)
- Background highlighting and effects

### [Part 4: Input Handling & Caret/Selection](./PART4_INPUT_SELECTION.md)
- Keyboard input without DOM elements
- Managing caret position
- Text selection with mouse
- Coordinate mapping (screen ↔ document position)
- Visual feedback (caret blinking, selection highlighting)

### [Part 5: Advanced Features](./PART5_ADVANCED.md)
- Implementing lists (bullet and numbered)
- Undo/Redo with history stack
- Copy/Paste handling
- Style toggles and formatting commands

### [Part 6: Integration & Polish](./PART6_INTEGRATION.md)
- Wrapping as a Konva node
- Transformer integration (resize, rotate)
- Performance optimization
- Testing strategies
- Common pitfalls and debugging

## Key Concepts Overview

Before diving in, understand these core concepts:

### 1. Document Model (Source of Truth)
```
Document
├── Spans[] (contiguous styled text runs)
├── Alignment settings
└── Metadata (lists, padding, etc.)
```

### 2. Layout Engine (Computation)
```
Document → Tokenize → Measure → Line Break → Position → Layout Result
```

### 3. Rendering (Visual Output)
```
Layout Result → Offscreen Canvas → Konva Image
```

### 4. Input/Selection (User Interaction)
```
Events → Update Document → Recalculate Layout → Re-render
```

## The Mental Model

Think of it like a word processor pipeline:

```
[User Input]
    ↓
[Document Model] ← Single source of truth
    ↓
[Layout Engine] ← Computes where each character goes
    ↓
[Renderer] ← Draws pixels to canvas
    ↓
[Screen] ← What user sees
```

Every keystroke:
1. Modifies the document model
2. Triggers layout recalculation
3. Re-renders the visual output

This separation is crucial for maintainability and performance.

## Technology Stack

- **Konva.js**: Canvas abstraction layer (shapes, events, transformations)
- **TypeScript**: Type safety for complex data structures
- **React** (optional): UI framework for toolbar and app shell
- **Vite**: Build tool

## Getting Started

Each part includes:
- **Conceptual explanation** of what we're building
- **Pseudo-code** for key algorithms
- **Key decisions** and trade-offs
- **Edge cases** to consider
- **Extension points** for customization

The goal is understanding, not copy-pasting. You'll learn the "why" behind each design decision so you can adapt it to your needs.

## Estimated Time

- Part 1: 2-3 hours
- Part 2: 4-5 hours (most complex)
- Part 3: 2-3 hours
- Part 4: 3-4 hours
- Part 5: 3-4 hours
- Part 6: 2-3 hours

Total: ~18-22 hours for a solid understanding

## Let's Begin!

Start with [Part 1: Foundation - Document Model](./PART1_DOCUMENT_MODEL.md) →

---

## Quick Reference

### Glossary

- **Span**: Contiguous run of text with same style
- **Token**: Word, whitespace, or newline for layout purposes
- **Layout Line**: Computed line with positioned characters
- **Absolute Position**: Character index in flattened document text
- **Caret**: The blinking cursor indicating insertion point
- **Hit Testing**: Converting screen coordinates to document position

### Key Files in a Typical Implementation

```
src/
├── rich-text/
│   ├── types.ts           # All type definitions
│   ├── document-model.ts  # Document manipulation functions
│   ├── layout-engine.ts   # Text measurement and positioning
│   ├── renderer.ts        # Canvas drawing functions
│   └── RichTextNode.ts    # Main Konva component
└── App.tsx                # Application shell
```

Ready? [Start Part 1 →](./PART1_DOCUMENT_MODEL.md)
