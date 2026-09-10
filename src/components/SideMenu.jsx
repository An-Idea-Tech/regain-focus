import React, { useState, useEffect, useRef } from 'react';

// Premium Custom Select Dropdown matching our Luxury Minimalist CSS perfectly
function CustomSelect({ value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  
  const activeOption = options.find(opt => opt.value === value) || options[0];

  const triggerHaptic = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleTriggerClick = (e) => {
    e.stopPropagation();
    triggerHaptic();
    setIsOpen(!isOpen);
  };

  const handleOptionSelect = (e, val) => {
    e.stopPropagation();
    triggerHaptic();
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div 
      ref={containerRef} 
      className={`custom-select ${isOpen ? 'open' : ''}`}
      style={{ minWidth: '140px' }}
    >
      <div className="custom-select-trigger" onClick={handleTriggerClick}>
        <span>{activeOption?.label || ''}</span>
        <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      <div className="custom-select-options">
        {options.map((opt) => (
          <div 
            key={opt.value} 
            className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
            onClick={(e) => handleOptionSelect(e, opt.value)}
          >
            {opt.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SideMenu({
  isOpen,
  onClose,
  categories,
  onCategorySelect,
  onOpenCustomTracks,
  currentUser,
  installAvailable,
  onInstallClick
}) {
  // Local states for settings
  const [autoplayNext, setAutoplayNext] = useState(() => {
    return localStorage.getItem('regain-autoplay-next') !== 'false';
  });
  
  const [defaultDuration, setDefaultDuration] = useState(() => {
    return localStorage.getItem('regain-timer-setting') || '20';
  });

  const [customMinutes, setCustomMinutes] = useState(() => {
    return localStorage.getItem('regain-custom-duration') || '12';
  });

  const [showCustomInput, setShowCustomInput] = useState(defaultDuration === 'custom');

  const [defaultCategory, setDefaultCategory] = useState(() => {
    return localStorage.getItem('regain-default-category') || '2'; // Default index 2
  });

  const triggerHaptic = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  // Sync settings with localStorage
  const handleAutoplayChange = (e) => {
    const val = e.target.checked;
    setAutoplayNext(val);
    localStorage.setItem('regain-autoplay-next', val.toString());
    triggerHaptic();
  };

  const handleDurationSelect = (val) => {
    setDefaultDuration(val);
    localStorage.setItem('regain-timer-setting', val);
    
    if (val === 'custom') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      // Directly dispatch event or refresh window-level config
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleCustomApply = () => {
    const mins = parseInt(customMinutes);
    if (mins >= 1 && mins <= 999) {
      localStorage.setItem('regain-custom-duration', mins.toString());
      localStorage.setItem('regain-timer-setting', 'custom');
      window.dispatchEvent(new Event('storage')); // Let App or useTimer know
      triggerHaptic();
      alert(`Applied ${mins} minutes default length.`);
    }
  };

  const handleCategorySelect = (val) => {
    setDefaultCategory(val);
    localStorage.setItem('regain-default-category', val);
  };

  // Options configuration
  const durationOptions = [
    { value: '5', label: '5 mins' },
    { value: '10', label: '10 mins' },
    { value: '15', label: '15 mins' },
    { value: '20', label: '20 mins' },
    { value: '25', label: '25 mins' },
    { value: '30', label: '30 mins' },
    { value: 'custom', label: 'Custom...' }
  ];

  const categoryOptions = categories
    .filter(c => c.id !== 'user-tracks')
    .map((cat, idx) => ({
      value: idx.toString(),
      label: cat.name.replace(/^[^\w]*/, '').trim()
    }));

  return (
    <aside id="side-menu" className={`side-menu ${isOpen ? '' : 'hidden'}`} onClick={onClose}>
      <div className="menu-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="menu-header">
          <h2>Regain</h2>
          <button id="close-menu" className="close-icon" onClick={onClose}>&times;</button>
        </div>

        <div className="menu-inner">
          <nav className="menu-nav">
            
            {/* Unified Guest ProfileSync Section */}
            <div className="menu-profile-section">
              <span className="profile-header-title">Account Profile</span>
              <div className="profile-username">
                {currentUser?.name || 'Guest User'}
              </div>
              <div className="profile-sync-badge">
                Playing as Guest
              </div>
              <button 
                className="profile-sync-btn"
                onClick={() => {
                  triggerHaptic();
                  alert("Social login & cloud synchronization support is coming soon!");
                }}
              >
                ☁️ Cloud Sync Account
              </button>
            </div>

            {/* Soundscapes Categories */}
            <div className="menu-section">
              <h3>Soundscapes</h3>
              <ul id="menu-categories" className="menu-list">
                {categories.map((cat) => (
                  <li 
                    key={cat.id} 
                    onClick={() => {
                      triggerHaptic();
                      onCategorySelect(cat);
                      onClose();
                    }}
                  >
                    {cat.name}
                  </li>
                ))}
                <li className="menu-divider"></li>
                <li 
                  className="add-custom-trigger-item"
                  onClick={() => {
                    triggerHaptic();
                    onOpenCustomTracks();
                    onClose();
                  }}
                >
                  <span style={{ marginRight: '0.6rem' }}>✏️</span> Custom Tracks
                </li>
              </ul>
            </div>

            {/* Application Settings */}
            <div className="menu-section">
              <h3>Settings</h3>
              
              {/* Contextual PWA Install Button */}
              {installAvailable && (
                <div className="setting-item" id="install-app-container">
                  <span>Install App</span>
                  <button 
                    id="install-app-btn" 
                    className="btn btn-premium"
                    onClick={() => {
                      triggerHaptic();
                      onInstallClick();
                    }}
                  >
                    Install App
                  </button>
                </div>
              )}

              {/* Autoplay toggle */}
              <div className="setting-item">
                <span>Auto-play next</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={autoplayNext} 
                    onChange={handleAutoplayChange}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {/* Default Length timer settings */}
              <div className="setting-item timer-setting-item">
                <span>Default Length</span>
                <div className="timer-setting-group">
                  
                  <CustomSelect 
                    value={defaultDuration}
                    options={durationOptions}
                    onChange={handleDurationSelect}
                  />

                  {showCustomInput && (
                    <div id="custom-timer-container" style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                      <input 
                        type="number" 
                        id="custom-timer-input" 
                        className="glass-input" 
                        placeholder="Mins" 
                        min="1" 
                        max="999"
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(e.target.value)}
                        style={{ width: '60px' }}
                      />
                      <button 
                        id="apply-custom-timer" 
                        className="btn-icon" 
                        onClick={handleCustomApply}
                      >
                        ✓
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Default category selector */}
              <div className="setting-item">
                <span>Default Category</span>
                
                <CustomSelect 
                  value={defaultCategory}
                  options={categoryOptions}
                  onChange={handleCategorySelect}
                />

              </div>

            </div>
          </nav>
        </div>
      </div>
    </aside>
  );
}

export default SideMenu;
