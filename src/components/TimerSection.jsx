import React from 'react';

export function TimerSection({
  formattedTime,
  progress,
  isRunning,
  onPlayPauseToggle,
  onAdjustTime
}) {
  const triggerHaptic = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const handlePlayClick = () => {
    triggerHaptic();
    onPlayPauseToggle();
  };

  const handleMinusClick = () => {
    triggerHaptic();
    onAdjustTime(-5);
  };

  const handlePlusClick = () => {
    triggerHaptic();
    onAdjustTime(5);
  };

  // SVG circular properties for stroke mapping
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - progress);

  return (
    <main className="hero">
      <div className="timer-container">
        <div className="timer-glass"></div>
        
        <svg className="timer-visual" viewBox="0 0 110 110">
          <circle className="timer-bg" cx="55" cy="55" r={radius}></circle>
          <circle 
            className="timer-progress" 
            cx="55" 
            cy="55" 
            r={radius}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeOffset,
              transition: 'stroke-dashoffset 0.3s linear'
            }}
          ></circle>
        </svg>

        <div className="timer-display">
          <span className="timer-unit">minutes</span>
          <span id="time-left">{formattedTime}</span>
          
          <div className="timer-adjust-inline">
            <button 
              id="timer-minus" 
              onClick={handleMinusClick} 
              aria-label="Subtract 5 minutes"
              disabled={isRunning}
              style={{ opacity: isRunning ? 0.3 : 1, cursor: isRunning ? 'default' : 'pointer' }}
            >
              −
            </button>
            <button 
              id="timer-plus" 
              onClick={handlePlusClick} 
              aria-label="Add 5 minutes"
              disabled={isRunning}
              style={{ opacity: isRunning ? 0.3 : 1, cursor: isRunning ? 'default' : 'pointer' }}
            >
              +
            </button>
          </div>
        </div>

        <button 
          id="play-btn" 
          className="main-cta" 
          onClick={handlePlayClick}
          aria-label={isRunning ? "Pause Session" : "Start Session"}
        >
          <div className="icon-play"></div>
        </button>
      </div>
    </main>
  );
}

export default TimerSection;
