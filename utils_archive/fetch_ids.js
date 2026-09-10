const https = require('https');
const queries = ['ambient+focus+music', 'deep+relaxation+music', 'nature+rain+sounds', 'zen+temple+flute'];

queries.forEach(query => {
    https.get('https://www.youtube.com/results?search_query=' + query, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
            let match;
            let ids = [];
            while ((match = regex.exec(body)) !== null) {
                if (!ids.includes(match[1])) ids.push(match[1]);
            }
            console.log(query + ': ' + ids.slice(0, 10).join(', '));
        });
    });
});
