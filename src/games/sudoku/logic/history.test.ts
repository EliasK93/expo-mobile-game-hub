import { canRedo, canUndo, push, redo, start, undo } from './history';

describe('history', () => {
  it('starts with nothing to undo or redo', () => {
    const h = start('a');
    expect(h).toEqual({ past: [], present: 'a', future: [] });
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
  });

  it('push makes the new value present and undoable', () => {
    const h = push(start('a'), 'b');
    expect(h).toEqual({ past: ['a'], present: 'b', future: [] });
    expect(canUndo(h)).toBe(true);
  });

  it('push of the same value (===) creates no step', () => {
    const h = push(start('a'), 'b');
    expect(push(h, 'b')).toBe(h);
  });

  it('undo and redo walk back and forth', () => {
    const h = push(push(start('a'), 'b'), 'c');
    const u = undo(h);
    expect(u).toEqual({ past: ['a'], present: 'b', future: ['c'] });
    expect(canRedo(u)).toBe(true);
    expect(redo(u)).toEqual(h);
  });

  it('undo and redo return the same history when there is nothing to do', () => {
    const h = start('a');
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
  });

  it('push after undo clears the redo steps', () => {
    const h = push(undo(push(start('a'), 'b')), 'c');
    expect(h).toEqual({ past: ['a'], present: 'c', future: [] });
    expect(canRedo(h)).toBe(false);
  });
});
