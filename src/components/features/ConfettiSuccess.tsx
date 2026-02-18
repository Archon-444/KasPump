'use client';

import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

export interface ConfettiSuccessProps {
  trigger: boolean;
  duration?: number;
  particleCount?: number;
}

export const ConfettiSuccess: React.FC<ConfettiSuccessProps> = ({
  trigger,
  duration = 3000,
  particleCount = 200,
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      const handleResize = () => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (trigger) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [trigger, duration]);

  if (!showConfetti || windowSize.width === 0 || windowSize.height === 0) {
    return null;
  }

  return (
    <Confetti
      width={windowSize.width}
      height={windowSize.height}
      recycle={false}
      numberOfPieces={particleCount}
      gravity={0.3}
      colors={['#A855F7', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />
  );
};

