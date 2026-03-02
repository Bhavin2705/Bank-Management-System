const { readState, clearState } = require('./helpers/serverControl');

module.exports = async () => {
    const state = readState();
    if (!state) {
        return;
    }

    if (state.managed && state.pid) {
        try {
            process.kill(state.pid, 'SIGTERM');
        } catch (_) {
        }
    }

    clearState();
};
