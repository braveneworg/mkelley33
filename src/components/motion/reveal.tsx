/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import type { ReactNode } from 'react';

import { motion, useReducedMotion } from 'motion/react';

export const Reveal = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      transition={{ bounce: 0.2, delay, duration: 0.6, type: 'spring' }}
      viewport={{ amount: 0.2, once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      {children}
    </motion.div>
  );
};
