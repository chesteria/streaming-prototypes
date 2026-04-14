/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as FocusController from './focus-controller';

describe('FocusController Adapter', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-focus-zone="zone-1">
        <button data-focusable="true" data-focus-id="btn-1">Item 1</button>
        <button data-focusable="true" data-focus-id="btn-2">Item 2</button>
      </div>
      <div data-focus-zone="zone-2">
        <button data-focusable="true" data-focus-id="btn-3">Item 3</button>
      </div>
    `;
    FocusController.init();
  });

  afterEach(() => {
    FocusController.destroy();
  });

  it('should discover and register zones from the DOM', () => {
    const onFocus = vi.fn();
    FocusController.registerZone('zone-1', { onFocus });
    
    FocusController.focusZone('zone-1');
    expect(onFocus).toHaveBeenCalled();
    expect(document.querySelector('[data-focus-id="btn-1"]')?.getAttribute('data-focused')).toBe('true');
  });

  it('should navigate between items in a zone', () => {
    FocusController.registerZone('zone-1');
    FocusController.focusZone('zone-1');
    
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    
    expect(document.querySelector('[data-focus-id="btn-1"]')?.getAttribute('data-focused')).toBeNull();
    expect(document.querySelector('[data-focus-id="btn-2"]')?.getAttribute('data-focused')).toBe('true');
  });

  it('should trigger onEdge when hitting a boundary', () => {
    const onEdge = vi.fn();
    FocusController.registerZone('zone-2', { onEdge });
    FocusController.focusZone('zone-2');
    
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(onEdge).toHaveBeenCalledWith('RIGHT');
    
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(onEdge).toHaveBeenCalledWith('DOWN');
  });

  it('should focus items by ID across zones', () => {
    FocusController.registerZone('zone-1');
    FocusController.registerZone('zone-2');
    
    const focused = FocusController.focusElementById('btn-3');
    expect(focused).toBe(true);
    expect(document.querySelector('[data-focus-id="btn-3"]')?.getAttribute('data-focused')).toBe('true');
  });

  it('should refresh a zone when DOM changes', () => {
    const onFocus = vi.fn();
    FocusController.registerZone('zone-1', { onFocus });
    
    // Add a new item
    const container = document.querySelector('[data-focus-zone="zone-1"]');
    if (container) {
      const newBtn = document.createElement('button');
      newBtn.setAttribute('data-focusable', 'true');
      newBtn.setAttribute('data-focus-id', 'btn-new');
      container.appendChild(newBtn);
    }
    
    FocusController.refreshZone('zone-1');
    
    // Move through the 3 items
    FocusController.focusZone('zone-1');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); // to btn-2
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); // to btn-new
    
    expect(document.querySelector('[data-focus-id="btn-new"]')?.getAttribute('data-focused')).toBe('true');
  });
});
