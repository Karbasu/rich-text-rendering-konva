// Setup for tests - mock canvas and other browser APIs
import { vi } from 'vitest';

// Mock canvas context
const mockContext = {
  font: '',
  fillStyle: '',
  strokeStyle: '',
  textBaseline: 'alphabetic' as const,
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  lineWidth: 1,
  lineJoin: 'miter' as const,
  globalAlpha: 1,
  scale: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  setLineDash: vi.fn(),
  measureText: vi.fn((text: string) => ({
    width: text.length * 10, // Simple mock: 10px per character
    actualBoundingBoxAscent: 12,
    actualBoundingBoxDescent: 3,
  })),
};

// Mock HTMLCanvasElement
// eslint-disable-next-line @typescript-eslint/no-explicit-any
HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext as any);

// Mock window properties
Object.defineProperty(window, 'devicePixelRatio', {
  value: 1,
  writable: true,
});
