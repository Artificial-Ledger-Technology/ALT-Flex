/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/explicit-function-return-type */
'use client';

import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const MotionDiv = motion.div as any;

export default function Template({ children }: { children: React.ReactNode }): React.ReactElement {
  const shouldReduceMotion = useReducedMotion();

  // Defer framer-motion rendering to the client to avoid SSR hydration
  // mismatch: the server renders inline style values as strings (e.g.
  // opacity: "0") while the client expects numbers (opacity: 0), and
  // the server adds a transform property the client doesn't expect.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>{children}</div>;
  }

  return (
    <MotionDiv
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </MotionDiv>
  );
}
