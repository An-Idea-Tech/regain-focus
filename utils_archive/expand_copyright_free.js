const https = require('https');
const fs = require('fs');

const categoriesConfig = [
    {
        id: 'zen-temple',
        name: 'Zen Temple',
        target: 50,
        queries: [
            'zen temple flute copyright free', 
            'tibetan singing bowls royalty free', 
            'bamboo flute meditation copyright free', 
            'japanese garden music royalty free', 
            'healing zen flute creative commons',
            'zen meditation music no copyright',
            'monk chanting ambient copyright free'
        ]
    },
    {
        id: 'neural-focus',
        name: 'Neural Focus',
        target: 30,
        queries: [
            'ambient focus music copyright free', 
            'lofi hip hop study royalty free', 
            'deep work music no copyright', 
            'synthwave focus creative commons', 
            'gamma brainwaves copyright free'
        ]
    },
    {
        id: 'deep-relaxation',
        name: 'Deep Relaxation',
        target: 30,
        queries: [
            'deep relaxation music copyright free', 
            '432hz sleep royalty free', 
            'calming ambient music no copyright', 
            'stress relief music creative commons', 
            'peaceful sleep music copyright free'
        ]
    },
    {
        id: 'nature-immersion',
        name: 'Nature Immersion',
        target: 30,
        queries: [
            'nature rain sounds copyright free', 
            'forest river sounds royalty free', 
            'thunderstorm for sleep no copyright', 
            'ocean waves ambient creative commons', 
            'waterfall sounds copyright free'
        ]
    }
];

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
        if (uniqueIds.size >= cat.target * 2) break;
        const ids = await fetchSearch(query);
        ids.forEach(id => uniqueIds.add(id));
    }
    
    const idArray = Array.from(uniqueIds);
    console.log(`Found ${idArray.length} potential IDs for ${cat.name}. Validating...`);
    
    let validTracks = [];
    // Validate concurrently in batches of 10
    for (let i = 0; i < idArray.length; i += 10) {
        if (validTracks.length >= cat.target) break;
        
        const batch = idArray.slice(i, i + 10);
        const results = await Promise.all(batch.map(validateId));
        
        results.forEach(res => {
            if (res && validTracks.length < cat.target) {
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
