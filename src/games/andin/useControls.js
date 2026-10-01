import { useCallback, useEffect, useRef, useState } from 'react';

export function useControls(inputRef, enabled, onInteract, onTool) {
  const held = useRef(new Set());
  const touch = useRef({ x: 0, z: 0 });
  const running = useRef(false);
  const callbacks = useRef({ onInteract, onTool });
  const [stick, setStick] = useState({ x: 0, z: 0 });
  const [runHeld, setRunHeld] = useState(false);
  useEffect(() => { callbacks.current = { onInteract, onTool }; }, [onInteract, onTool]);
  const update = useCallback(() => {
    const keys = held.current;
    let x = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')) + touch.current.x;
    let z = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup')) + touch.current.z;
    const length = Math.max(1, Math.hypot(x, z));
    x /= length;
    z /= length;
    inputRef.current = enabled ? { x: x * 0.8 + z * 0.6, z: -x * 0.6 + z * 0.8, run: keys.has('shift') || running.current } : { x: 0, z: 0, run: false };
  }, [enabled, inputRef]);
  useEffect(() => {
    const reset = () => {
      held.current.clear();
      touch.current = { x: 0, z: 0 };
      running.current = false;
      setStick({ x: 0, z: 0 });
      setRunHeld(false);
      inputRef.current = { x: 0, z: 0, run: false };
    };
    const down = (event) => {
      if (!enabled || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'e', '1', '2', '3', '4'].includes(key)) event.preventDefault();
      held.current.add(key);
      if (!event.repeat && key === 'e') callbacks.current.onInteract();
      if (!event.repeat && ['1', '2', '3', '4'].includes(key)) callbacks.current.onTool(Number(key) - 1);
      update();
    };
    const up = (event) => { held.current.delete(event.key.toLowerCase()); update(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', reset);
    return () => {
      reset();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', reset);
    };
  }, [enabled, inputRef, update]);
  const moveStick = useCallback((event) => {
    if (!enabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    let x = (event.clientX - rect.left - rect.width / 2) / (rect.width * 0.32);
    let z = (event.clientY - rect.top - rect.height / 2) / (rect.height * 0.32);
    const length = Math.max(1, Math.hypot(x, z));
    x /= length;
    z /= length;
    touch.current = { x, z };
    setStick({ x, z });
    update();
  }, [enabled, update]);
  const releaseStick = useCallback(() => {
    touch.current = { x: 0, z: 0 };
    setStick({ x: 0, z: 0 });
    update();
  }, [update]);
  const setRun = useCallback((value) => {
    running.current = value;
    setRunHeld(value);
    update();
  }, [update]);
  return { stick, moveStick, releaseStick, setRun, runHeld };
}
