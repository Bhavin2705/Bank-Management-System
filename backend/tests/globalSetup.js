const path = require('path');
const { spawn } = require('child_process');
const { isServerUp, waitForServer, writeState } = require('./helpers/serverControl');

module.exports = async () => {
    const testPort = process.env.TEST_PORT || '5055';
    const baseUrl = process.env.TEST_BASE_URL || `http://127.0.0.1:${testPort}`;
    const alreadyRunning = await isServerUp(baseUrl);

    if (alreadyRunning) {
        writeState({ managed: false, baseUrl });
        return;
    }

    const backendDir = path.resolve(__dirname, '..');
    const child = spawn(process.execPath, ['server.js'], {
        cwd: backendDir,
        env: {
            ...process.env,
            PORT: String(new URL(baseUrl).port || testPort),
            NODE_ENV: process.env.NODE_ENV || 'test'
        },
        detached: true,
        stdio: 'ignore'
    });

    child.unref();

    const ready = await waitForServer(baseUrl);
    if (!ready) {
        throw new Error(`Backend server did not start within timeout at ${baseUrl}`);
    }

    writeState({
        managed: true,
        baseUrl,
        pid: child.pid
    });
};
