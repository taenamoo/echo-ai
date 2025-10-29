import React from 'react';

type FooterProps = React.HTMLAttributes<HTMLElement>;

const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ className = '', ...rest }, ref) => {
    const year = new Date().getFullYear();
    return (
      <footer
        ref={ref}
        className={`mt-0 border-t border-slate-200/80 bg-white/80 backdrop-blur-sm ${className}`}
        {...rest}
      >
        <div
          className="container"
          style={{ paddingTop: 16, paddingBottom: 24 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/file.svg" alt="Echo AI" width={20} height={20} />
              <span className="text-gray-600">Echo AI © {year}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <a href="/" className="text-gray-600 hover:underline">
                홈
              </a>
              <a href="/documents" className="text-gray-600 hover:underline">
                문서
              </a>
              <a href="/study" className="text-gray-600 hover:underline">
                학습
              </a>
              <a href="/chatHr" className="text-gray-600 hover:underline">
                HR챗봇
              </a>
            </div>
          </div>
        </div>
      </footer>
    );
  }
);

Footer.displayName = 'Footer';

export default Footer;
