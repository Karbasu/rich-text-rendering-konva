// ============================================================================
// RichText Component - Reusable Rich Text Component for Konva
// ============================================================================

import Konva from 'konva';
import { RichTextNode } from '../rich-text/RichTextNode';
import {
  RichTextDocument,
  TextStyle,
  createEmptyDocument,
  createDocument,
} from '../rich-text';

/**
 * Configuration for RichText component
 */
export interface RichTextConfig extends Konva.ContainerConfig {
  x?: number;
  y?: number;
  width: number;
  height: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  text?: string;
  document?: RichTextDocument;
  style?: Partial<TextStyle>;
  placeholder?: string;
  editable?: boolean;
  draggable?: boolean;
  // Alignment
  align?: 'left' | 'center' | 'right' | 'justify';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  // Padding
  padding?: number;
}

/**
 * RichText - A reusable rich text component for Konva
 *
 * Usage:
 * ```typescript
 * const richText = new RichText({
 *   x: 100,
 *   y: 100,
 *   width: 300,
 *   height: 200,
 *   text: 'Hello World',
 *   style: { fontSize: 18, color: '#333' },
 *   draggable: true
 * });
 *
 * layer.add(richText);
 *
 * // Apply transformations
 * richText.scale({ x: 1.5, y: 1.5 });
 * richText.rotate(45);
 *
 * // Edit text
 * richText.setText('New text');
 * richText.applyStyle({ fontWeight: 'bold' });
 * ```
 */
export class RichText extends Konva.Group {
  private _richTextNode: RichTextNode;
  private _width: number;
  private _height: number;

  constructor(config: RichTextConfig) {
    // Extract width/height and RichText-specific props before passing to super
    // (Konva.Group doesn't have these properties)
    const {
      width,
      height,
      text,
      document: docConfig,
      style,
      placeholder,
      editable,
      align,
      verticalAlign,
      padding,
      ...groupConfig
    } = config;

    super(groupConfig);

    this._width = width;
    this._height = height;

    // Create the document
    let document: RichTextDocument;
    if (docConfig) {
      document = docConfig;
    } else if (text) {
      document = createDocument(text, style);
    } else {
      document = createEmptyDocument();
    }

    // Apply alignment if provided
    if (align) {
      document = { ...document, align };
    }
    if (verticalAlign) {
      document = { ...document, verticalAlign };
    }
    if (padding !== undefined) {
      document = { ...document, padding };
    }

    // Create the internal RichTextNode
    this._richTextNode = new RichTextNode({
      x: 0,
      y: 0,
      width: this._width,
      height: this._height,
      document,
      placeholder,
      editable,
    });

    // Add to group
    this.add(this._richTextNode);

    // Set up event forwarding
    this._setupEventForwarding();
  }

  /**
   * Forward events from RichTextNode to this component
   */
  private _setupEventForwarding(): void {
    this._richTextNode.on('editstart', () => {
      this.fire('editstart');
    });

    this._richTextNode.on('editend', () => {
      this.fire('editend');
    });

    this._richTextNode.on('textchange', () => {
      this.fire('textchange');
    });
  }

  // ============================================================================
  // Dimension Methods (override to handle internal node)
  // ============================================================================

  /**
   * Get width
   */
  public getWidth(): number {
    return this._width;
  }

  /**
   * Set width
   */
  public setWidth(width: number): this {
    this._width = width;
    this._richTextNode.setWidth(width);
    return this;
  }

  /**
   * Get height
   */
  public getHeight(): number {
    return this._height;
  }

  /**
   * Set height
   */
  public setHeight(height: number): this {
    this._height = height;
    this._richTextNode.setHeight(height);
    return this;
  }

  /**
   * Set size (width and height)
   */
  public setSize(width: number, height: number): this {
    this._width = width;
    this._height = height;
    this._richTextNode.setSize(width, height);
    return this;
  }

  // ============================================================================
  // Text Content Methods
  // ============================================================================

  /**
   * Get plain text content
   */
  public getText(): string {
    return this._richTextNode.getText();
  }

  /**
   * Set plain text content
   */
  public setText(text: string): this {
    this._richTextNode.setText(text);
    return this;
  }

  /**
   * Get rich text document
   */
  public getDocument(): RichTextDocument {
    return this._richTextNode.getDocument();
  }

  /**
   * Set rich text document
   */
  public setDocument(document: RichTextDocument): this {
    this._richTextNode.setDocument(document);
    return this;
  }

  // ============================================================================
  // Editing Methods
  // ============================================================================

  /**
   * Start editing mode
   */
  public startEditing(): this {
    this._richTextNode.startEditing();
    return this;
  }

  /**
   * Stop editing mode
   */
  public stopEditing(): this {
    this._richTextNode.stopEditing();
    return this;
  }

  /**
   * Check if currently editing
   */
  public isEditing(): boolean {
    return this._richTextNode.isEditing();
  }

  // ============================================================================
  // Styling Methods
  // ============================================================================

