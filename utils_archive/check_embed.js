const https = require('https');

const ids = [
    '1ZYbU82GVz4', 'YRJ6xoiRcpQ', 'I3OJUwILelU', 'u3papaX85MA', 'NPBiLXkhzFo', 'UnnOYEBzTO8', 'rCSCPujLs14', 'loO-KqvSZ6U', '8QadAnW-Zow', 'vqioMARj1T0',
    'npy3ql94TpI', 'RVHsmuO4xlg', 'VeBXc9H6fLw', 'YUDTlS6Qzbs', 'IbD0-hRHKVU', 'C20oIk-APRc', 'wavV_vy7ZUU', 'zHEKplaCnXQ', 'wxwfHs3nM5g', 'ePb9m58EUWo',
    'yIQd2Ya0Ziw', 'ubNfkpbxXUs', 'gP9sGBywjks', '3VPFzo50yiM', 'o8GrqUSdzi0', 'R0NME9W3cR4', 'lP4wSXSH9nM', 'NiV-E6mLbcc', 'mPZkdNFkNps', '4bskZYoO0N0',
    '4GnVDPD01as', 'sjkrrmBnpGE', 'WerCpkTJQTM', '4wNk0cgm9sA', '0rZ-SRGfeWg', 'lkkGlVWvkLk', '4ENuzv-Xe0Q', 'hpAD6SGi3j8', 'VM8DHYeCvSE', 'jXZAbnn1kTU'
];

let valid = [];
let pending = ids.length;

ids.forEach(id => {
    https.get('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + id + '&format=json', res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                try {
                    const data = JSON.parse(body);
                    valid.push({ id, title: data.title, author: data.author_name });
                } catch(e) {}
            }
            pending--;
            if (pending === 0) console.log(JSON.stringify(valid, null, 2));
        });
    });
});
