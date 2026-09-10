const https = require('https');
const fs = require('fs');

const categoriesConfig = [
    {
        id: 'neural-focus',
        name: 'Neural Focus',
        queries: ['ambient focus music', 'lofi hip hop study', 'deep work music', 'synthwave focus', 'gamma brainwaves']
    },
    {
        id: 'deep-relaxation',
        name: 'Deep Relaxation',
        queries: ['deep relaxation music', '432hz sleep', 'calming ambient music', 'stress relief music', 'peaceful sleep music']
    },
    {
        id: 'nature-immersion',
        name: 'Nature Immersion',
        queries: ['nature rain sounds', 'forest river sounds', 'thunderstorm for sleep', 'ocean waves ambient', 'waterfall sounds']
    },
    {
        id: 'zen-temple',
        name: 'Zen Temple',
        queries: ['zen temple flute', 'tibetan singing bowls', 'bamboo flute meditation', 'japanese garden music', 'healing zen flute']
    }
];

const TARGET_TRACKS = 30; // Total tracks per category

async function fetchSearch(query) {
    return new Promise((resolve, reject) => {
        https.get('https://www.youtube.com/results?search_query=' + encodeURIComponent(query), res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
                let match;
                let ids = [];
                while ((match = regex.exec(body)) !== null) {
                    if (!ids.includes(match[1])) ids.push(match[1]);
                }
                resolve(ids);
            });
        }).on('error', reject);
    });
}

async function validateId(id) {
    return new Promise(resolve => {
        https.get('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + id + '&format=json', res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const data = JSON.parse(body);
                        resolve({ id, title: data.title, artist: data.author_name });
                        return;
                    } catch(e) {}
                }
                resolve(null);
            });
        }).on('error', () => resolve(null));
    });
}

async function processCategory(cat) {
    console.log(`Processing category: ${cat.name}...`);
    let uniqueIds = new Set();
    
    // Scrape IDs
    for (let query of cat.queries) {
        if (uniqueIds.size >= TARGET_TRACKS * 2) break;
        const ids = await fetchSearch(query);
        ids.forEach(id => uniqueIds.add(id));
    }
    
    const idArray = Array.from(uniqueIds);
    console.log(`Found ${idArray.length} potential IDs for ${cat.name}. Validating...`);
    
    let validTracks = [];
    // Validate concurrently in batches of 10 to avoid overwhelming
    for (let i = 0; i < idArray.length; i += 10) {
        if (validTracks.length >= TARGET_TRACKS) break;
        
        const batch = idArray.slice(i, i + 10);
        const results = await Promise.all(batch.map(validateId));
        
        results.forEach(res => {
            if (res && validTracks.length < TARGET_TRACKS) {
                // Sanitize titles (remove quotes, etc)
                res.title = res.title.replace(/["']/g, '');
                res.artist = res.artist.replace(/["']/g, '');
                validTracks.push(res);
            }
        });
    }
    
    console.log(`Category ${cat.name} complete with ${validTracks.length} valid tracks.`);
    return {
        id: cat.id,
        name: cat.name,
        tracks: validTracks
    };
}

async function main() {
    let finalCategories = [];
    for (let cat of categoriesConfig) {
        const processed = await processCategory(cat);
        finalCategories.push(processed);
    }
    
    const fileContent = `const REGAIN_DATA = ${JSON.stringify({ categories: finalCategories }, null, 4)};\n`;
    fs.writeFileSync('js/data.js', fileContent, 'utf8');
    console.log('Successfully written to js/data.js');
}

main().catch(console.error);
