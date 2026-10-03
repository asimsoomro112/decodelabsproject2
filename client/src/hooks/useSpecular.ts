import { useEffect, useRef } from 'react';

/**
 * Pointer-following specular highlight: writes --mx/--my on the element,
 * throttled with requestAnimationFrame. Desktop pointers only.
 */
export function useSpecular<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(pointer: coarse)').matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
        el.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
      });
    };
    el.addEventListener('pointermove', onMove);
    return () => {
      el.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return ref;
}