  /**
   * Apply style to current selection or all text
   */
  public applyStyle(style: Partial<TextStyle>): this {
    this._richTextNode.applyStyle(style);
    return this;
  }

  /**
   * Toggle bold on selection
   */
  public toggleBold(): this {
    this._richTextNode.toggleBold();
    return this;
  }

  /**
   * Toggle italic on selection
   */
  public toggleItalic(): this {
    this._richTextNode.toggleItalic();
    return this;
  }

  /**
   * Toggle underline on selection
   */
  public toggleUnderline(): this {
    this._richTextNode.toggleUnderline();
    return this;
  }

  /**
   * Toggle strikethrough on selection
   */
  public toggleStrikethrough(): this {
    this._richTextNode.toggleStrikethrough();
    return this;
  }

  // ============================================================================
  // Alignment Methods
  // ============================================================================

  /**
   * Set text alignment
   */
  public setAlign(align: 'left' | 'center' | 'right' | 'justify'): this {
    this._richTextNode.setAlign(align);
    return this;
  }

  /**
   * Get current alignment
   */
  public getAlign(): 'left' | 'center' | 'right' | 'justify' {
    return this._richTextNode.getAlign();
  }

  /**
   * Set vertical alignment
   */
  public setVerticalAlign(align: 'top' | 'middle' | 'bottom'): this {
    this._richTextNode.setVerticalAlign(align);
    return this;
  }

  /**
   * Get vertical alignment
   */
  public getVerticalAlign(): 'top' | 'middle' | 'bottom' {
    return this._richTextNode.getVerticalAlign();
  }

  // ============================================================================
  // List Methods
  // ============================================================================

  /**
   * Toggle bullet list
   */
  public toggleBulletList(): this {
    this._richTextNode.toggleBulletList();
    return this;
  }

  /**
   * Toggle numbered list
   */
  public toggleNumberedList(): this {
    this._richTextNode.toggleNumberedList();
    return this;
  }

  // ============================================================================
  // Selection Methods
  // ============================================================================

  /**
   * Select all text
   */
  public selectAll(): this {
    this._richTextNode.selectAll();
    return this;
  }

  // ============================================================================
  // History Methods
  // ============================================================================

  /**
   * Undo last action
   */
  public undo(): this {
    this._richTextNode.undo();
    return this;
  }

  /**
   * Redo last undone action
   */
  public redo(): this {
    this._richTextNode.redo();
    return this;
  }

  // ============================================================================
  // Transformation Helpers
  // ============================================================================

  /**
   * Scale uniformly
   */
  public scaleUniform(scale: number): this {
    this.scale({ x: scale, y: scale });
    return this;
  }

  /**
   * Rotate by degrees
   */
  public rotateDeg(degrees: number): this {
    this.rotation(degrees);
    return this;
  }

  /**
   * Rotate by radians
   */
  public rotateRad(radians: number): this {
    this.rotation(radians * (180 / Math.PI));
    return this;
  }

  /**
   * Reset all transformations
   */
  public resetTransform(): this {
    this.scaleX(1);
    this.scaleY(1);
    this.rotation(0);
    this.skewX(0);
    this.skewY(0);
    this.offsetX(0);
    this.offsetY(0);
    return this;
  }

  /**
   * Get bounding box
   */
  public getBoundingBox(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const pos = this.getAbsolutePosition();
    const scaleX = this.scaleX();
    const scaleY = this.scaleY();

    return {
      x: pos.x,
      y: pos.y,
      width: this._width * scaleX,
      height: this._height * scaleY,
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Clone this component
   */
  public clone(): RichText {
    const config: RichTextConfig = {
      x: this.x(),
      y: this.y(),
      width: this._width,
      height: this._height,
      scaleX: this.scaleX(),
      scaleY: this.scaleY(),
      rotation: this.rotation(),
      document: this._richTextNode.getDocument(),
      draggable: this.draggable(),
    };

    return new RichText(config);
  }

  /**
   * Destroy and cleanup
   */
  public destroy(): void {
    this._richTextNode.destroy();
    super.destroy();
  }

  /**
   * Export to JSON
   */
  public toJSON(): Record<string, unknown> {
    return {
      x: this.x(),
      y: this.y(),
      width: this._width,
      height: this._height,
      scaleX: this.scaleX(),
      scaleY: this.scaleY(),
      rotation: this.rotation(),
      document: this._richTextNode.getDocument(),
      draggable: this.draggable(),
    };
  }

  /**
   * Create from JSON
   */
  public static fromJSON(json: Record<string, unknown>): RichText {
    return new RichText({
      x: json.x as number,
      y: json.y as number,
      width: json.width as number,
      height: json.height as number,
      scaleX: json.scaleX as number || 1,
      scaleY: json.scaleY as number || 1,
      rotation: json.rotation as number || 0,
      document: json.document as RichTextDocument,
      draggable: json.draggable as boolean,
    });
  }
}

// Register with Konva for serialization support
(Konva as any).RichText = RichText;
