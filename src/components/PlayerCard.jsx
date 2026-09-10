import React, { useState, useEffect, useRef } from 'react';

export function PlayerCard({
  currentTrack,
  currentCategory,
  onCategorySwitchClick,
  onPrevTrack,
  onNextTrack,
  onShuffleToggle,
  onRepeatToggle,
  shuffleMode,
  repeatMode
}) {
  const [expanded, setExpanded] = useState(false);
  const autoCollapseTimerRef = useRef(null);
  const cardRef = useRef(null);

  const triggerHaptic = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  // 1. Inactivity auto-collapse timer (8 seconds)
  const resetAutoCollapseTimer = () => {
    if (autoCollapseTimerRef.current) {
      clearTimeout(autoCollapseTimerRef.current);
    }
    
    if (expanded) {
      autoCollapseTimerRef.current = setTimeout(() => {
        setExpanded(false);
      }, 8000);
    }
  };

  // Reset timer on expansion state changes
  useEffect(() => {
    resetAutoCollapseTimer();
    return () => {
      if (autoCollapseTimerRef.current) {
        clearTimeout(autoCollapseTimerRef.current);
      }
    };
  }, [expanded]);

  // Reset collapse timer upon user touches or mouse actions (prevents collapse during active use)
  const handleUserInteraction = () => {
    if (expanded) {
      resetAutoCollapseTimer();
    }
  };

  const handleCardClick = () => {
    if (!expanded) {
      triggerHaptic();
      setExpanded(true);
    }
  };

  const handleShuffleClick = (e) => {
    e.stopPropagation();
    triggerHaptic();
    onShuffleToggle();
    resetAutoCollapseTimer();
  };

  const handleRepeatClick = (e) => {
    e.stopPropagation();
    triggerHaptic();
    onRepeatToggle();
    resetAutoCollapseTimer();
  };

  const handlePrevClick = (e) => {
    e.stopPropagation();
    triggerHaptic();
    onPrevTrack();
    resetAutoCollapseTimer();
  };

  const handleNextClick = (e) => {
    e.stopPropagation();
    triggerHaptic();
    onNextTrack();
    resetAutoCollapseTimer();
  };

  const handleCategorySwitchClick = (e) => {
    e.stopPropagation();
    triggerHaptic();
    onCategorySwitchClick();
    resetAutoCollapseTimer();
  };

  // 2. Status line text labels mapping
  const shuffleModes = ['Shuffle Off', 'Shuffle: Category', 'Shuffle: All'];
  const repeatModes = ['Repeat Off', 'Repeat Single', 'Repeat Category'];
  const shuffleText = shuffleModes[shuffleMode];
  const repeatText = repeatModes[repeatMode];

  return (
    <div 
      ref={cardRef}
      className={`track-info glass-panel ${expanded ? 'expanded' : ''}`}
      onClick={handleCardClick}
      onTouchStart={handleUserInteraction}
      onMouseMove={handleUserInteraction}
    >
      <div className="player-content">
        
        {/* Category Badge Switch */}
        <div className="category-pill" id="player-category-switch" onClick={handleCategorySwitchClick}>
          <span>{currentCategory?.name || 'Select Category'}</span>
          <svg className="chevron" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5H7z"/>
          </svg>
        </div>

        {/* Track Title */}
        <h3 id="current-track-title">
          {currentTrack?.title || 'Relaxing Soundscape'}
        </h3>
        
        {/* Active Caches status display (Only when expanded) */}
        <div className="player-status-line">
          <span>{shuffleText}</span>
          <div className="dot"></div>
          <span>{repeatText}</span>
        </div>
        
        {/* Expanded player actions control dock */}
        <div className="player-controls-row">
          
          {/* Shuffle Trigger */}
          <button 
            id="shuffle-btn" 
            className={`control-btn ${shuffleMode > 0 ? 'active' : ''} mode-${shuffleMode}`} 
            onClick={handleShuffleClick}
            title={shuffleText}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.44l2.04 2.04V4h-5.5zm.35 7.59l-1.41 1.41 3.13 3.13L14.5 18.17l2.04 2.04L21 16.17l-2.04-2.04-3.13-3.13z"/>
            </svg>
          </button>

          {/* Previous Track */}
          <button 
            id="prev-track" 
            className="control-btn main-ctrl" 
            onClick={handlePrevClick}
            aria-label="Previous Track"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          {/* Next Track */}
          <button 
            id="next-track" 
            className="control-btn main-ctrl" 
            onClick={handleNextClick}
            aria-label="Next Track"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>

          {/* Repeat Trigger */}
          <button 
            id="repeat-btn" 
            className={`control-btn ${repeatMode > 0 ? 'active' : ''} mode-${repeatMode}`} 
            onClick={handleRepeatClick}
            title={repeatText}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
            </svg>
          </button>

        </div>
      </div>
    </div>
  );
}

export default PlayerCard;
