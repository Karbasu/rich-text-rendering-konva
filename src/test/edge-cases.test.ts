import { describe, it, expect } from 'vitest';
import {
  flattenDocument,
  insertText,
  deleteRange,
  absoluteToSpanPosition,
  getStyleAtPosition,
} from '../rich-text/document-model';
import { layoutText, getCaretPosition, hitTest } from '../rich-text/layout-engine';
import { RichTextDocument, DEFAULT_STYLE } from '../rich-text/types';

describe('Edge Cases - Empty Spans Array', () => {
  const emptySpansDoc: RichTextDocument = {
    spans: [],
    align: 'left',
    verticalAlign: 'top',
    padding: 8,
    listItems: new Map(),
  };

  it('should handle absoluteToSpanPosition with empty spans', () => {
    const pos = absoluteToSpanPosition(emptySpansDoc, 0);
    expect(pos.spanIndex).toBe(0);
    expect(pos.charOffset).toBe(0);
  });

  it('should handle flattenDocument with empty spans', () => {
    const chars = flattenDocument(emptySpansDoc);
    expect(chars).toHaveLength(0);
  });

  it('should handle insertText with empty spans', () => {
    const newDoc = insertText(emptySpansDoc, 0, 'Hello');
    expect(newDoc.spans).toHaveLength(1);
    expect(newDoc.spans[0].text).toBe('Hello');
  });

  it('should handle deleteRange with empty spans', () => {
    const newDoc = deleteRange(emptySpansDoc, 0, 5);
    expect(newDoc.spans).toHaveLength(1);
  });

  it('should handle getStyleAtPosition with empty spans', () => {
    const style = getStyleAtPosition(emptySpansDoc, 0);
    expect(style).toBeDefined();
    expect(style.fontFamily).toBe(DEFAULT_STYLE.fontFamily);
  });

  it('should handle layoutText with empty spans', () => {
    const layout = layoutText(emptySpansDoc, 400, 300);
    expect(layout.lines).toBeDefined();
    expect(layout.chars).toHaveLength(0);
  });

  it('should handle getCaretPosition with empty spans layout', () => {
    const layout = layoutText(emptySpansDoc, 400, 300);
    const pos = getCaretPosition(layout, 0, emptySpansDoc);
    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeGreaterThanOrEqual(0);
    expect(pos.height).toBeGreaterThan(0);
  });

  it('should handle hitTest with empty spans layout', () => {
    const layout = layoutText(emptySpansDoc, 400, 300);
    const pos = hitTest(layout, 100, 100, emptySpansDoc);
    expect(pos).toBe(0);
  });
});

describe('Edge Cases - Boundary Conditions', () => {
  it('should handle very long text', () => {
    const longText = 'A'.repeat(10000);
    const doc: RichTextDocument = {
      spans: [{ id: 'test', text: longText, style: DEFAULT_STYLE }],
      align: 'left',
      verticalAlign: 'top',
      padding: 8,
      listItems: new Map(),
    };
    const layout = layoutText(doc, 400, 300);
    expect(layout.chars.length).toBe(10000);
  });

  it('should handle special characters', () => {
    const doc: RichTextDocument = {
      spans: [{ id: 'test', text: '!@#$%^&*()_+{}|:"<>?`~', style: DEFAULT_STYLE }],
      align: 'left',
      verticalAlign: 'top',
      padding: 8,
      listItems: new Map(),
    };
    const layout = layoutText(doc, 400, 300);
    expect(layout.chars.length).toBe(22); // Corrected count
  });

  it('should handle unicode characters', () => {
    const doc: RichTextDocument = {
      spans: [{ id: 'test', text: '你好世界🌍', style: DEFAULT_STYLE }],
      align: 'left',
      verticalAlign: 'top',
      padding: 8,
      listItems: new Map(),
    };
    const chars = flattenDocument(doc);
    expect(chars.length).toBe(6); // 4 Chinese chars + 2 for emoji (surrogate pair)
  });

  it('should handle multiple newlines', () => {
    const doc: RichTextDocument = {
      spans: [{ id: 'test', text: '\n\n\n', style: DEFAULT_STYLE }],
      align: 'left',
      verticalAlign: 'top',
      padding: 8,
      listItems: new Map(),
    };
    const layout = layoutText(doc, 400, 300);
    expect(layout.lines.length).toBe(3);
  });

  it('should handle only whitespace', () => {
    const doc: RichTextDocument = {
      spans: [{ id: 'test', text: '   ', style: DEFAULT_STYLE }],
      align: 'left',
      verticalAlign: 'top',
      padding: 8,
      listItems: new Map(),
    };
    const layout = layoutText(doc, 400, 300);
    expect(layout.chars.length).toBe(3);
  });

  it('should handle zero padding', () => {
    const doc: RichTextDocument = {
      spans: [{ id: 'test', text: 'Hello', style: DEFAULT_STYLE }],
      align: 'left',
      verticalAlign: 'top',
      padding: 0,
      listItems: new Map(),
    };
    const layout = layoutText(doc, 400, 300);
    expect(layout.chars[0].x).toBeGreaterThanOrEqual(0);
  });

  it('should handle very narrow container', () => {
    const doc: RichTextDocument = {
      spans: [{ id: 'test', text: 'Hello World', style: DEFAULT_STYLE }],
      align: 'left',
      verticalAlign: 'top',
      padding: 8,
      listItems: new Map(),
    };
    const layout = layoutText(doc, 50, 300); // Very narrow
    expect(layout.lines.length).toBeGreaterThan(1);
  });

  it('should handle position beyond document length', () => {
    const doc: RichTextDocument = {
      spans: [{ id: 'test', text: 'Hi', style: DEFAULT_STYLE }],
      align: 'left',
      verticalAlign: 'top',
      padding: 8,
      listItems: new Map(),
    };
    const pos = absoluteToSpanPosition(doc, 100);
    expect(pos.spanIndex).toBe(0);
    expect(pos.charOffset).toBe(2); // Clamped to end
  });
});
