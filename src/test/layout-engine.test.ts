import { describe, it, expect } from 'vitest';
import {
  tokenize,
  layoutText,
  getCaretPosition,
  hitTest,
  getSelectionBoxes,
  measureChar,
  buildFontString,
  getFontMetrics,
} from '../rich-text/layout-engine';
import { flattenDocument } from '../rich-text/document-model';
import { createEmptyDocument, createDocument, RichTextDocument } from '../rich-text/types';

describe('Layout Engine', () => {
  describe('buildFontString', () => {
    it('should build correct font string', () => {
      const style = {
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'bold' as const,
        fontStyle: 'italic' as const,
        color: '#000',
        underline: false,
        strikethrough: false,
        letterSpacing: 0,
        lineHeight: 1.4,
      };
      const fontStr = buildFontString(style);
      expect(fontStr).toBe('italic 700 16px Arial');
    });

    it('should handle numeric weight', () => {
      const style = {
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 500 as const,
        fontStyle: 'normal' as const,
        color: '#000',
        underline: false,
        strikethrough: false,
        letterSpacing: 0,
        lineHeight: 1.4,
      };
      const fontStr = buildFontString(style);
      expect(fontStr).toBe('normal 500 16px Arial');
    });
  });

  describe('measureChar', () => {
    it('should measure character width', () => {
      const style = {
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'normal' as const,
        fontStyle: 'normal' as const,
        color: '#000',
        underline: false,
        strikethrough: false,
        letterSpacing: 0,
        lineHeight: 1.4,
      };
      const width = measureChar('A', style);
      expect(width).toBeGreaterThan(0);
    });

    it('should add letter spacing to width', () => {
      const style = {
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'normal' as const,
        fontStyle: 'normal' as const,
        color: '#000',
        underline: false,
        strikethrough: false,
        letterSpacing: 5,
        lineHeight: 1.4,
      };
      const width = measureChar('A', style);
      // Mock returns 10 for each char, plus 5 spacing
      expect(width).toBe(15);
    });
  });

  describe('getFontMetrics', () => {
    it('should return font metrics', () => {
      const style = {
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'normal' as const,
        fontStyle: 'normal' as const,
        color: '#000',
        underline: false,
        strikethrough: false,
        letterSpacing: 0,
        lineHeight: 1.4,
      };
      const metrics = getFontMetrics(style);
      expect(metrics.ascent).toBeGreaterThan(0);
      expect(metrics.descent).toBeGreaterThan(0);
      expect(metrics.height).toBe(metrics.ascent + metrics.descent);
    });
  });

  describe('tokenize', () => {
    it('should tokenize empty array', () => {
      const tokens = tokenize([]);
      expect(tokens).toHaveLength(0);
    });

    it('should tokenize single word', () => {
      const doc = createDocument('Hello');
      const chars = flattenDocument(doc);
      const tokens = tokenize(chars);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('word');
      expect(tokens[0].chars).toHaveLength(5);
    });

    it('should separate words and spaces', () => {
      const doc = createDocument('Hello World');
      const chars = flattenDocument(doc);
      const tokens = tokenize(chars);
      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe('word');
      expect(tokens[1].type).toBe('whitespace');
      expect(tokens[2].type).toBe('word');
    });

    it('should handle newlines', () => {
      const doc = createDocument('Hello\nWorld');
      const chars = flattenDocument(doc);
      const tokens = tokenize(chars);
      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe('word');
      expect(tokens[1].type).toBe('newline');
      expect(tokens[2].type).toBe('word');
    });

    it('should calculate token widths', () => {
      const doc = createDocument('ABC');
      const chars = flattenDocument(doc);
      const tokens = tokenize(chars);
      expect(tokens[0].width).toBeGreaterThan(0);
    });
  });

  describe('layoutText', () => {
    it('should layout empty document', () => {
      const doc = createEmptyDocument();
      const layout = layoutText(doc, 400, 300);
      expect(layout.lines).toBeDefined();
      expect(layout.width).toBe(400);
      expect(layout.height).toBe(300);
    });

    it('should layout single line', () => {
      const doc = createDocument('Hello');
      const layout = layoutText(doc, 400, 300);
      expect(layout.lines.length).toBeGreaterThanOrEqual(1);
      expect(layout.chars).toHaveLength(5);
    });

    it('should position characters', () => {
      const doc = createDocument('Hello');
      const layout = layoutText(doc, 400, 300);
      layout.chars.forEach((char) => {
        expect(char.x).toBeGreaterThanOrEqual(0);
        expect(char.y).toBeGreaterThanOrEqual(0);
        expect(char.width).toBeGreaterThan(0);
        expect(char.height).toBeGreaterThan(0);
      });
    });

    it('should handle document with no spans', () => {
      const doc: RichTextDocument = {
        spans: [],
        align: 'left',
        verticalAlign: 'top',
        padding: 8,
        listItems: new Map(),
      };
      const layout = layoutText(doc, 400, 300);
      expect(layout.lines).toBeDefined();
      expect(layout.chars).toHaveLength(0);
    });

    it('should wrap long lines', () => {
      const longText = 'This is a very long text that should wrap to multiple lines when rendered';
      const doc = createDocument(longText);
      const layout = layoutText(doc, 200, 300); // Narrow container
      expect(layout.lines.length).toBeGreaterThan(1);
    });

    it('should handle explicit line breaks', () => {
      const doc = createDocument('Line1\nLine2\nLine3');
      const layout = layoutText(doc, 400, 300);
      expect(layout.lines.length).toBe(3);
    });

    it('should apply text alignment', () => {
      const doc = createDocument('Hello', { fontSize: 16 });
      doc.align = 'center';
      const layout = layoutText(doc, 400, 300);
      if (layout.chars.length > 0) {
        // First char should not be at padding position if centered
        expect(layout.chars[0].x).toBeGreaterThan(doc.padding);
      }
    });

    it('should respect padding', () => {
      const doc = createDocument('Hello');
      doc.padding = 20;
      const layout = layoutText(doc, 400, 300);
      if (layout.chars.length > 0) {
        expect(layout.chars[0].x).toBeGreaterThanOrEqual(20);
      }
    });
  });

  describe('getCaretPosition', () => {
    it('should get caret at start of empty document', () => {
      const doc = createEmptyDocument();
      const layout = layoutText(doc, 400, 300);
      const pos = getCaretPosition(layout, 0, doc);
      expect(pos.x).toBe(doc.padding);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.height).toBeGreaterThan(0);
    });

    it('should get caret at start of text', () => {
      const doc = createDocument('Hello');
      const layout = layoutText(doc, 400, 300);
      const pos = getCaretPosition(layout, 0, doc);
      expect(pos.x).toBe(layout.chars[0].x);
    });

    it('should get caret at end of text', () => {
      const doc = createDocument('Hello');
      const layout = layoutText(doc, 400, 300);
      const pos = getCaretPosition(layout, 5, doc);
      const lastChar = layout.chars[4];
      expect(pos.x).toBe(lastChar.x + lastChar.width);
    });

    it('should get caret in middle', () => {
      const doc = createDocument('Hello');
      const layout = layoutText(doc, 400, 300);
      const pos = getCaretPosition(layout, 2, doc);
      const prevChar = layout.chars[1];
      expect(pos.x).toBe(prevChar.x + prevChar.width);
    });
  });

  describe('hitTest', () => {
    it('should return 0 for empty document', () => {
      const doc = createEmptyDocument();
      const layout = layoutText(doc, 400, 300);
      const pos = hitTest(layout, 50, 50, doc);
      expect(pos).toBe(0);
    });

    it('should find character position', () => {
      const doc = createDocument('Hello');
      const layout = layoutText(doc, 400, 300);
      // Click on first character
      const firstChar = layout.chars[0];
      const pos = hitTest(layout, firstChar.x + 1, firstChar.y + 1, doc);
      expect(pos).toBe(0);
    });

    it('should handle click after last character', () => {
      const doc = createDocument('Hello');
      const layout = layoutText(doc, 400, 300);
      const lastChar = layout.chars[4];
      const pos = hitTest(layout, lastChar.x + lastChar.width + 10, lastChar.y, doc);
      expect(pos).toBe(5);
    });

    it('should handle click above first line', () => {
      const doc = createDocument('Hello');
      const layout = layoutText(doc, 400, 300);
      const pos = hitTest(layout, 100, -10, doc);
      expect(pos).toBeGreaterThanOrEqual(0);
    });

    it('should handle click below last line', () => {
      const doc = createDocument('Hello');
      const layout = layoutText(doc, 400, 300);
      const pos = hitTest(layout, 100, 1000, doc);
      expect(pos).toBeLessThanOrEqual(5);
    });
  });

  describe('getSelectionBoxes', () => {
    it('should return empty for no selection', () => {
      const doc = createDocument('Hello');
      const layout = layoutText(doc, 400, 300);
      const boxes = getSelectionBoxes(layout, 0, 0);
      expect(boxes).toHaveLength(0);
    });

    it('should return empty for invalid range', () => {
      const doc = createDocument('Hello');
      const layout = layoutText(doc, 400, 300);
      const boxes = getSelectionBoxes(layout, 5, 3);
      expect(boxes).toHaveLength(0);
    });

    it('should return selection box for single line', () => {
      const doc = createDocument('Hello');
      const layout = layoutText(doc, 400, 300);
      const boxes = getSelectionBoxes(layout, 0, 5);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].width).toBeGreaterThan(0);
      expect(boxes[0].height).toBeGreaterThan(0);
    });

    it('should return multiple boxes for multiple lines', () => {
      const doc = createDocument('Hello\nWorld');
      const layout = layoutText(doc, 400, 300);
      const boxes = getSelectionBoxes(layout, 0, 11); // Select all
      expect(boxes.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle empty layout', () => {
      const doc = createEmptyDocument();
      const layout = layoutText(doc, 400, 300);
      const boxes = getSelectionBoxes(layout, 0, 5);
      expect(boxes).toHaveLength(0);
    });
  });
});
