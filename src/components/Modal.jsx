import React from 'react';

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  const triggerHaptic = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const handleClose = () => {
    triggerHaptic();
    onClose();
  };

  return (
    <div id="modal-container" className="modal-container-wrapper" onClick={handleClose}>
      <div 
        className="modal-content glass-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'fadeInScale 0.4s cubic-bezier(0.3, 1.5, 0.5, 1) forwards'
        }}
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button id="close-modal" className="close-icon" onClick={handleClose}>&times;</button>
        </div>
        <div className="modal-inner">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
