import React, { useCallback, useLayoutEffect, useRef } from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  /** Additional classes for the main content wrapper. */
  mainClassName?: string;
  /** Optional inline styles for the main content wrapper. */
  mainStyle?: React.CSSProperties;
}

export default function Layout({
  children,
  mainClassName = '',
  mainStyle,
}: LayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  const updateLayoutVariables = useCallback(() => {
    const headerHeight = headerRef.current?.offsetHeight ?? 0;
    const footerHeight = footerRef.current?.offsetHeight ?? 0;
    if (containerRef.current) {
      containerRef.current.style.setProperty(
        '--header-height',
        `${headerHeight}px`
      );
      containerRef.current.style.setProperty(
        '--footer-height',
        `${footerHeight}px`
      );
    }
  }, []);

  useLayoutEffect(() => {
    updateLayoutVariables();
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => updateLayoutVariables())
        : null;
    if (headerRef.current && resizeObserver)
      resizeObserver.observe(headerRef.current);
    if (footerRef.current && resizeObserver)
      resizeObserver.observe(footerRef.current);
    window.addEventListener('resize', updateLayoutVariables);
    return () => {
      window.removeEventListener('resize', updateLayoutVariables);
      resizeObserver?.disconnect();
    };
  }, [updateLayoutVariables]);

  const mergedMainStyle: React.CSSProperties = {
    minHeight:
      'calc(100vh - var(--header-height, 0px) - var(--footer-height, 0px))',
    ...mainStyle,
  };

  return (
    <div ref={containerRef} className="flex min-h-screen flex-col">
      <Header ref={headerRef} />
      <main
        className={`flex-1 px-4 py-6 bg-gray-100 ${mainClassName}`.trim()}
        style={mergedMainStyle}
      >
        {children}
      </main>
      <Footer ref={footerRef} />
    </div>
  );
}
