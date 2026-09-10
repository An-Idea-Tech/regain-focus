import React, { useState, useEffect, useRef, useCallback } from 'react';
import { INITIAL_CATEGORIES } from './data/categories';
import dbInstance from './db/soundscapeDb';
import { useTimer } from './hooks/useTimer';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import TopBar from './components/TopBar';
import SideMenu from './components/SideMenu';
import TimerSection from './components/TimerSection';
import PlayerCard from './components/PlayerCard';
import Modal from './components/Modal';
import CustomTracksModal from './components/CustomTracksModal';
import EndScreen from './components/EndScreen';
import AuthScreen from './components/AuthScreen';

export function App() {
  // 1. Core Auth State (Offline Guest is standard)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('regain-guest-auth') === 'true';
  });

  const currentUser = { name: 'Guest User', id: 'guest' };

  // 2. Playback / Playlist Category States
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeTrack, setActiveTrack] = useState(null);
  
  // Modals & Menu Toggles
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedModalCategory, setSelectedModalCategory] = useState(null);
  const [isCustomTracksOpen, setIsCustomTracksOpen] = useState(false);
  const [isEndScreenOpen, setIsEndScreenOpen] = useState(false);

  // Theme Toggles
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('regain-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    return savedTheme;
  });

  // Loop & Playlist Modes
  const [shuffleMode, setShuffleMode] = useState(() => {
    return parseInt(localStorage.getItem('regain-shuffle-mode')) || 0;
  });
  const [repeatMode, setRepeatMode] = useState(() => {
    return parseInt(localStorage.getItem('regain-repeat-mode')) || 0;
  });

  // PWA Install Context
  const [installAvailable, setInstallAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // References
  const syncChannelRef = useRef(null);

  // 3. Setup categories & custom soundscapes loading
  const loadWorkspace = useCallback(async () => {
    try {
      // Step A: Rebuild categories from initial ones first so we have instant visual rendering
      const cleanCategories = INITIAL_CATEGORIES.map(cat => ({
        ...cat,
        tracks: [...cat.tracks]
      }));

      setCategories(cleanCategories);

      // Resolve starting default playlist items
      const savedCategoryIdx = parseInt(localStorage.getItem('regain-default-category')) || 2;
      const startingCategory = cleanCategories[savedCategoryIdx] || cleanCategories[0];
      
      setActiveCategory(startingCategory);
      setActiveTrack(startingCategory.tracks[0]);

      // Step B: Async background loading of custom soundscapes from IndexedDB
      try {
        await dbInstance.init();
        const customTracks = await dbInstance.getCustomTracks('guest');

        if (customTracks.length > 0) {
          // 1. Group custom tracks by categoryId
          customTracks.forEach(track => {
            const cat = cleanCategories.find(c => c.id === track.categoryId);
            if (cat) {
              if (!cat.tracks.some(t => t.id === track.id)) {
                cat.tracks.unshift(track); // Place custom tracks at the top
              }
            }
          });

          // 2. Append user track virtual category compilation
          const userTracksCat = {
            id: 'user-tracks',
            name: '✏️ User Tracks',
            tracks: [...customTracks]
          };
          cleanCategories.push(userTracksCat);

          // 3. Keep last played session active references fully aligned
          const savedLastCategoryId = localStorage.getItem('regain-last-category-id');
          const savedLastTrackId = localStorage.getItem('regain-last-track-id');
          
          if (savedLastCategoryId && savedLastTrackId) {
            const currentCat = cleanCategories.find(c => c.id === savedLastCategoryId);
            if (currentCat) {
              const currentTrack = currentCat.tracks.find(t => t.id === savedLastTrackId);
              if (currentTrack) {
                setActiveCategory(currentCat);
                setActiveTrack(currentTrack);
              }
            }
          }

          setCategories([...cleanCategories]);
        }
      } catch (dbError) {
        console.warn('App: Offline IndexedDB not available, running on pre-loaded soundscapes.', dbError);
      }
    } catch (e) {
      console.error('App: Workspace failed loading', e);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();

    // Bind BroadcastChannel for multi-tab sync
    syncChannelRef.current = new BroadcastChannel('regain-db-sync');
    syncChannelRef.current.onmessage = (event) => {
      if (event.data?.type === 'SYNC_CUSTOM_TRACKS') {
        loadWorkspace();
      }
    };

    // Bind PWA install event listener
    const handleInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallAvailable(true);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      if (syncChannelRef.current) syncChannelRef.current.close();
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, [loadWorkspace]);

  // Listen to storage events to reload duration dynamically
  useEffect(() => {
    const handleStorageChange = () => {
      const savedSetting = localStorage.getItem('regain-timer-setting') || '20';
      const savedCustom = localStorage.getItem('regain-custom-duration') || '12';
      const mins = savedSetting === 'custom' ? parseInt(savedCustom) : parseInt(savedSetting);
      timer.setDefaultDuration(mins || 20);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 4. Implement Sequential / Shuffle Playlist Navigator
  const getNextTrack = useCallback((direction = 'next') => {
    if (!activeCategory || !activeTrack) return null;

    const currentTracks = activeCategory.tracks;
    const currentIndex = currentTracks.findIndex(t => t.id === activeTrack.id);

    // Shuffle Mode 2: Universal Shuffle across ALL categories
    if (shuffleMode === 2) {
      const allTracks = categories.flatMap(c => c.tracks);
      if (allTracks.length <= 1) return activeTrack;
      let randomTrack = activeTrack;
      while (randomTrack.id === activeTrack.id) {
        randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
      }
      // Re-map category parent reference
      const parentCat = categories.find(c => c.tracks.some(t => t.id === randomTrack.id));
      setActiveCategory(parentCat);
      return randomTrack;
    }

    // Shuffle Mode 1: Category Shuffle
    if (shuffleMode === 1) {
      if (currentTracks.length <= 1) return activeTrack;
      let randomTrack = activeTrack;
      while (randomTrack.id === activeTrack.id) {
        randomTrack = currentTracks[Math.floor(Math.random() * currentTracks.length)];
      }
      return randomTrack;
    }

    // Sequential Navigation
    if (direction === 'next') {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= currentTracks.length) {
        return repeatMode === 2 ? currentTracks[0] : null; // Loop back or stop
      }
      return currentTracks[nextIndex];
    } else {
      const prevIndex = currentIndex - 1;
      if (prevIndex < 0) {
        return repeatMode === 2 ? currentTracks[currentTracks.length - 1] : null;
      }
      return currentTracks[prevIndex];
    }
  }, [activeCategory, activeTrack, shuffleMode, repeatMode, categories]);

  // 5. Connect Player Hook callbacks
  const handleTrackEnded = useCallback(() => {
    // Check repeat single
    if (repeatMode === 1 && activeTrack) {
      audio.playTrack(activeTrack);
      return;
    }

    const isAutoplay = localStorage.getItem('regain-autoplay-next') !== 'false';
    if (isAutoplay) {
      const next = getNextTrack('next');
      if (next) {
        setActiveTrack(next);
        audio.playTrack(next);
      } else {
        // Stop session if end of playlist
        timer.stop();
        audio.stop();
      }
    } else {
      timer.stop();
      audio.stop();
    }
  }, [activeTrack, repeatMode, getNextTrack]);

  const handleForceSkip = useCallback(() => {
    const next = getNextTrack('next');
    if (next) {
      setActiveTrack(next);
      audio.playTrack(next);
    }
  }, [getNextTrack]);

  // Hook Initialization
  const audio = useAudioPlayer(handleTrackEnded, handleForceSkip);
  const timer = useTimer(() => {
    // Focus timer completed callback
    audio.fadeOut(() => {
      setIsEndScreenOpen(true);
    });
  });

  // Toggle play/pause session
  const handlePlayPauseToggle = () => {
    if (timer.isRunning) {
      timer.pause();
      audio.pause();
      document.body.classList.remove('state-focused');
    } else {
      timer.start();
      if (activeTrack) {
        // If unstarted, play track. If paused, resume.
        if (audio.playerState === 2) {
          audio.resume();
        } else {
          audio.playTrack(activeTrack);
        }
      }
      document.body.classList.add('state-focused');
    }
  };

  const handleForceSkipManual = (direction) => {
    const nextOrPrev = getNextTrack(direction);
    if (nextOrPrev) {
      setActiveTrack(nextOrPrev);
      if (timer.isRunning) {
        audio.playTrack(nextOrPrev);
      }
    }
  };

  // 6. Settings Actions
  const handleThemeToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('regain-theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleShuffleToggle = () => {
    const nextMode = (shuffleMode + 1) % 3;
    setShuffleMode(nextMode);
    localStorage.setItem('regain-shuffle-mode', nextMode.toString());
  };

  const handleRepeatToggle = () => {
    const nextMode = (repeatMode + 1) % 3;
    setRepeatMode(nextMode);
    localStorage.setItem('regain-repeat-mode', nextMode.toString());
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA Install decision outcome: ${outcome}`);
    setDeferredPrompt(null);
    setInstallAvailable(false);
  };

  // Recommendations select from EndScreen
  const handleSelectRecommendation = (track, category) => {
    // Find matching category object
    const cat = categories.find(c => c.id === category.id) || category;
    setActiveCategory(cat);
    setActiveTrack(track);
    setIsEndScreenOpen(false);
    
    // Auto-restart session
    timer.reset();
    timer.start();
    audio.playTrack(track);
    document.body.classList.add('state-focused');
  };

  // Continue as Guest authentication gate
  const handleContinueAsGuest = () => {
    setIsAuthenticated(true);
    localStorage.setItem('regain-guest-auth', 'true');
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h}h${m > 0 ? ' ' + m + 'm' : ''}`;
    } else {
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
  };

  // List all tracks inside a selected category modal
  const handleOpenCategoryModal = (cat) => {
    setSelectedModalCategory(cat);
    setIsCategoryModalOpen(true);
  };

  const handleSelectTrack = (track) => {
    setActiveCategory(selectedModalCategory);
    setActiveTrack(track);
    setIsCategoryModalOpen(false);
    
    // Auto-start session if it is not already running, matching original vanilla behavior
    if (!timer.isRunning) {
      timer.start();
      audio.playTrack(track);
      document.body.classList.add('state-focused');
    } else {
      audio.playTrack(track);
    }
  };

  // Render AuthScreen if guest-auth is uncompleted
  if (!isAuthenticated) {
    return <AuthScreen onContinueAsGuest={handleContinueAsGuest} />;
  }

  // Flattened track arrays for recommendations resolver
  const allTracksFlattened = categories
    .filter(c => c.id !== 'user-tracks')
    .flatMap(c => c.tracks.map(t => ({ ...t, category: c })));

  return (
    <div id="app">
      
      {/* 1. Header & Navigation Controls */}
      <TopBar 
        onMenuToggle={() => setIsMenuOpen(true)} 
        theme={theme}
        onThemeToggle={handleThemeToggle}
      />

      {/* 2. Slide Drawer Navigation */}
      <SideMenu 
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        categories={categories}
        onCategorySelect={handleOpenCategoryModal}
        onOpenCustomTracks={() => setIsCustomTracksOpen(true)}
        currentUser={currentUser}
        installAvailable={installAvailable}
        onInstallClick={handleInstallClick}
      />

      {/* 3. Circular Interactive SVG Timer */}
      <TimerSection 
        formattedTime={timer.getFormattedTime()}
        progress={timer.getProgress()}
        isRunning={timer.isRunning}
        onPlayPauseToggle={handlePlayPauseToggle}
        onAdjustTime={timer.adjustDuration}
      />

      {/* 4. Collapsible Music Player Control Pill */}
      <PlayerCard 
        currentTrack={activeTrack}
        currentCategory={activeCategory}
        onCategorySwitchClick={() => handleOpenCategoryModal(activeCategory)}
        onPrevTrack={() => handleForceSkipManual('prev')}
        onNextTrack={() => handleForceSkipManual('next')}
        onShuffleToggle={handleShuffleToggle}
        onRepeatToggle={handleRepeatToggle}
        shuffleMode={shuffleMode}
        repeatMode={repeatMode}
      />

      {/* 5. Track Selector Modal */}
      <Modal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)}
        title={selectedModalCategory?.name || 'Soundscapes'}
      >
        <div className="tracks-list">
          {selectedModalCategory?.tracks ? (
            selectedModalCategory.tracks.map((track) => {
              const thumb = `https://img.youtube.com/vi/${track.id}/default.jpg`;
              return (
                <div 
                  key={track.id} 
                  className={`track-item ${activeTrack?.id === track.id ? 'active' : ''}`}
                  onClick={() => handleSelectTrack(track)}
                >
                  <img 
                    src={thumb} 
                    className="track-item-img" 
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/120x90/020617/38bdf8?text=Soundscape';
                    }} 
                    alt={track.title}
                  />
                  <div className="track-item-info">
                    <div className="track-item-title">
                      {track.title}
                      {track.isCustom && (
                        <span className="track-badge-custom" style={{
                          marginLeft: '8px',
                          background: 'var(--accent-primary)',
                          color: 'var(--bg-main)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.6rem',
                          fontWeight: '800',
                          textTransform: 'uppercase'
                        }}>Custom</span>
                      )}
                    </div>
                    <small className="track-item-artist">{track.artist}</small>
                  </div>
                  <div className="track-item-duration">
                    {formatDuration(track.duration)}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
              Loading soundscapes...
            </div>
          )}
        </div>
      </Modal>

      {/* 6. Custom Track Injection Modal */}
      <CustomTracksModal 
        isOpen={isCustomTracksOpen}
        onClose={() => setIsCustomTracksOpen(false)}
        categories={categories}
        onTracksUpdated={loadWorkspace}
        currentUser={currentUser}
      />

      {/* 7. Full-Screen Completion recommendations card */}
      <EndScreen 
        isOpen={isEndScreenOpen}
        onDismiss={() => setIsEndScreenOpen(false)}
        allTracks={allTracksFlattened}
        onSelectRecommendation={handleSelectRecommendation}
      />

      {/* Embedded low quality hidden player anchor element required by YouTube API */}
      <div id="youtube-player" style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0 }}></div>
    </div>
  );
}

export default App;
