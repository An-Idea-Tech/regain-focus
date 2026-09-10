import { useEffect, useRef, useState, useCallback } from 'react';

// Keep track of script load status globally across hot re-renders
let ytScriptAdded = false;

/**
 * useAudioPlayer Hook
 * Manages the YouTube background playback, API initialization, volume transitions, and skipping states.
 */
export function useAudioPlayer(onTrackEnded, onForceSkip) {
  const [isReady, setIsReady] = useState(false);
  const [playerState, setPlayerState] = useState(-1); // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering
  const [currentTrack, setCurrentTrack] = useState(null);
  
  const playerRef = useRef(null);
  const watchdogRef = useRef(null);
  const loadTimeoutRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  const isMutedByPolicyRef = useRef(false);
  const pendingTrackRef = useRef(null);

  const onTrackEndedRef = useRef(onTrackEnded);
  const onForceSkipRef = useRef(onForceSkip);

  // Synchronize callbacks
  useEffect(() => {
    onTrackEndedRef.current = onTrackEnded;
    onForceSkipRef.current = onForceSkip;
  }, [onTrackEnded, onForceSkip]);

  const forceSkip = useCallback(() => {
    console.warn('AudioPlayer: Triggering auto-skip callback...');
    if (onForceSkipRef.current) {
      onForceSkipRef.current();
    }
  }, []);

  // 1. Playback Control Actions (Declared above initYTPlayer to avoid dependency hoisting ReferenceError)
  const playTrack = useCallback((track) => {
    if (!playerRef.current || !isReady) {
      console.warn('AudioPlayer: Player not loaded yet. Buffering track.');
      pendingTrackRef.current = track;
      return;
    }

    console.log(`AudioPlayer: Launching track play: ${track.id} (${track.title})`);
    setCurrentTrack(track);

    // Cancel active volume transitions
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    playerRef.current.unMute();
    playerRef.current.setVolume(100);
    playerRef.current.loadVideoById(track.id);

    try { playerRef.current.setPlaybackQuality('small'); } catch (e) {}
    playerRef.current.playVideo();

    // Watchdog trigger (2.5s) for blocked auto-play policies
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = setTimeout(() => {
      if (playerRef.current) {
        const state = playerRef.current.getPlayerState();
        if (state !== window.YT.PlayerState.PLAYING && state !== window.YT.PlayerState.BUFFERING) {
          console.warn('AudioPlayer: Watchdog caught blocked playback. Skipping track.');
          forceSkip();
        }
      }
    }, 2500);

    // Load timeout (30s)
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      if (playerRef.current && playerRef.current.getPlayerState() !== window.YT.PlayerState.PLAYING) {
        console.warn('AudioPlayer: 30s connection timeout exceeded. Auto-skipping...');
        forceSkip();
      }
    }, 30000);

  }, [isReady, forceSkip]);

  // 2. Initialize Player Instance once YouTube script is loaded
  const initYTPlayer = useCallback(() => {
    if (playerRef.current) return; // Already instantiated

    let container = document.getElementById('youtube-player');
    if (!container) {
      console.warn('AudioPlayer: DOM target element #youtube-player not found yet. Delaying initialization...');
      return;
    }

    // Prevent iframe pollution: If container is already an iframe or has children, swap it for a clean div
    if (container.tagName === 'IFRAME' || container.hasChildNodes()) {
      console.log('AudioPlayer: Resetting active/corrupted player DOM container...');
      const parent = container.parentNode;
      const newDiv = document.createElement('div');
      newDiv.id = 'youtube-player';
      parent.replaceChild(newDiv, container);
      container = newDiv;
    }

    console.log('AudioPlayer: Constructing new YT.Player inside root container...');
    
    try {
      playerRef.current = new window.YT.Player('youtube-player', {
        height: '200',
        width: '200',
        videoId: '2V0pHe6yV8Q', // Verified embeddable silent starter track
        playerVars: {
          'autoplay': 0,
          'controls': 0,
          'disablekb': 1,
          'modestbranding': 1,
          'rel': 0,
          'iv_load_policy': 3,
          'origin': window.location.origin
        },
        events: {
          'onReady': () => {
            console.log('AudioPlayer: Player API Ready');
            setIsReady(true);
            playerRef.current.unMute();
            playerRef.current.setVolume(100);
            
            // Suggest low bandwidth quality since audio is hidden
            try { playerRef.current.setPlaybackQuality('small'); } catch (e) {}

            // Play pending track if saved
            if (pendingTrackRef.current) {
              console.log('AudioPlayer: Triggering pending buffered track:', pendingTrackRef.current.id);
              playTrack(pendingTrackRef.current);
              pendingTrackRef.current = null;
            }
          },
          'onStateChange': (event) => {
            setPlayerState(event.data);
            console.log('AudioPlayer: State Changed', event.data);

            if (event.data === window.YT.PlayerState.PLAYING) {
              isMutedByPolicyRef.current = false;
              if (loadTimeoutRef.current) {
                clearTimeout(loadTimeoutRef.current);
                loadTimeoutRef.current = null;
              }
            }

            if (event.data === window.YT.PlayerState.ENDED) {
              if (onTrackEndedRef.current) {
                onTrackEndedRef.current();
              }
            }
          },
          'onError': (e) => {
            console.error('AudioPlayer: API Error Code', e.data);
            // Restricted / Deleted video skip handler (Codes: 2, 5, 100, 101, 150)
            if ([2, 5, 100, 101, 150].includes(e.data)) {
              forceSkip();
            }
          }
        }
      });
    } catch (err) {
      console.error('AudioPlayer: Failed to instantiate YT Player', err);
    }
  }, [forceSkip, playTrack]);

  // 3. Manage Script Injection lifecycle
  useEffect(() => {
    // Check if script is already present globally
    if (window.YT && window.YT.Player) {
      initYTPlayer();
      return;
    }

    const hasScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!hasScript) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    // Set callback hook cleanly
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousCallback) previousCallback();
      initYTPlayer();
    };

    return () => {
      // Clean timers
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, [initYTPlayer]);

  // 4. Late-mounted container watchdog (e.g. after Auth gate opens and adds target to DOM)
  useEffect(() => {
    if (window.YT && window.YT.Player && !playerRef.current) {
      const container = document.getElementById('youtube-player');
      if (container) {
        console.log('AudioPlayer: Late-mounted container detected. Initializing YT.Player now...');
        initYTPlayer();
      }
    }
  });

  const pause = useCallback(() => {
    if (playerRef.current && isReady) {
      playerRef.current.pauseVideo();
    }
  }, [isReady]);

  const resume = useCallback(() => {
    if (playerRef.current && isReady) {
      playerRef.current.unMute();
      playerRef.current.playVideo();
    }
  }, [isReady]);

  const stop = useCallback(() => {
    if (playerRef.current && isReady) {
      playerRef.current.stopVideo();
    }
  }, [isReady]);

  const fadeOut = useCallback((callback) => {
    if (!playerRef.current || !isReady) {
      if (callback) callback();
      return;
    }

    let vol = playerRef.current.getVolume();
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    fadeIntervalRef.current = setInterval(() => {
      vol -= 10;
      if (vol <= 0) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
        playerRef.current.pauseVideo();
        playerRef.current.setVolume(100); // Reset for next session start
        if (callback) callback();
      } else {
        playerRef.current.setVolume(vol);
      }
    }, 150);
  }, [isReady]);

  return {
    isReady,
    playerState,
    currentTrack,
    playTrack,
    pause,
    resume,
    stop,
    fadeOut
  };
}

export default useAudioPlayer;
