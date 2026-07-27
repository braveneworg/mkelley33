/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import type { PointerEvent, ReactNode } from 'react';

import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

export const Magnetic = ({ children }: { children: ReactNode }) => {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { damping: 15, stiffness: 300 });
  const springY = useSpring(y, { damping: 15, stiffness: 300 });

  if (reduced) {
    return <span className="inline-block">{children}</span>;
  }

  const onPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * 0.2);
    y.set((event.clientY - rect.top - rect.height / 2) * 0.2);
  };

  const onPointerLeave = () => {
    x.set(0);
    y.set(0);
  };

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
};
