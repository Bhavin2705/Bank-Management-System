/* eslint-disable no-console */
const { spawnSync } = require('child_process');

const tasks = [
    { name: 'seedAdmin', file: 'seeders/seedAdmin.js' },
    { name: 'seedBanks', file: 'seeders/seedBanks.js' }
];

for (const task of tasks) {
    const result = spawnSync(process.execPath, [task.file], {
        stdio: 'inherit',
        cwd: process.cwd()
    });

    if (result.status !== 0) {
        console.error(`Failed: ${task.name}`);
        process.exit(result.status || 1);
    }
}

console.log('Seeding completed successfully.');
