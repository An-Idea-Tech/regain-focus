import React from 'react';

export function AuthScreen({ onContinueAsGuest }) {
  const triggerHaptic = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const handleGuestClick = () => {
    triggerHaptic();
    onContinueAsGuest();
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <div className="auth-logo">
          <img src="/icons/icon-v14.svg" alt="Regain Focus Logo" />
          <h1>Regain</h1>
          <p>A premium focus companion for luxury sessions</p>
        </div>

        <div className="auth-actions">
          <button className="auth-btn auth-btn-guest" onClick={handleGuestClick}>
            Continue as Guest
          </button>
          
          <button className="auth-btn auth-btn-social" disabled title="Sync Support Coming Soon">
            <svg viewBox="0 0 24 24">
              <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-6.887 4.114-4.68 0-8.5-3.82-8.5-8.5s3.82-8.5 8.5-8.5c2.143 0 4.093.814 5.564 2.15l3.207-3.207C18.664.914 15.686 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.941 0 12.24-4.873 12.24-12.24 0-.823-.075-1.611-.214-2.374h-12.026z"/>
            </svg>
            Sign in with Google
          </button>

          <button className="auth-btn auth-btn-social" disabled title="Sync Support Coming Soon">
            <svg viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.57 2.95-1.39z"/>
            </svg>
            Sign in with Apple
          </button>
        </div>

        <div className="auth-footer">
          Guest mode stores your custom soundscapes locally in secure offline storage. Sign-in support will sync your session stats across devices later.
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;
