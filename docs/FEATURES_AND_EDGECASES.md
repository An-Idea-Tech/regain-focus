# Regain PWA: Initial Build Features & Edge Cases

This document outlines the core features and technical challenges identified and resolved during the **initial build phase** of the Regain PWA to ensure a stable, "Luxury Minimal" launch.

## Core Features

### 1. Luxury Minimal Interface
- **Glassmorphic Design**: A premium, frosted-glass aesthetic implemented with CSS backdrop-filters and harmonized dark/light palettes.
- **PWA Architecture**: Built from the ground up for "Add to Home Screen" support, featuring offline asset caching via Service Workers.
- **Micro-interactions**: Native-feeling haptic feedback and smooth transitions integrated into the core navigation.

### 2. Advanced Playback Engine
- **Multi-State Shuffle & Repeat**: Sophisticated state management allowing for sequential, category-randomized, or global-randomized listening.
- **Playback Status Watcher**: Real-time UI synchronization that keeps the user informed of active playback modes.

### 3. Pulsing Focus Timer
- **Rhythmic Visuals**: A circular SVG progress engine designed to encourage breathing synchronization.
- **Auto-Fade Logic**: An integrated volume-ramp system that prevents jarring silence at session completion.

### 4. Dynamic Startup Logic
- **Session Randomization**: Implemented a Fisher-Yates shuffle on application load to ensure every initial user session feels unique.
- **Intelligent Defaults**: Configured to launch into **Deep Relaxation** by default to establish the brand's premium, calm identity.
### 5. Smart PWA Installation
- **Optimal Timing Prompt**: Implemented a "Value-First" installation logic that triggers a luxury glassmorphic toast midway through the user's first session (5 minutes).
- **Session Intelligence**: Uses `localStorage` to track interaction history, ensuring the prompt doesn't spam users and respects dismissals for 48 hours.
- **Cross-Platform Support**: Includes manifest-level shortcuts and iOS-specific meta tags for a seamless "Add to Home Screen" experience.

## Edge Cases Resolved During Build

### 1. YouTube Embedding Restrictions
- **Problem**: Inconsistent availability of tracks due to domain or embedding restrictions.
- **Solution**: Developed a pre-build validation script (`check_embed.js`) that audits the oEmbed API to guarantee only 100% functional tracks enter the database.

### 2. Cache Invalidation & Content Sync
- **Problem**: PWA service workers can "trap" users in old versions of the app.
- **Solution**: Established a strict versioning protocol in `sw.js` that forces immediate cache purges whenever core data or logic is refined.

### 3. Playback Resilience (Watchdog & Timeout)
- **Problem**: Network latency or restricted content causing silent "hangs" in the player.
- **Solution**: 
  - **Watchdog Timer**: A 2.5s rapid-response check for immediate stream failure.
  - **30s Load Monitor**: A secondary layer that skip-skips tracks failing to exit the "Buffering" state within a reasonable threshold.

### 4. Cross-Device UI Integrity
- **Problem**: Layout breakage on small-viewport devices like the iPhone SE.
- **Solution**: 
  - **Title Truncation**: Strictly limited titles to 2-3 words for visual predictability.
  - **Dynamic Viewport Scaling**: Used CSS transforms and flexible containers to maintain hierarchy without overlap.

### 5. Content Quality & Relevance
- **Problem**: Scraped metadata often included irrelevant tags (e.g., "Meditation,", "Devotional") that diluted the minimal brand.
- **Solution**: Performed a systematic cleanup of the `data.js` source to strip tutorial-style titles and non-relevant connotations.

### 6. Autoplay Policy Navigation
- **Problem**: Modern browser security prevents audio from starting without a user gesture.
- **Solution**: Designed the initialization flow to "warm up" the YouTube API only after the user's first physical interaction with the Play button.

### 7. Interrupt-Free Navigation
- **Problem**: Standard navigation patterns often interrupt active audio streams.
- **Solution**: Built a centered **Category Modal** that layers over the active session, allowing users to browse and switch themes without stopping the timer or audio.

### 8. Persistence of Preference
- **Problem**: User settings (Theme, Default Category) resetting upon browser close.
- **Solution**: Integrated `localStorage` hooks into the settings engine to ensure the app "remembers" the user's luxury configuration across sessions.
### 9. Window Edge & Scrollbar Clipping
- **Problem**: On some desktop browsers (specifically Windows Chrome/Edge), scrollbars on rounded modals can "flatten" the right-side corners.
- **Solution**: Implemented an "Inner Scroll Wrapper" architecture combined with `overflow: hidden` on the primary card. This isolates the scrollbar from the card's border and preserves the premium rounded aesthetic.
