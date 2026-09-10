import React from 'react';

export function TopBar({ onMenuToggle, theme, onThemeToggle }) {
  const triggerHaptic = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const handleMenuClick = () => {
    triggerHaptic();
    onMenuToggle();
  };

  const handleThemeClick = () => {
    triggerHaptic();
    onThemeToggle();
  };

  const sunSVG = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
    </svg>
  );

  const moonSVG = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  );

  return (
    <header className="top-bar">
      <button id="menu-toggle" className="nav-btn" onClick={handleMenuClick} aria-label="Open Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <button 
        id="theme-toggle" 
        className="theme-toggle" 
        onClick={handleThemeClick} 
        aria-label="Toggle Dark/Light Mode"
        style={{ 
          transform: 'scale(1) rotate(0deg)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' 
        }}
      >
        {theme === 'dark' ? sunSVG : moonSVG}
      </button>
    </header>
  );
}

export default TopBar;
