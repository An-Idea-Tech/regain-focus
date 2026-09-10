import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('ReloadPrompt: Service Worker registered successfully: ', r);
    },
    onRegisterError(error) {
      console.error('ReloadPrompt: Service Worker registration failed: ', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div id="install-toast" className="install-toast" style={{ display: 'flex', bottom: '24px', zIndex: 9999 }}>
      <div className="toast-content glass-panel" style={{ width: '360px', padding: '1rem' }}>
        <div className="toast-icon">
          <img src="/icons/icon-v14.svg" alt="Regain PWA Update" />
        </div>
        <div className="toast-text" style={{ flex: 1, paddingLeft: '0.8rem' }}>
          <strong>
            {offlineReady ? 'Ready Offline' : 'App Update Ready'}
          </strong>
          <p style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: 'var(--text-muted)' }}>
            {offlineReady 
              ? 'Regain is cached and ready to run fully offline!' 
              : 'A new version of Regain is available. Refresh now?'}
          </p>
        </div>
        <div className="toast-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {needRefresh && (
            <button 
              className="btn btn-premium" 
              onClick={() => updateServiceWorker(true)}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
            >
              Refresh
            </button>
          )}
          <button className="close-icon" onClick={close} style={{ fontSize: '1.25rem', padding: '4px' }}>
            &times;
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReloadPrompt;
