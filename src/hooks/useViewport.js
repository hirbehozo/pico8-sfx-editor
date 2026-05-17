import { useState, useEffect } from 'react';

function measure() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    w, h,
    isLandscape:  w > h,
    isCompact:    w < 900,        // portrait tablet or phone
    isTouch:      window.matchMedia('(pointer: coarse)').matches,
  };
}

export function useViewport() {
  const [vp, setVp] = useState(measure);
  useEffect(() => {
    const update = () => setVp(measure());
    window.addEventListener('resize', update);
    // Also react to orientation changes (Safari fires resize, but belt-and-suspenders)
    screen.orientation?.addEventListener('change', update);
    return () => {
      window.removeEventListener('resize', update);
      screen.orientation?.removeEventListener('change', update);
    };
  }, []);
  return vp;
}
