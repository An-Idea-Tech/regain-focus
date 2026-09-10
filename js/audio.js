/**
 * AudioPlayer.js
 * Core audio management using YouTube IFrame Player API.
 * Handles track loading, playback states, volume fading, and data optimization.
 */

// Track YouTube API readiness globally to allow immediate initialization if loaded early
window._ytApiReady = window._ytApiReady || false;

if (!window.YT) {
    const existingCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
        console.log('AudioPlayer: YouTube API Ready (Global Hook)');
        window._ytApiReady = true;
        if (existingCallback) existingCallback();
    };
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
} else if (window.YT.Player) {
    window._ytApiReady = true;
}

class AudioPlayer {
    constructor(onReady, onStateChange) {
        this.player = null;
        this.onReady = onReady;
        this.onStateChange = onStateChange;
        this.isReady = false;
        this.currentTrack = null;
        this.currentCategory = null;
        this.pendingTrack = null;
        this.isMutedByPolicy = false;

        console.log('AudioPlayer: Initializing...');

        if (window._ytApiReady || (window.YT && window.YT.Player)) {
            this.initPlayer();
        } else {
            const existingCallback = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                console.log('AudioPlayer: YouTube API Ready (Instance Hook)');
                if (existingCallback) existingCallback();
                this.initPlayer();
            };
        }
    }

    initPlayer() {
        this.player = new YT.Player('youtube-player', {
            height: '200',
            width: '200',
            videoId: '2V0pHe6yV8Q', // Verified embeddable focus track
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
                'onReady': (event) => {
                    console.log('AudioPlayer: Ready');
                    this.isReady = true;
                    this.player.unMute();
                    this.player.setVolume(100);
                    
                    // Set quality to 144p (small) to save user data since video is hidden
                    try { this.player.setPlaybackQuality('small'); } catch(e) {}
                    
                    if (this.onReady) this.onReady();
                    if (this.pendingTrack) {
                        this.playTrack(this.pendingTrack.track, this.pendingTrack.category);
                        this.pendingTrack = null;
                    }
                },
                'onStateChange': (event) => {
                    console.log('AudioPlayer: State', event.data);
                    if (event.data === YT.PlayerState.PLAYING) {
                        this.isMutedByPolicy = false;
                        if (this.loadTimeout) {
                            clearTimeout(this.loadTimeout);
                            this.loadTimeout = null;
                        }
                        
                        // Dynamic duration resolving for custom tracks
                        try {
                            if (this.currentTrack && this.currentTrack.isCustom) {
                                const realDuration = Math.round(this.player.getDuration());
                                if (realDuration > 0 && this.currentTrack.duration !== realDuration) {
                                    this.currentTrack.duration = realDuration;
                                    if (window.onCustomTrackDurationUpdated) {
                                        window.onCustomTrackDurationUpdated(this.currentTrack.id, realDuration);
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('AudioPlayer: Dynamic duration grab failed', e);
                        }
                    }
                    if (this.onStateChange) this.onStateChange(event.data);
                },
                'onError': (e) => {
                    console.error('AudioPlayer: Error', e.data);
                    // Standard YouTube error codes for restricted/deleted videos
                    if ([2, 5, 100, 101, 150].includes(e.data)) {
                        console.warn('AudioPlayer: Critical error or restricted content. Auto-skipping...');
                        this.forceSkip();
                    }
                }
            }
        });
    }

    forceSkip() {
        if (window.handleRestrictedTrack) {
            window.handleRestrictedTrack();
        }
    }

    playTrack(track, category) {
        if (!this.isReady) {
            this.pendingTrack = { track, category };
            return;
        }
        
        console.log('AudioPlayer: Playing', track.id);
        this.currentTrack = track;
        this.currentCategory = category;
        
        this.player.unMute();
        this.player.setVolume(100);
        
        this.player.loadVideoById(track.id);
        
        // Suggest 144p quality to minimize bandwidth usage
        try { this.player.setPlaybackQuality('small'); } catch(e) {}
        
        this.player.playVideo();

        // --- WATCHDOG TIMER ---
        // If the video doesn't start playing within 2.5 seconds, it might be stuck or restricted
        if (this.watchdog) clearTimeout(this.watchdog);
        this.watchdog = setTimeout(() => {
            const state = this.player.getPlayerState();
            if (state !== YT.PlayerState.PLAYING && state !== YT.PlayerState.BUFFERING) {
                console.warn('AudioPlayer: Watchdog detected stuck playback. Skipping...');
                this.forceSkip();
            }
        }, 2500);

        // --- LOAD TIMEOUT (30s) ---
        // If the track takes more than 30 seconds to start playing (even if buffering), skip it.
        if (this.loadTimeout) clearTimeout(this.loadTimeout);
        this.loadTimeout = setTimeout(() => {
            if (this.player.getPlayerState() !== YT.PlayerState.PLAYING) {
                console.warn('AudioPlayer: Load timeout (30s) exceeded. Skipping...');
                this.forceSkip();
            }
        }, 30000);
    }

    pause() { if (this.isReady) this.player.pauseVideo(); }
    resume() { 
        if (this.isReady) { 
            this.player.unMute(); 
            this.player.playVideo(); 
        } 
    }
    stop() { if (this.isReady) this.player.stopVideo(); }

    fadeOut(callback) {
        if (!this.isReady) { callback?.(); return; }
        let vol = this.player.getVolume();
        const interval = setInterval(() => {
            vol -= 10;
            if (vol <= 0) {
                clearInterval(interval);
                this.player.pauseVideo();
                this.player.setVolume(100);
                callback?.();
            } else {
                this.player.setVolume(vol);
            }
        }, 150);
    }
}