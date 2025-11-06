/**
 * ARIA Live Region Component
 * Provides screen reader announcements for dynamic content
 */

'use client';

import React, { useEffect, useRef } from 'react';

export type AriaLivePriority = 'polite' | 'assertive' | 'off';

export interface AriaLiveRegionProps {
  priority?: AriaLivePriority;
  children?: React.ReactNode;
  message?: string;
  id?: string;
}

/**
 * ARIA Live Region for screen reader announcements
 */
export const AriaLiveRegion: React.FC<AriaLiveRegionProps> = ({
  priority = 'polite',
  children,
  message,
  id = 'aria-live-region',
}) => {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && regionRef.current) {
      // Clear previous message
      regionRef.current.textContent = '';
      // Small delay to ensure screen reader picks up the change
      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = message;
        }
      }, 100);
    }
  }, [message]);

  return (
    <div
      ref={regionRef}
      id={id}
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {children || message}
    </div>
  );
};

/**
 * Hook for managing ARIA live announcements
 */
export const useAriaLive = () => {
  const [message, setMessage] = React.useState<string>('');
  const [priority, setPriority] = React.useState<AriaLivePriority>('polite');

  const announce = React.useCallback((text: string, livePriority: AriaLivePriority = 'polite') => {
    setPriority(livePriority);
    setMessage(text);
    // Clear message after announcement
    setTimeout(() => setMessage(''), 1000);
  }, []);

  return {
    announce,
    message,
    priority,
  };
};

/**
 * Global ARIA Live Region Provider
 * Should be placed in the root layout
 */
export const AriaLiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <AriaLiveRegion id="aria-live-polite" priority="polite" />
      <AriaLiveRegion id="aria-live-assertive" priority="assertive" />
    </>
  );
};

