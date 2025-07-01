const fs = require('node:fs');
const path = require('node:path');
const https = require('https');

async function validateToken(token) {
    if (!token || typeof token !== 'string' || token.trim() === '') return false;
    
    return new Promise((resolve) => {
        const options = {
            hostname: 'discord.com',
            path: '/api/v10/users/@me',
            method: 'GET',
            headers: { 'Authorization': `Bot ${token}` }
        };

        const req = https.request(options, (res) => resolve(res.statusCode === 200));
        req.on('error', () => resolve(false));
        req.end();
    });
}

module.exports = async function checkEnvironment(client) {
    const requiredFolders = ['commands', 'events', 'prefix'];

    for (const folder of requiredFolders) {
        const folderPath = path.join(__dirname, '..', '..', folder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            client.logs.info(`Created missing folder: ${folder}`);
        }
    }

    const token = client.config.getConfig().token;

    if (!token || !(await validateToken(token))) {
        client.logs.error('CRITICAL: The bot token in config.json is missing or invalid.');
        process.exit(1);
    }

    client.token = token;
    client.logs.success('Environment check passed. Token is valid.');
};