// Shim que injeta EXPO_OFFLINE=1 e roda expo start.
// Replaces cross-env (que tem bug de bin hoisting com pnpm hoisted + Windows).

process.env.EXPO_OFFLINE = '1';

const { spawn } = require('node:child_process');
const args = process.argv.slice(2);

const child = spawn('npx', ['expo', 'start', ...args], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
  console.error('Failed to spawn expo:', err);
  process.exit(1);
});
