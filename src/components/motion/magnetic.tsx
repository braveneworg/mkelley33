'use client';

import type { PointerEvent, ReactNode } from 'react';

import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

export function Magnetic({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { damping: 15, stiffness: 300 });
  const springY = useSpring(y, { damping: 15, stiffness: 300 });

  if (reduced) {
    return <span className="inline-block">{children}</span>;
  }

  function onPointerMove(event: PointerEvent<HTMLSpanElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * 0.2);
    y.set((event.clientY - rect.top - rect.height / 2) * 0.2);
  }

  function onPointerLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.span
      className="inline-block"
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.span>
  );
}
