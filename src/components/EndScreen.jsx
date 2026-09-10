import React, { useEffect, useState } from 'react';

export function EndScreen({
  isOpen,
  onDismiss,
  allTracks,
  onSelectRecommendation
}) {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    if (isOpen && allTracks.length > 0) {
      // Pick 3 random recommendations
      const shuffled = [...allTracks].sort(() => 0.5 - Math.random());
      setRecommendations(shuffled.slice(0, 3));
    }
  }, [isOpen, allTracks]);

  if (!isOpen) return null;

  const triggerHaptic = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const handleDismiss = () => {
    triggerHaptic();
    onDismiss();
  };

  const handleCardClick = (track, category) => {
    triggerHaptic();
    onSelectRecommendation(track, category);
  };

  return (
    <div id="end-screen" style={{ display: 'flex', zIndex: 1900 }}>
      <div className="end-content">
        <span className="emoji">🙂</span>
        <h2>Session Completed</h2>
        <p>Stay in this calm state.</p>
        
        <div className="recommendations">
          <h3>Try these next:</h3>
          <div id="rec-tracks" className="rec-grid">
            {recommendations.map((item) => {
              const thumbUrl = `https://img.youtube.com/vi/${item.id}/default.jpg`;
              return (
                <div 
                  key={item.id} 
                  className="rec-card"
                  onClick={() => handleCardClick(item, item.category)}
                >
                  <img 
                    src={thumbUrl} 
                    alt={item.title}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/120x90/020617/38bdf8?text=Soundscape';
                    }}
                  />
                  <div className="rec-card-info">
                    <strong>{item.title}</strong>
                    <small>{item.category?.name || 'Ambient'}</small>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button id="close-end-screen" className="close-btn" onClick={handleDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default EndScreen;
