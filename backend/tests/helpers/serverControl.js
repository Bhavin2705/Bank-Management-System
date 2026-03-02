const fs = require('fs');
const http = require('http');

const STATE_FILE = '.jest-server-state.json';

const isServerUp = (baseUrl) => new Promise((resolve) => {
    const url = new URL('/health', baseUrl);
    const req = http.get(url, (res) => {
        resolve(res.statusCode === 200);
        res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
        req.destroy();
        resolve(false);
    });
});

const waitForServer = async (baseUrl, timeoutMs = 45000) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        const up = await isServerUp(baseUrl);
        if (up) {
            return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return false;
};

const writeState = (state) => {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8');
};

const readState = () => {
    if (!fs.existsSync(STATE_FILE)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
};

const clearState = () => {
    if (fs.existsSync(STATE_FILE)) {
        fs.unlinkSync(STATE_FILE);
    }
};

module.exports = {
    STATE_FILE,
    isServerUp,
    waitForServer,
    writeState,
    readState,
    clearState
};
