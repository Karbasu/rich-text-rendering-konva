import { describe, it, expect } from 'vitest';
import {
  flattenDocument,
  getDocumentLength,
  insertText,
  deleteRange,
  replaceSelection,
  getSelectedText,
  applyStyleToRange,
  toggleBoldInRange,
  toggleItalicInRange,
  absoluteToSpanPosition,
  spanToAbsolutePosition,
  getStyleAtPosition,
  cloneDocument,
} from '../rich-text/document-model';
import {
  createEmptyDocument,
  createDocument,
  DEFAULT_STYLE,
  RichTextDocument,
} from '../rich-text/types';

describe('Document Model', () => {
  describe('createEmptyDocument', () => {
    it('should create document with one empty span', () => {
      const doc = createEmptyDocument();
      expect(doc.spans).toHaveLength(1);
      expect(doc.spans[0].text).toBe('');
    });

    it('should have default alignment', () => {
      const doc = createEmptyDocument();
      expect(doc.align).toBe('left');
      expect(doc.verticalAlign).toBe('top');
    });
  });

  describe('createDocument', () => {
    it('should create document with given text', () => {
      const doc = createDocument('Hello World');
      expect(doc.spans[0].text).toBe('Hello World');
    });

    it('should apply custom styles', () => {
      const doc = createDocument('Test', { fontSize: 24, color: '#ff0000' });
      expect(doc.spans[0].style.fontSize).toBe(24);
      expect(doc.spans[0].style.color).toBe('#ff0000');
    });
  });

  describe('flattenDocument', () => {
    it('should flatten empty document', () => {
      const doc = createEmptyDocument();
      const chars = flattenDocument(doc);
      expect(chars).toHaveLength(0);
    });

    it('should flatten single span', () => {
      const doc = createDocument('ABC');
      const chars = flattenDocument(doc);
      expect(chars).toHaveLength(3);
      expect(chars[0].char).toBe('A');
      expect(chars[1].char).toBe('B');
      expect(chars[2].char).toBe('C');
    });

    it('should assign correct absolute indices', () => {
      const doc = createDocument('Hello');
      const chars = flattenDocument(doc);
      chars.forEach((c, i) => {
        expect(c.absoluteIndex).toBe(i);
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
      const chars = flattenDocument(doc);
      expect(chars).toHaveLength(0);
    });
  });

  describe('getDocumentLength', () => {
    it('should return 0 for empty document', () => {
      const doc = createEmptyDocument();
      expect(getDocumentLength(doc)).toBe(0);
    });

    it('should return correct length', () => {
      const doc = createDocument('Hello World');
      expect(getDocumentLength(doc)).toBe(11);
    });

    it('should handle document with no spans', () => {
      const doc: RichTextDocument = {
        spans: [],
        align: 'left',
        verticalAlign: 'top',
        padding: 8,
        listItems: new Map(),
      };
      expect(getDocumentLength(doc)).toBe(0);
    });
  });

  describe('absoluteToSpanPosition', () => {
    it('should handle position 0', () => {
      const doc = createDocument('Hello');
      const pos = absoluteToSpanPosition(doc, 0);
      expect(pos.spanIndex).toBe(0);
      expect(pos.charOffset).toBe(0);
    });

    it('should handle position at end', () => {
      const doc = createDocument('Hello');
      const pos = absoluteToSpanPosition(doc, 5);
      expect(pos.spanIndex).toBe(0);
      expect(pos.charOffset).toBe(5);
    });

    it('should handle position beyond document', () => {
      const doc = createDocument('Hello');
      const pos = absoluteToSpanPosition(doc, 100);
      expect(pos.spanIndex).toBe(0);
      expect(pos.charOffset).toBe(5);
    });

    it('should handle empty document', () => {
      const doc = createEmptyDocument();
      const pos = absoluteToSpanPosition(doc, 0);
      expect(pos.spanIndex).toBe(0);
      expect(pos.charOffset).toBe(0);
    });
  });

  describe('spanToAbsolutePosition', () => {
    it('should convert back correctly', () => {
      const doc = createDocument('Hello');
      const abs = spanToAbsolutePosition(doc, 0, 3);
      expect(abs).toBe(3);
    });
  });

  describe('insertText', () => {
    it('should insert at beginning', () => {
      const doc = createDocument('World');
      const newDoc = insertText(doc, 0, 'Hello ');
      expect(newDoc.spans[0].text).toBe('Hello World');
    });

    it('should insert at end', () => {
      const doc = createDocument('Hello');
      const newDoc = insertText(doc, 5, ' World');
      expect(newDoc.spans[0].text).toBe('Hello World');
    });

    it('should insert in middle', () => {
      const doc = createDocument('Hlo');
      const newDoc = insertText(doc, 1, 'el');
      expect(newDoc.spans[0].text).toBe('Hello');
    });

    it('should handle empty insert', () => {
      const doc = createDocument('Hello');
      const newDoc = insertText(doc, 2, '');
      expect(newDoc.spans[0].text).toBe('Hello');
    });

    it('should insert into empty document', () => {
      const doc = createEmptyDocument();
      const newDoc = insertText(doc, 0, 'Hello');
      expect(getDocumentLength(newDoc)).toBe(5);
    });

    it('should insert newline', () => {
      const doc = createDocument('HelloWorld');
      const newDoc = insertText(doc, 5, '\n');
      expect(newDoc.spans[0].text).toBe('Hello\nWorld');
    });
  });

  describe('deleteRange', () => {
    it('should delete from beginning', () => {
      const doc = createDocument('Hello World');
      const newDoc = deleteRange(doc, 0, 6);
      expect(newDoc.spans[0].text).toBe('World');
    });

    it('should delete from end', () => {
      const doc = createDocument('Hello World');
      const newDoc = deleteRange(doc, 5, 11);
      expect(newDoc.spans[0].text).toBe('Hello');
    });

    it('should delete in middle', () => {
      const doc = createDocument('Hello World');
      const newDoc = deleteRange(doc, 5, 6);
      expect(newDoc.spans[0].text).toBe('HelloWorld');
    });

    it('should handle empty range', () => {
      const doc = createDocument('Hello');
      const newDoc = deleteRange(doc, 2, 2);
      expect(newDoc.spans[0].text).toBe('Hello');
    });

    it('should handle invalid range', () => {
      const doc = createDocument('Hello');
      const newDoc = deleteRange(doc, 5, 3);
      expect(newDoc.spans[0].text).toBe('Hello');
    });

    it('should delete entire content', () => {
      const doc = createDocument('Hello');
      const newDoc = deleteRange(doc, 0, 5);
      expect(getDocumentLength(newDoc)).toBe(0);
      expect(newDoc.spans).toHaveLength(1); // Should keep one empty span
    });
  });

  describe('replaceSelection', () => {
    it('should replace selection with text', () => {
      const doc = createDocument('Hello World');
      const selection = { anchor: 0, focus: 5 };
      const { doc: newDoc, newPosition } = replaceSelection(doc, selection, 'Hi');
      expect(newDoc.spans[0].text).toBe('Hi World');
      expect(newPosition).toBe(2);
    });

    it('should handle collapsed selection', () => {
      const doc = createDocument('Hello');
      const selection = { anchor: 5, focus: 5 };
      const { doc: newDoc, newPosition } = replaceSelection(doc, selection, ' World');
      expect(newDoc.spans[0].text).toBe('Hello World');
      expect(newPosition).toBe(11);
    });

    it('should handle backward selection', () => {
      const doc = createDocument('Hello World');
      const selection = { anchor: 5, focus: 0 };
      const { doc: newDoc } = replaceSelection(doc, selection, 'Hi');
      expect(newDoc.spans[0].text).toBe('Hi World');
    });
  });

  describe('getSelectedText', () => {
    it('should get selected text', () => {
      const doc = createDocument('Hello World');
      const selection = { anchor: 0, focus: 5 };
      const text = getSelectedText(doc, selection);
      expect(text).toBe('Hello');
    });

    it('should handle backward selection', () => {
      const doc = createDocument('Hello World');
      const selection = { anchor: 11, focus: 6 };
      const text = getSelectedText(doc, selection);
      expect(text).toBe('World');
    });

    it('should handle empty selection', () => {
      const doc = createDocument('Hello');
      const selection = { anchor: 2, focus: 2 };
      const text = getSelectedText(doc, selection);
      expect(text).toBe('');
    });
  });

  describe('applyStyleToRange', () => {
    it('should apply color to range', () => {
      const doc = createDocument('Hello World');
      const newDoc = applyStyleToRange(doc, 0, 5, { color: '#ff0000' });
      const chars = flattenDocument(newDoc);
      expect(chars[0].style.color).toBe('#ff0000');
      expect(chars[5].style.color).toBe('#000000'); // Space, original color
    });

    it('should handle empty range', () => {
      const doc = createDocument('Hello');
      const newDoc = applyStyleToRange(doc, 2, 2, { color: '#ff0000' });
      expect(newDoc.spans[0].text).toBe('Hello');
    });
  });

  describe('toggleBoldInRange', () => {
    it('should toggle bold on', () => {
      const doc = createDocument('Hello');
      const newDoc = toggleBoldInRange(doc, 0, 5);
      const chars = flattenDocument(newDoc);
      expect(chars[0].style.fontWeight).toBe('bold');
    });

    it('should toggle bold off when all bold', () => {
      const doc = createDocument('Hello', { fontWeight: 'bold' });
      const newDoc = toggleBoldInRange(doc, 0, 5);
      const chars = flattenDocument(newDoc);
      expect(chars[0].style.fontWeight).toBe('normal');
    });
  });

  describe('toggleItalicInRange', () => {
    it('should toggle italic on', () => {
      const doc = createDocument('Hello');
      const newDoc = toggleItalicInRange(doc, 0, 5);
      const chars = flattenDocument(newDoc);
      expect(chars[0].style.fontStyle).toBe('italic');
    });
  });

  describe('getStyleAtPosition', () => {
    it('should get style at position', () => {
      const doc = createDocument('Hello', { fontSize: 24 });
      const style = getStyleAtPosition(doc, 2);
      expect(style.fontSize).toBe(24);
    });

    it('should handle empty document', () => {
      const doc = createEmptyDocument();
      const style = getStyleAtPosition(doc, 0);
      expect(style.fontFamily).toBe(DEFAULT_STYLE.fontFamily);
    });

    it('should handle document with no spans', () => {
      const doc: RichTextDocument = {
        spans: [],
        align: 'left',
        verticalAlign: 'top',
        padding: 8,
        listItems: new Map(),
      };
      const style = getStyleAtPosition(doc, 0);
      expect(style).toBeDefined();
    });
  });

  describe('cloneDocument', () => {
    it('should create deep copy', () => {
      const doc = createDocument('Hello');
      const clone = cloneDocument(doc);
      clone.spans[0].text = 'World';
      expect(doc.spans[0].text).toBe('Hello');
    });

    it('should clone styles deeply', () => {
      const doc = createDocument('Hello', { fontSize: 24 });
      const clone = cloneDocument(doc);
      clone.spans[0].style.fontSize = 12;
      expect(doc.spans[0].style.fontSize).toBe(24);
    });
  });
});
