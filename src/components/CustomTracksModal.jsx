import React, { useState, useEffect } from 'react';
import dbInstance from '../db/soundscapeDb';
import SyncCoordinator from '../db/syncCoordinator';

export function CustomTracksModal({
  isOpen,
  onClose,
  categories,
  onTracksUpdated, // Callback to sync parent state
  currentUser
}) {
  const [url, setUrl] = useState('');
  const [categoryId, setCategoryId] = useState(() => {
    // Default to the first available category
    const defaultCat = categories.find(c => c.id !== 'user-tracks');
    return defaultCat ? defaultCat.id : '';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [localTracksList, setLocalTracksList] = useState([]);

  // Fetch custom tracks when modal is shown
  useEffect(() => {
    if (isOpen) {
      loadCustomTracks();
    }
  }, [isOpen]);

  const loadCustomTracks = async () => {
    try {
      const list = await dbInstance.getCustomTracks(currentUser?.id || 'guest');
      // Sort by addedAt descending
      list.sort((a, b) => b.addedAt - a.addedAt);
      setLocalTracksList(list);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const triggerHaptic = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const handleClose = () => {
    triggerHaptic();
    setUrl('');
    setErrorMsg('');
    setSuccessMsg('');
    onClose();
  };

  const extractYouTubeId = (link) => {
    const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
    const match = link.match(regExp);
    return (match && match[1].length === 11) ? match[1] : null;
  };

  const handleAddTrack = async (e) => {
    e.preventDefault();
    triggerHaptic();
    setErrorMsg('');
    setSuccessMsg('');

    const targetUrl = url.trim();
    if (!targetUrl) {
      setErrorMsg('Please paste a YouTube URL');
      return;
    }

    const videoId = extractYouTubeId(targetUrl);
    if (!videoId) {
      setErrorMsg('Could not parse a valid YouTube Video ID from that link');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Fetch metadata CORS-free via noembed oEmbed proxy
      const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      if (!response.ok) throw new Error('Network error resolving metadata');
      
      const meta = await response.json();
      if (meta.error) {
        throw new Error('Video not found or restricted');
      }

      const trackTitle = meta.title || `Custom Track (${videoId})`;
      const artistName = meta.author_name || 'YouTube Soundscape';

      const newTrack = {
        id: videoId,
        title: trackTitle,
        artist: artistName,
        duration: 1800, // 30 mins default, updated dynamically on play
        categoryId: categoryId,
        isCustom: true,
        userId: currentUser?.id || 'guest',
        synced: false,
        addedAt: Date.now()
      };

      // If user is authenticated, attempt instant cloud sync
      if (currentUser && currentUser.id !== 'guest') {
        await SyncCoordinator.syncSingleTrack(newTrack, currentUser.id);
      } else {
        await dbInstance.saveCustomTrack(newTrack);
      }

      setSuccessMsg('Successfully added soundscape!');
      setUrl('');
      
      // Update local and parent lists
      await loadCustomTracks();
      onTracksUpdated();

      // Trigger BroadcastChannel sync to other open windows/PWA tabs
      const syncChannel = new BroadcastChannel('regain-db-sync');
      syncChannel.postMessage({ type: 'SYNC_CUSTOM_TRACKS' });

    } catch (err) {
      console.warn('oEmbed failed, saving with fallback metadata:', err);
      
      // 2. Fallback metadata so service survives offline or restricted API states
      const fallbackTrack = {
        id: videoId,
        title: `Soundscape (${videoId})`,
        artist: 'Custom Link',
        duration: 1800,
        categoryId: categoryId,
        isCustom: true,
        userId: currentUser?.id || 'guest',
        synced: false,
        addedAt: Date.now()
      };

      await dbInstance.saveCustomTrack(fallbackTrack);
      
      setSuccessMsg('Saved using offline fallback metadata.');
      setUrl('');
      
      await loadCustomTracks();
      onTracksUpdated();

      const syncChannel = new BroadcastChannel('regain-db-sync');
      syncChannel.postMessage({ type: 'SYNC_CUSTOM_TRACKS' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrack = async (trackId) => {
    triggerHaptic();
    if (window.confirm('Are you sure you want to remove this custom soundscape?')) {
      await dbInstance.deleteCustomTrack(trackId);
      
      // Refresh
      await loadCustomTracks();
      onTracksUpdated();

      const syncChannel = new BroadcastChannel('regain-db-sync');
      syncChannel.postMessage({ type: 'SYNC_CUSTOM_TRACKS' });
    }
  };

  return (
    <div id="custom-tracks-modal" className="modal-container-wrapper" onClick={handleClose}>
      <div 
        className="modal-content glass-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'fadeInScale 0.4s cubic-bezier(0.3, 1.5, 0.5, 1) forwards'
        }}
      >
        <div className="modal-header">
          <h2>Custom Soundscapes</h2>
          <button id="close-custom-tracks" className="close-icon" onClick={handleClose}>&times;</button>
        </div>
        
        <div className="modal-inner">
          <form className="custom-track-form" onSubmit={handleAddTrack}>
            <div className="form-group">
              <label htmlFor="custom-track-url">YouTube Link</label>
              <input 
                type="text" 
                id="custom-track-url" 
                className="glass-input" 
                placeholder="Paste link (e.g. https://youtu.be/...)" 
                autoComplete="off"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="custom-track-category">Assign to Category</label>
              <select 
                id="custom-track-category" 
                className="glass-select-native" // Standard styled html select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  background: 'var(--glass-base)',
                  border: '1px solid var(--glass-edge)',
                  color: 'var(--text-pure)',
                  padding: '0.6rem 1rem',
                  borderRadius: '12px',
                  outline: 'none',
                  fontSize: '0.85rem'
                }}
              >
                {categories
                  .filter(c => c.id !== 'user-tracks')
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name.replace(/^[^\w]*/, '').trim()}
                    </option>
                  ))}
              </select>
            </div>
            
            <button 
              id="add-custom-track-btn" 
              type="submit" 
              className="btn btn-premium btn-full"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? 'Resolving soundscape...' : 'Add Soundscape'}</span>
            </button>
            
            {errorMsg && <div id="custom-track-error" className="form-error">{errorMsg}</div>}
            {successMsg && <div className="form-success" style={{ color: '#10b981', fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'center' }}>{successMsg}</div>}
            
            <p className="custom-track-note">
              <span>⚠️</span> Note: Clearing cookies & site data in your browser history will remove your custom soundscapes.
            </p>
          </form>
          
          <div className="custom-tracks-section">
            <h3>Your Custom Soundscapes</h3>
            <div id="saved-custom-tracks-list" className="saved-tracks-list">
              {localTracksList.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1.5rem 0' }}>
                  No custom soundscapes added yet.
                </div>
              ) : (
                localTracksList.map(track => (
                  <div key={track.id} className="user-track-item">
                    <div className="user-track-title" title={track.title}>{track.title}</div>
                    <button 
                      className="delete-track-btn" 
                      onClick={() => handleDeleteTrack(track.id)}
                      aria-label="Delete"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomTracksModal;
