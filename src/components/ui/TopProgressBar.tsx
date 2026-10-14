'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const activeRequests = useRef(0);
  const isNavigating = useRef(false);
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to start the progress animation
  const handleStart = (immediate = false) => {
    // If a finish timer is running (fade out), clear it so we resume smoothly
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }

    if (immediate) {
      setVisible(true);
      setProgress((prev) => (prev > 0 ? prev : 15));
    } else {
      if (!fetchTimerRef.current && !visible) {
        fetchTimerRef.current = setTimeout(() => {
          setVisible(true);
          setProgress(15);
          fetchTimerRef.current = null;
        }, 150); // 150ms delay to prevent flicker on rapid requests
      }
    }
  };

  // Helper to stop/complete the progress animation
  const handleStop = () => {
    // Clear any pending start timer
    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = null;
    }

    setProgress(100);

    // Fade out and reset after completion animation completes
    finishTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
      finishTimerRef.current = null;
    }, 300);
  };

  // Trigger completion when route changes (pathname or query parameters)
  useEffect(() => {
    if (isNavigating.current) {
      isNavigating.current = false;
      handleStop();
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    // Intercept anchor clicks to start progress bar early on page transition
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Skip external, mailto, tel, target="_blank", downloads, or hash fragments
      if (
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download') ||
        href.includes('#') ||
        href === ''
      ) {
        return;
      }

      // Skip modifier clicks (Cmd, Ctrl, Shift, Option, middle mouse clicks)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) {
        return;
      }

      // Avoid triggering if it's the exact same pathname and search params
      try {
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(href, window.location.href);
        if (currentUrl.pathname === targetUrl.pathname && currentUrl.search === targetUrl.search) {
          return;
        }
      } catch (err) {
        // Fallback for parsing errors
      }

      isNavigating.current = true;
      handleStart(true); // Start immediately for navigation
    };

    // Intercept router programmatical push/replace state
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      try {
        const nextUrl = args[2] ? new URL(String(args[2]), window.location.href) : null;
        if (nextUrl && nextUrl.pathname === window.location.pathname) {
          return originalPushState.apply(this, args);
        }
      } catch {}
      isNavigating.current = true;
      setTimeout(() => {
        handleStart(true);
      }, 0);
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function (...args) {
      try {
        const nextUrl = args[2] ? new URL(String(args[2]), window.location.href) : null;
        if (nextUrl && nextUrl.pathname === window.location.pathname) {
          return originalReplaceState.apply(this, args);
        }
      } catch {}
      isNavigating.current = true;
      setTimeout(() => {
        handleStart(true);
      }, 0);
      return originalReplaceState.apply(this, args);
    };

    document.addEventListener('click', handleAnchorClick, { capture: true });

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      document.removeEventListener('click', handleAnchorClick, { capture: true });
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, [visible]);

  // Slowly increment progress while visible and under 90% to simulate progress
  useEffect(() => {
    if (!visible || progress >= 90) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        const diff = 90 - prev;
        // Slow down as progress increases
        return prev + Math.max(1, diff * 0.12);
      });
    }, 200);

    return () => clearInterval(interval);
  }, [visible, progress]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none transition-all duration-300 ease-out"
      style={{
        width: `${progress}%`,
        opacity: progress === 100 ? 0 : 1,
        // High-end vibrant gradient styling using tailwind or inline background
        background: 'linear-gradient(to right, #ec4899, #A80C14, #f43f5e)',
        boxShadow: '0 0 10px rgba(217, 38, 112, 0.5), 0 0 5px rgba(217, 38, 112, 0.3)',
      }}
    />
  );
}
