class SoundscapeDB {
    constructor() {
        this.dbName = 'regain-db';
        this.dbVersion = 1;
        this.storeName = 'custom-tracks';
        this.db = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (e) => {
                console.error('SoundscapeDB: Error opening database', e);
                reject(e);
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                console.log('SoundscapeDB: Opened successfully');
                this.requestPersistence();
                resolve();
            };

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
                console.log('SoundscapeDB: Database upgrade completed');
            };
        });
    }

    async requestPersistence() {
        if (navigator.storage && navigator.storage.persist) {
            try {
                const isPersisted = await navigator.storage.persisted();
                console.log(`SoundscapeDB: Storage already persisted? ${isPersisted}`);
                if (!isPersisted) {
                    const granted = await navigator.storage.persist();
                    console.log(`SoundscapeDB: Storage persistence request granted? ${granted}`);
                }
            } catch (err) {
                console.warn('SoundscapeDB: Persistence check failed', err);
            }
        }
    }

    getCustomTracks() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve([]);
                return;
            }
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (e) => reject(e);
        });
    }

    saveCustomTrack(track) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('Database not initialized');
                return;
            }
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(track);

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    }

    deleteCustomTrack(trackId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('Database not initialized');
                return;
            }
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(trackId);

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // --- UI State & DOM Elements ---
    const appEl = document.getElementById('app');
    const timeLeftEl = document.getElementById('time-left');
    const playBtn = document.getElementById('play-btn');
    const timerProgressEl = document.querySelector('.timer-progress');
    const timerMinusBtn = document.getElementById('timer-minus');
    const timerPlusBtn = document.getElementById('timer-plus');
    const trackTitleEl = document.getElementById('current-track-title');
    const trackCategoryEl = document.getElementById('current-track-category');
    const prevTrackBtn = document.getElementById('prev-track');
    const nextTrackBtn = document.getElementById('next-track');
    const categoriesGrid = document.getElementById('categories-grid');
    const endScreen = document.getElementById('end-screen');
    const closeEndScreenBtn = document.getElementById('close-end-screen');
    const recTracksGrid = document.getElementById('rec-tracks');
    const modalContainer = document.getElementById('modal-container');
    const closeModalBtn = document.getElementById('close-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalTracksList = document.getElementById('modal-tracks');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const menuToggleBtn = document.getElementById('menu-toggle');
    const closeMenuBtn = document.getElementById('close-menu');
    const sideMenu = document.getElementById('side-menu');
    const menuCategoriesList = document.getElementById('menu-categories');
    const timerSetting = document.getElementById('default-timer-setting');
    const customTimerContainer = document.getElementById('custom-timer-container');
    const customTimerInput = document.getElementById('custom-timer-input');
    const applyCustomBtn = document.getElementById('apply-custom-timer');
    const categorySetting = document.getElementById('default-category-setting');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const playerCategorySwitch = document.getElementById('player-category-switch');
    const trackInfoEl = document.querySelector('.track-info');

    // --- Custom Track Manager Modal DOM ---
    const customTracksModal = document.getElementById('custom-tracks-modal');
    const closeCustomTracksBtn = document.getElementById('close-custom-tracks');
    const customTrackUrlInput = document.getElementById('custom-track-url');
    const customTrackCategorySelect = document.getElementById('custom-track-category');
    const addCustomTrackBtn = document.getElementById('add-custom-track-btn');
    const customTrackErrorEl = document.getElementById('custom-track-error');
    const savedCustomTracksList = document.getElementById('saved-custom-tracks-list');



    // --- Side Menu Logic ---
    function toggleMenu() {
        sideMenu.classList.toggle('hidden');
        triggerHaptic();
    }

    function closeMenu() {
        sideMenu.classList.add('hidden');
    }

    function renderMenuCategories() {
        menuCategoriesList.innerHTML = '';
        REGAIN_DATA.categories.forEach(cat => {
            const li = document.createElement('li');
            li.textContent = cat.name;
            li.onclick = () => {
                openCategoryModal(cat);
                closeMenu();
            };
            menuCategoriesList.appendChild(li);
        });

        // Add visual separation divider
        const divider = document.createElement('li');
        divider.className = 'menu-divider';
        menuCategoriesList.appendChild(divider);

        // Add custom soundscape integration trigger
        const customTrigger = document.createElement('li');
        customTrigger.className = 'add-custom-trigger-item';
        customTrigger.innerHTML = `<span style="margin-right: 0.6rem;">✏️</span> Custom Tracks`;
        customTrigger.onclick = () => {
            closeMenu();
            openCustomTracksModal();
        };
        menuCategoriesList.appendChild(customTrigger);
    }

    function populateCategorySettings() {
        if (!categorySetting) return;
        categorySetting.innerHTML = '';
        const savedIndex = localStorage.getItem('regain-default-category') || '2';
        
        REGAIN_DATA.categories.forEach((cat, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = cat.name;
            if (index.toString() === savedIndex) option.selected = true;
            categorySetting.appendChild(option);
        });
        
        if (categorySetting.syncCustomSelect) {
            categorySetting.syncCustomSelect();
        }
    }

    // --- Theme Logic ---
    const currentTheme = localStorage.getItem('regain-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    function toggleTheme() {
        const targetTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', targetTheme);
        localStorage.setItem('regain-theme', targetTheme);
        updateThemeIcon(targetTheme);
        triggerHaptic();
    }

    function updateThemeIcon(theme) {
        const sunSVG = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
            </svg>
        `;
        const moonSVG = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
        `;
        themeToggleBtn.innerHTML = theme === 'dark' ? sunSVG : moonSVG;
        themeToggleBtn.style.transform = 'scale(0.8) rotate(-90deg)';
        setTimeout(() => { themeToggleBtn.style.transform = 'scale(1) rotate(0deg)'; }, 50);
    }

    // --- Data Initialization (Shuffle) ---
    function shuffleTracks() {
        REGAIN_DATA.categories.forEach(category => {
            for (let i = category.tracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [category.tracks[i], category.tracks[j]] = [category.tracks[j], category.tracks[i]];
            }
        });
    }
    shuffleTracks();

    // Initialize Database
    const db = new SoundscapeDB();
    await db.init();

    // Custom Tracks Synchronization Engine
    async function syncCustomTracks() {
        const customTracks = await db.getCustomTracks();
        
        // Purge old custom references to avoid duplicate memory maps
        REGAIN_DATA.categories.forEach(cat => {
            cat.tracks = cat.tracks.filter(t => !t.isCustom);
        });
        
        REGAIN_DATA.categories = REGAIN_DATA.categories.filter(c => c.id !== 'user-tracks');
        
        // Distribute custom tracks to parent categories
        customTracks.forEach(track => {
            const parentCat = REGAIN_DATA.categories.find(c => c.id === track.categoryId);
            if (parentCat) {
                if (!parentCat.tracks.some(t => t.id === track.id)) {
                    parentCat.tracks.push(track);
                }
            }
        });
        
        // Append user track virtual category compilation
        if (customTracks.length > 0) {
            const userTracksCat = {
                id: 'user-tracks',
                name: '✏️ User Tracks',
                icon: '📁',
                tracks: [...customTracks]
            };
            REGAIN_DATA.categories.push(userTracksCat);
        }
        
        // Re-render components
        renderCategories();
        renderMenuCategories();
        populateCategorySettings();
        
        if (customTracksModal && !customTracksModal.classList.contains('hidden')) {
            renderSavedCustomTracksList(customTracks);
        }
    }

    // Await startup sync
    await syncCustomTracks();

    // Cross-tab/window database sync channel for running PWA/web instances
    const syncChannel = new BroadcastChannel('regain-db-sync');
    syncChannel.onmessage = async (event) => {
        if (event.data && event.data.type === 'SYNC_CUSTOM_TRACKS') {
            console.log('Cross-session sync event received. Fetching custom tracks...');
            const activeTrackBefore = currentCategory ? currentCategory.tracks[currentTrackIndex] : null;
            
            await syncCustomTracks();
            
            // Safety Check: If the current track was deleted in another tab/instance, switch away cleanly
            if (activeTrackBefore && activeTrackBefore.isCustom) {
                const stillExists = REGAIN_DATA.categories.some(cat => 
                    cat.tracks.some(t => t.id === activeTrackBefore.id)
                );
                if (!stillExists) {
                    console.log('Active custom soundscape deleted in another window. Switching to default.');
                    const defaultCat = REGAIN_DATA.categories.find(c => c.id !== 'user-tracks') || REGAIN_DATA.categories[0];
                    if (defaultCat) {
                        currentCategory = defaultCat;
                        currentTrackIndex = 0;
                        startNewTrack();
                    }
                } else {
                    const currentCatUpdated = REGAIN_DATA.categories.find(c => c.id === currentCategory.id);
                    if (currentCatUpdated) {
                        const newIdx = currentCatUpdated.tracks.findIndex(t => t.id === activeTrackBefore.id);
                        if (newIdx !== -1) {
                            currentTrackIndex = newIdx;
                        }
                    }
                }
            }
        }
    };

    // State & Preference Recovery
    const savedLastTrackId = localStorage.getItem('regain-last-track-id');
    const savedLastCategoryId = localStorage.getItem('regain-last-category-id');
    
    let currentCategory = null;
    let currentTrackIndex = 0;
    
    if (savedLastTrackId && savedLastCategoryId) {
        // Try to find matching track inside stored category
        const cat = REGAIN_DATA.categories.find(c => c.id === savedLastCategoryId);
        if (cat) {
            const trackIdx = cat.tracks.findIndex(t => t.id === savedLastTrackId);
            if (trackIdx !== -1) {
                currentCategory = cat;
                currentTrackIndex = trackIdx;
            }
        }
    }
    
    if (!currentCategory) {
        const savedDefaultCategoryIndex = localStorage.getItem('regain-default-category');
        currentCategory = savedDefaultCategoryIndex !== null && REGAIN_DATA.categories[parseInt(savedDefaultCategoryIndex)]
            ? REGAIN_DATA.categories[parseInt(savedDefaultCategoryIndex)] 
            : REGAIN_DATA.categories[2]; // Default to Deep Relaxation
        currentTrackIndex = 0;
    }
    
    // Load saved shuffle & repeat modes
    let shuffleMode = parseInt(localStorage.getItem('regain-shuffle-mode') || '0');
    let repeatMode = parseInt(localStorage.getItem('regain-repeat-mode') || '0');

    // Load timer duration setting
    const savedTimerSetting = localStorage.getItem('regain-timer-setting') || '20';
    const savedCustomDuration = localStorage.getItem('regain-custom-duration') || '12';
    
    let initialDuration = 20;
    if (savedTimerSetting === 'custom') {
        initialDuration = parseInt(savedCustomDuration) || 20;
    } else {
        initialDuration = parseInt(savedTimerSetting) || 20;
    }

    const audio = new AudioPlayer(
        () => console.log('Audio Ready'),
        (state) => { 
            if (state === YT.PlayerState.ENDED) {
                if (repeatMode === 1) startNewTrack();
                else handleNextTrack();
            }
        }
    );

    const timer = new Timer(
        initialDuration,
        (timeLeft, duration) => {
            timeLeftEl.textContent = timer.getFormattedTime();
            updateTimerVisual(timer.getProgress());
        },
        () => { handleSessionComplete(); }
    );

    function updateTimerVisual(progress) {
        const circumference = 2 * Math.PI * 48;
        const offset = circumference * (1 - progress);
        timerProgressEl.style.strokeDasharray = circumference;
        timerProgressEl.style.strokeDashoffset = offset;
    }

    function triggerHaptic() {
        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(10);
    }

    function toggleSession() {
        triggerHaptic();
        if (timer.isRunning) {
            timer.pause();
            audio.pause();
            appEl.classList.remove('state-focused');
            appEl.classList.add('state-idle');
        } else {
            timer.start();
            if (timer.timeLeft === timer.duration) startNewTrack();
            else audio.resume();
            
            // Watchdog: Sometimes browsers block initial autoplay despite our best efforts.
            // Check shortly after start if it's playing, and force a play if not.
            setTimeout(() => {
                if (timer.isRunning && audio.player && audio.player.getPlayerState() !== YT.PlayerState.PLAYING) {
                    audio.resume();
                }
            }, 1000);

            window.scrollTo({ top: 0, behavior: 'smooth' });
            appEl.classList.add('state-focused');
            appEl.classList.remove('state-idle');
        }
    }

    function startNewTrack() {
        const track = currentCategory.tracks[currentTrackIndex];
        updateTrackUI(track, currentCategory);
        if (timer.isRunning) audio.playTrack(track, currentCategory);
    }

    function updateTrackUI(track, category) {
        if (trackTitleEl) trackTitleEl.textContent = track.title;
        if (trackCategoryEl) trackCategoryEl.textContent = category.name;
        


        // Persist last played track for offline recovery
        localStorage.setItem('regain-last-track-id', track.id);
        localStorage.setItem('regain-last-category-id', category.id);

        updatePlayerStatus();
    }

    function getAllTracks() {
        return REGAIN_DATA.categories.flatMap(c => c.tracks.map(t => ({ ...t, category: c })));
    }

    function handleNextTrack() {
        triggerHaptic();
        
        if (shuffleMode === 1) {
            // Shuffle Category
            currentTrackIndex = Math.floor(Math.random() * currentCategory.tracks.length);
        } else if (shuffleMode === 2) {
            // Shuffle All (Tracks + Category)
            const randomCat = REGAIN_DATA.categories[Math.floor(Math.random() * REGAIN_DATA.categories.length)];
            currentCategory = randomCat;
            currentTrackIndex = Math.floor(Math.random() * currentCategory.tracks.length);
        } else if (currentTrackIndex + 1 < currentCategory.tracks.length) {
            // Sequential Next
            currentTrackIndex++;
        } else {
            // End of category reached
            if (repeatMode === 2) {
                currentTrackIndex = 0; // Repeat Category
            } else {
                // Default behavior: go to next category
                const nextCatIndex = (REGAIN_DATA.categories.indexOf(currentCategory) + 1) % REGAIN_DATA.categories.length;
                currentCategory = REGAIN_DATA.categories[nextCatIndex];
                currentTrackIndex = 0;
            }
        }
        startNewTrack();
    }

    function handlePrevTrack() {
        triggerHaptic();
        if (currentTrackIndex - 1 >= 0) {
            currentTrackIndex--;
        } else {
            currentTrackIndex = currentCategory.tracks.length - 1;
        }
        startNewTrack();
    }

    function toggleShuffle() {
        shuffleMode = (shuffleMode + 1) % 3;
        localStorage.setItem('regain-shuffle-mode', shuffleMode.toString());
        
        // Update UI
        shuffleBtn.classList.remove('mode-1', 'mode-2', 'active');
        if (shuffleMode > 0) {
            shuffleBtn.classList.add('active');
            shuffleBtn.classList.add(`mode-${shuffleMode}`);
        }

        updatePlayerStatus();
        triggerHaptic();
    }

    function toggleRepeat() {
        repeatMode = (repeatMode + 1) % 3;
        localStorage.setItem('regain-repeat-mode', repeatMode.toString());
        
        // Update UI
        repeatBtn.classList.remove('mode-1', 'mode-2', 'active');
        if (repeatMode > 0) {
            repeatBtn.classList.add('active');
            repeatBtn.classList.add(`mode-${repeatMode}`);
        }
        
        updatePlayerStatus();
        triggerHaptic();
    }

    function updatePlayerStatus() {
        const statusLine = document.getElementById('player-status-line');
        if (!statusLine) return;

        const shuffleModes = ['Shuffle Off', 'Shuffle: Category', 'Shuffle: All'];
        const repeatModes = ['Repeat Off', 'Repeat Single', 'Repeat Category'];
        
        const shuffleText = shuffleModes[shuffleMode];
        const repeatText = repeatModes[repeatMode];

        statusLine.innerHTML = `
            <span>${shuffleText}</span>
            <div class="dot"></div>
            <span>${repeatText}</span>
        `;
    }

    window.handleRestrictedTrack = () => { handleNextTrack(); };

    function handleSessionComplete() {
        appEl.classList.remove('state-focused');
        appEl.classList.add('state-idle');
        audio.fadeOut(() => { showEndScreen(); });
    }

    function showEndScreen() {
        renderRecommendations();
        endScreen.classList.remove('hidden');
    }

    function renderRecommendations() {
        recTracksGrid.innerHTML = '';
        const allTracks = getAllTracks();
        const shuffled = allTracks.sort(() => 0.5 - Math.random());
        shuffled.slice(0, 3).forEach(item => {
            const card = document.createElement('div');
            card.className = 'rec-card';
            const thumb = `https://img.youtube.com/vi/${item.id}/default.jpg`;
            card.innerHTML = `
                <img src="${thumb}" onerror="this.src='https://via.placeholder.com/120x90/020617/38bdf8?text=Soundscape'">
                <div class="rec-card-info">
                    <strong>${item.title}</strong>
                    <small>${item.category.name}</small>
                </div>
            `;
            card.onclick = () => {
                currentCategory = item.category;
                currentTrackIndex = item.category.tracks.findIndex(t => t.id === item.id);
                endScreen.classList.add('hidden');
                timer.reset();
                toggleSession();
            };
            recTracksGrid.appendChild(card);
        });
    }

    function renderCategories() {
        if (!categoriesGrid) return;
        categoriesGrid.style.opacity = '0';
        categoriesGrid.innerHTML = '';
        REGAIN_DATA.categories.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'category-card glass-panel';
            card.innerHTML = `<h4>${cat.name}</h4><p>${cat.tracks.length} soundscapes</p>`;
            card.onclick = () => openCategoryModal(cat);
            categoriesGrid.appendChild(card);
        });
        requestAnimationFrame(() => {
            categoriesGrid.style.transition = 'opacity 0.4s ease-out';
            categoriesGrid.style.opacity = '1';
        });
    }

    function formatDuration(seconds) {
        if (!seconds) return '';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        
        if (h > 0) {
            return `${h}h${m > 0 ? ' ' + m + 'm' : ''}`;
        } else {
            return `${m}:${s.toString().padStart(2, '0')}`;
        }
    }

    function openCategoryModal(category) {
        modalTitle.textContent = category.name;
        modalTracksList.innerHTML = '';
        category.tracks.forEach((track, index) => {
            const thumb = `https://img.youtube.com/vi/${track.id}/default.jpg`;
            const item = document.createElement('div');
            item.className = 'track-item';
            
            const badgeHTML = track.isCustom ? `<span class="track-badge-custom">Custom</span>` : '';
            
            item.innerHTML = `
                <img src="${thumb}" class="track-item-img" onerror="this.src='https://via.placeholder.com/120x90/020617/38bdf8?text=Soundscape'">
                <div class="track-item-info">
                    <div class="track-item-title">${track.title}${badgeHTML}</div>
                    <small class="track-item-artist">${track.artist}</small>
                </div>
                <div class="track-item-duration">${formatDuration(track.duration)}</div>
            `;
            item.onclick = () => {
                currentCategory = category;
                currentTrackIndex = index;
                startNewTrack();
                closeModal();
                if (!timer.isRunning) toggleSession();
            };
            modalTracksList.appendChild(item);
        });
        modalContainer.classList.remove('hidden');
    }

    function closeModal() { modalContainer.classList.add('hidden'); }

    // --- Custom Tracks Manager Handlers ---
    function openCustomTracksModal() {
        if (customTracksModal) customTracksModal.classList.remove('hidden');
        populateCustomTrackModalCategories();
        renderSavedCustomTracksList();
        triggerHaptic();
    }

    function closeCustomTracksModal() {
        if (customTracksModal) customTracksModal.classList.add('hidden');
        if (customTrackErrorEl) customTrackErrorEl.classList.add('hidden');
        if (customTrackUrlInput) customTrackUrlInput.value = '';
    }

    function populateCustomTrackModalCategories() {
        if (!customTrackCategorySelect) return;
        customTrackCategorySelect.innerHTML = '';
        REGAIN_DATA.categories.forEach(cat => {
            if (cat.id !== 'user-tracks') {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name.replace(/^[^\w]*/, '').trim(); // Strip emoji for select options
                customTrackCategorySelect.appendChild(option);
            }
        });
    }

    function extractYouTubeId(url) {
        const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[1].length === 11) ? match[1] : null;
    }

    async function handleAddCustomTrack() {
        if (!customTrackUrlInput || !customTrackCategorySelect || !addCustomTrackBtn) return;
        const url = customTrackUrlInput.value.trim();
        const categoryId = customTrackCategorySelect.value;
        
        if (customTrackErrorEl) customTrackErrorEl.classList.add('hidden');
        
        if (!url) {
            showCustomTrackError('Please paste a YouTube URL');
            return;
        }
        
        const videoId = extractYouTubeId(url);
        if (!videoId) {
            showCustomTrackError('Could not parse a valid YouTube Video ID from that link');
            return;
        }
        
        addCustomTrackBtn.disabled = true;
        const btnSpan = addCustomTrackBtn.querySelector('span');
        if (btnSpan) btnSpan.textContent = 'Fetching metadata...';
        
        try {
            // Fetch metadata CORS-free via noembed oEmbed proxy
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
                duration: 1800, // default 30 mins, updated dynamically upon playback
                categoryId: categoryId,
                isCustom: true,
                addedAt: Date.now()
            };
            
            await db.saveCustomTrack(newTrack);
            await syncCustomTracks();
            syncChannel.postMessage({ type: 'SYNC_CUSTOM_TRACKS' });
            
            customTrackUrlInput.value = '';
            if (btnSpan) btnSpan.textContent = 'Success!';
            setTimeout(() => {
                addCustomTrackBtn.disabled = false;
                if (btnSpan) btnSpan.textContent = 'Add Soundscape';
            }, 1200);
            
        } catch (err) {
            console.error('oEmbed resolution failed, using fallback:', err);
            
            // Fallback metadata so service survives offline or restricted APIs
            const newTrack = {
                id: videoId,
                title: `Soundscape (${videoId})`,
                artist: 'Custom Link',
                duration: 1800,
                categoryId: categoryId,
                isCustom: true,
                addedAt: Date.now()
            };
            
            await db.saveCustomTrack(newTrack);
            await syncCustomTracks();
            syncChannel.postMessage({ type: 'SYNC_CUSTOM_TRACKS' });
            
            customTrackUrlInput.value = '';
            showCustomTrackError('Saved using fallback metadata due to network resolution limits.');
            
            addCustomTrackBtn.disabled = false;
            if (btnSpan) btnSpan.textContent = 'Add Soundscape';
        }
    }

    async function handleDeleteCustomTrack(trackId) {
        if (confirm('Are you sure you want to remove this custom soundscape?')) {
            await db.deleteCustomTrack(trackId);
            await syncCustomTracks();
            syncChannel.postMessage({ type: 'SYNC_CUSTOM_TRACKS' });
            triggerHaptic();
        }
    }

    function showCustomTrackError(msg) {
        if (!customTrackErrorEl) return;
        customTrackErrorEl.textContent = msg;
        customTrackErrorEl.classList.remove('hidden');
        triggerHaptic();
    }

    function renderSavedCustomTracksList(customTracks = null) {
        if (!savedCustomTracksList) return;
        savedCustomTracksList.innerHTML = '';
        
        const renderList = async () => {
            const list = customTracks || await db.getCustomTracks();
            if (list.length === 0) {
                savedCustomTracksList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 1.5rem 0;">No custom soundscapes added yet.</div>`;
                return;
            }
            
            // Sort by added date descending
            list.sort((a, b) => b.addedAt - a.addedAt).forEach(track => {
                const div = document.createElement('div');
                div.className = 'user-track-item';
                div.innerHTML = `
                    <div class="user-track-title" title="${track.title}">${track.title}</div>
                    <button class="delete-track-btn" aria-label="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                `;
                
                div.querySelector('.delete-track-btn').onclick = (e) => {
                    e.stopPropagation();
                    handleDeleteCustomTrack(track.id);
                };
                
                div.onclick = () => {
                    const parentCat = REGAIN_DATA.categories.find(c => c.id === track.categoryId) || REGAIN_DATA.categories.find(c => c.id === 'user-tracks');
                    if (parentCat) {
                        const idx = parentCat.tracks.findIndex(t => t.id === track.id);
                        if (idx !== -1) {
                            currentCategory = parentCat;
                            currentTrackIndex = idx;
                            startNewTrack();
                            closeCustomTracksModal();
                            if (!timer.isRunning) toggleSession();
                        }
                    }
                };
                
                savedCustomTracksList.appendChild(div);
            });
        };
        
        renderList();
    }

    // --- Event Listeners ---
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
    if (menuToggleBtn) menuToggleBtn.addEventListener('click', toggleMenu);
    if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMenu);
    if (playBtn) playBtn.addEventListener('click', toggleSession);
    if (timerMinusBtn) timerMinusBtn.addEventListener('click', () => { triggerHaptic(); timer.adjustDuration(-5); });
    if (timerPlusBtn) timerPlusBtn.addEventListener('click', () => { triggerHaptic(); timer.adjustDuration(5); });
    if (nextTrackBtn) nextTrackBtn.addEventListener('click', handleNextTrack);
    if (prevTrackBtn) prevTrackBtn.addEventListener('click', handlePrevTrack);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (closeCustomTracksBtn) closeCustomTracksBtn.addEventListener('click', closeCustomTracksModal);
    if (addCustomTrackBtn) addCustomTrackBtn.addEventListener('click', handleAddCustomTrack);
    if (customTrackUrlInput) {
        customTrackUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAddCustomTrack();
        });
    }
    
    window.onclick = (e) => { 
        if (e.target === modalContainer) closeModal(); 
        if (e.target === sideMenu) closeMenu();
        if (customTracksModal && e.target === customTracksModal) closeCustomTracksModal();
    };
    if (closeEndScreenBtn) {
        closeEndScreenBtn.addEventListener('click', () => { 
            if (endScreen) endScreen.classList.add('hidden'); 
            timer.reset(); 
        });
    }
    if (timerSetting) {
        timerSetting.addEventListener('change', (e) => {
            localStorage.setItem('regain-timer-setting', e.target.value);
            if (e.target.value === 'custom') {
                if (customTimerContainer) {
                    customTimerContainer.classList.remove('hidden');
                    if (customTimerInput) customTimerInput.focus();
                }
            } else {
                if (customTimerContainer) customTimerContainer.classList.add('hidden');
                timer.setDefault(parseInt(e.target.value));
                closeMenu();
            }
        });
    }

    const applyCustomValue = () => {
        const val = parseInt(customTimerInput.value);
        if (val > 0) {
            localStorage.setItem('regain-timer-setting', 'custom');
            localStorage.setItem('regain-custom-duration', val.toString());
            timer.setDefault(val);
            customTimerContainer.classList.add('hidden');
            closeMenu();
        }
    };

    if (applyCustomBtn) applyCustomBtn.addEventListener('click', applyCustomValue);
    customTimerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyCustomValue();
    });
    categorySetting.addEventListener('change', (e) => {
        localStorage.setItem('regain-default-category', e.target.value);
        closeMenu();
    });

    if (shuffleBtn) shuffleBtn.addEventListener('click', toggleShuffle);
    if (repeatBtn) repeatBtn.addEventListener('click', toggleRepeat);
    

    if (playerCategorySwitch) {
        playerCategorySwitch.addEventListener('click', (e) => {
            if (trackInfoEl && !trackInfoEl.classList.contains('expanded')) {
                e.stopPropagation();
                trackInfoEl.classList.add('expanded');
                triggerHaptic();
                return;
            }
            if (currentCategory) {
                openCategoryModal(currentCategory);
            }
        });
    }

    let pillCollapseTimeout;
    const startPillCollapseTimer = () => {
        if (pillCollapseTimeout) clearTimeout(pillCollapseTimeout);
        pillCollapseTimeout = setTimeout(() => {
            if (trackInfoEl && trackInfoEl.classList.contains('expanded')) {
                trackInfoEl.classList.remove('expanded');
            }
        }, 8000);
    };

    const resetPillCollapseTimer = () => {
        if (trackInfoEl && trackInfoEl.classList.contains('expanded')) {
            startPillCollapseTimer();
        }
    };

    if (trackInfoEl) {
        trackInfoEl.addEventListener('click', (e) => {
            const isControl = e.target.closest('button') || e.target.closest('.control-btn') || e.target.closest('input');
            if (isControl) {
                resetPillCollapseTimer();
                return;
            }

            if (trackInfoEl.classList.contains('expanded')) {
                trackInfoEl.classList.remove('expanded');
                if (pillCollapseTimeout) clearTimeout(pillCollapseTimeout);
            } else {
                trackInfoEl.classList.add('expanded');
                startPillCollapseTimer();
            }
            triggerHaptic();
        });

        // Reset the 8s timer if user interacts with the expanded pill
        trackInfoEl.addEventListener('touchstart', resetPillCollapseTimer, {passive: true});
        trackInfoEl.addEventListener('mousemove', resetPillCollapseTimer);
    }

    // --- Premium Custom Select Initializer ---
    function initializeCustomSelect(selectEl) {
        if (!selectEl) return;
        
        // Prevent duplicate initializations
        if (selectEl.nextElementSibling && selectEl.nextElementSibling.classList.contains('custom-select')) {
            selectEl.nextElementSibling.remove();
        }
        
        const container = document.createElement('div');
        container.className = 'custom-select';
        container.setAttribute('data-select-id', selectEl.id);

        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        
        const triggerText = document.createElement('span');
        const activeOption = selectEl.options[selectEl.selectedIndex];
        triggerText.textContent = activeOption ? activeOption.textContent : '';

        const chevronSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        chevronSvg.setAttribute('class', 'chevron');
        chevronSvg.setAttribute('viewBox', '0 0 24 24');
        chevronSvg.innerHTML = `<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
        
        trigger.appendChild(triggerText);
        trigger.appendChild(chevronSvg);
        container.appendChild(trigger);

        const optionsList = document.createElement('div');
        optionsList.className = 'custom-select-options';
        container.appendChild(optionsList);

        function rebuildOptions() {
            optionsList.innerHTML = '';
            Array.from(selectEl.options).forEach(opt => {
                const optionItem = document.createElement('div');
                optionItem.className = 'custom-select-option';
                if (opt.selected) {
                    optionItem.classList.add('selected');
                }
                optionItem.setAttribute('data-value', opt.value);
                optionItem.textContent = opt.textContent;
                
                optionItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectEl.value = opt.value;
                    
                    optionsList.querySelectorAll('.custom-select-option').forEach(el => {
                        el.classList.remove('selected');
                    });
                    optionItem.classList.add('selected');
                    
                    triggerText.textContent = opt.textContent;
                    container.classList.remove('open');
                    
                    selectEl.dispatchEvent(new Event('change'));
                });
                
                optionsList.appendChild(optionItem);
            });
        }

        rebuildOptions();

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerHaptic();
            
            document.querySelectorAll('.custom-select').forEach(other => {
                if (other !== container) other.classList.remove('open');
            });
            
            container.classList.toggle('open');
        });

        selectEl.style.setProperty('display', 'none', 'important');
        selectEl.parentNode.insertBefore(container, selectEl);

        selectEl.syncCustomSelect = () => {
            const currentActive = selectEl.options[selectEl.selectedIndex];
            triggerText.textContent = currentActive ? currentActive.textContent : '';
            rebuildOptions();
        };
    }

    // Global Click outside and Keydown handlers for select dropdown closures
    window.addEventListener('click', () => {
        document.querySelectorAll('.custom-select').forEach(el => {
            el.classList.remove('open');
        });
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.custom-select').forEach(el => {
                el.classList.remove('open');
            });
            closeMenu();
            closeModal();
            closeCustomTracksModal();
        }
    });

    // Apply saved default timer preferences to inputs
    if (timerSetting) {
        timerSetting.value = savedTimerSetting;
        if (savedTimerSetting === 'custom') {
            customTimerContainer.classList.remove('hidden');
            customTimerInput.value = savedCustomDuration;
        } else {
            customTimerContainer.classList.add('hidden');
        }
    }

    // Initial Render
    updateTrackUI(currentCategory.tracks[currentTrackIndex], currentCategory);
    renderCategories();
    renderMenuCategories();
    populateCategorySettings();
    
    // Initialize custom dropdown triggers visually
    if (timerSetting) initializeCustomSelect(timerSetting);
    if (categorySetting) initializeCustomSelect(categorySetting);

    // Apply active classes to shuffle and repeat buttons matching state recovery
    if (shuffleBtn) {
        shuffleBtn.classList.remove('mode-1', 'mode-2', 'active');
        if (shuffleMode > 0) {
            shuffleBtn.classList.add('active', `mode-${shuffleMode}`);
        }
    }
    if (repeatBtn) {
        repeatBtn.classList.remove('mode-1', 'mode-2', 'active');
        if (repeatMode > 0) {
            repeatBtn.classList.add('active', `mode-${repeatMode}`);
        }
    }
    updatePlayerStatus();

    // --- Smart PWA Installation Logic ---
    let deferredPrompt;
    const installAppContainer = document.getElementById('install-app-container');
    const installAppBtn = document.getElementById('install-app-btn');
    const installToast = document.getElementById('install-toast');
    const toastInstallBtn = document.getElementById('toast-install-btn');
    const toastCloseBtn = document.getElementById('toast-close-btn');

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    // Track installation prompts
    const INSTALL_KEY = 'regain-install-info';
    let installInfo = JSON.parse(localStorage.getItem(INSTALL_KEY) || '{"count": 0, "lastShown": 0, "dismissed": false}');

    function saveInstallInfo() {
        localStorage.setItem(INSTALL_KEY, JSON.stringify(installInfo));
    }

    function showInstallPrompt() {
        if (isStandalone || installInfo.dismissed) return;
        
        // Show after 5 minutes (midway) or if it's been more than 2 days since last prompt
        const now = Date.now();
        const twoDays = 2 * 24 * 60 * 60 * 1000;
        
        if (installInfo.count === 0 || (now - installInfo.lastShown > twoDays)) {
            if (deferredPrompt) {
                installToast.classList.remove('hidden');
                installInfo.count++;
                installInfo.lastShown = now;
                saveInstallInfo();
            }
        }
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show in settings menu always if available
        if (installAppContainer && !isStandalone) {
            installAppContainer.style.display = 'flex';
        }

        // Logic for "Midway" prompt
        // Show after 30 seconds of app being open.
        setTimeout(() => {
            showInstallPrompt();
        }, 30 * 1000); 
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        if (installAppContainer) installAppContainer.style.display = 'none';
        if (installToast) installToast.classList.add('hidden');
        console.log('Regain was installed');
    });

    async function triggerInstall() {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            installInfo.dismissed = true;
            saveInstallInfo();
            installToast.classList.add('hidden');
        }
        deferredPrompt = null;
    }

    if (installAppBtn) installAppBtn.addEventListener('click', triggerInstall);
    if (toastInstallBtn) toastInstallBtn.addEventListener('click', triggerInstall);
    if (toastCloseBtn) {
        toastCloseBtn.addEventListener('click', () => {
            installToast.classList.add('hidden');
            triggerHaptic();
        });
    }
});