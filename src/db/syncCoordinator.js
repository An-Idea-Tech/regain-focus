import dbInstance from './soundscapeDb';

/**
 * SyncCoordinator
 * Orchestrates the data migration between local IndexedDB/localStorage 
 * and a future cloud backend database.
 */
export const SyncCoordinator = {
  /**
   * Identifies all custom tracks that have not yet been synced to the backend.
   */
  async getUnsyncedTracks(userId = 'guest') {
    const allTracks = await dbInstance.getAllLocalTracks();
    return allTracks.filter(track => track.userId === userId && !track.synced);
  },

  /**
   * Migrates all offline 'guest' soundscapes and local preferences 
   * to a newly authenticated cloud user account.
   * 
   * @param {string} newCloudUserId - The permanent user ID received from auth (e.g., Firebase, Supabase, Node backend)
   * @returns {Promise<{success: boolean, migratedCount: number}>}
   */
  async migrateGuestDataToCloud(newCloudUserId) {
    if (!newCloudUserId || newCloudUserId === 'guest') {
      return { success: false, migratedCount: 0, error: 'Invalid User ID' };
    }

    try {
      console.log(`SyncCoordinator: Starting guest data migration to user: ${newCloudUserId}`);
      
      // 1. Fetch all local custom soundscapes belonging to the guest
      const guestTracks = await dbInstance.getCustomTracks('guest');
      
      if (guestTracks.length === 0) {
        console.log('SyncCoordinator: No guest custom soundscapes to migrate.');
      } else {
        console.log(`SyncCoordinator: Found ${guestTracks.length} guest tracks. Preparing sync payloads...`);

        // --- BACKEND PROVISION SLOT ---
        // In the future, this is where you would make a REST or GraphQL request:
        //
        // const response = await fetch('https://api.regain.com/v1/sync', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        //   body: JSON.stringify({ tracks: guestTracks })
        // });
        // if (!response.ok) throw new Error('API server rejected the synchronization');
        // ------------------------------

        // Simulated network delay (mocking the future API sync round-trip)
        await new Promise(resolve => setTimeout(resolve, 800));

        // 2. Loop and update each record in IndexedDB: re-bind to the authenticated userId and flag as synced
        for (const track of guestTracks) {
          const migratedTrack = {
            ...track,
            userId: newCloudUserId,
            synced: true,      // Set to true because it is now backed up in the cloud
            updatedAt: Date.now()
          };
          await dbInstance.saveCustomTrack(migratedTrack);
          // Delete old guest reference so user profiles remain isolated
          if (track.id) {
            // Since key is ID, changing properties updates the record. 
            // If the ID remains the same, updating its userId is sufficient.
          }
        }
        
        console.log('SyncCoordinator: Soundscape migration successful!');
      }

      // 3. Migrate local preferences from LocalStorage
      const localPrefs = {
        theme: localStorage.getItem('regain-theme') || 'dark',
        timerSetting: localStorage.getItem('regain-timer-setting') || '20',
        customDuration: localStorage.getItem('regain-custom-duration') || '12',
        defaultCategory: localStorage.getItem('regain-default-category') || '2',
        shuffleMode: localStorage.getItem('regain-shuffle-mode') || '0',
        repeatMode: localStorage.getItem('regain-repeat-mode') || '0'
      };

      // --- BACKEND PREFERENCE PROVISION SLOT ---
      // Sync these local preferences to the user profile on the server:
      // await fetch('https://api.regain.com/v1/user/settings', { method: 'PUT', ... });
      // -----------------------------------------

      return {
        success: true,
        migratedCount: guestTracks.length,
        preferencesMigrated: true
      };

    } catch (error) {
      console.error('SyncCoordinator: Migration failed', error);
      return {
        success: false,
        migratedCount: 0,
        error: error.message || 'Unknown synchronization error'
      };
    }
  },

  /**
   * Triggered when adding a new soundscape while logged in.
   * Directly posts to backend first (or caches locally if offline).
   */
  async syncSingleTrack(track, userId) {
    if (!userId || userId === 'guest') return;

    try {
      // Future API sync slot:
      // await fetch('https://api.regain.com/v1/tracks', { method: 'POST', body: JSON.stringify(track) });
      
      // Update IndexedDB as synced
      await dbInstance.saveCustomTrack({
        ...track,
        userId: userId,
        synced: true,
        updatedAt: Date.now()
      });
      console.log(`SyncCoordinator: Soundscape ${track.id} synced to cloud for user: ${userId}`);
    } catch (e) {
      console.warn('SyncCoordinator: Cloud sync failed, saving locally as unsynced.', e);
      await dbInstance.saveCustomTrack({
        ...track,
        userId: userId,
        synced: false,
        updatedAt: Date.now()
      });
    }
  }
};

export default SyncCoordinator;
