// Shim que injeta EXPO_OFFLINE=1 e roda expo start.
// Replaces cross-env (que tem bug de bin hoisting com pnpm hoisted + Windows).
//
// Bônus: auto-detecta IP de wifi LAN (192.168.x.x) pra anunciar pro Expo Go.
// Sem isso, em máquinas com VPN ou múltiplas interfaces, o Expo Go às vezes
// pega o IP errado (VPN/ethernet em vez do wifi do celular) e dá timeout.
// Override manual: setar REACT_NATIVE_PACKAGER_HOSTNAME no env antes.

const os = require('node:os');

process.env.EXPO_OFFLINE = '1';

if (!process.env.REACT_NATIVE_PACKAGER_HOSTNAME) {
  const ip = pickLanIp();
  if (ip) {
    process.env.REACT_NATIVE_PACKAGER_HOSTNAME = ip;
    console.log(`[dev.cjs] LAN IP detectado: ${ip}`);
  }
}

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

/**
 * Procura IP IPv4 LAN-like nesta ordem:
 *   1. 192.168.x.x (home/router típico)
 *   2. 172.16.x.x – 172.31.x.x (corporate LAN)
 *   3. 10.x.x.x (carrier-grade NAT ou VPN — último recurso)
 * Retorna null se só houver loopback.
 */
function pickLanIp() {
  const ifaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(ifaces)) {
    for (const addr of ifaces[name] || []) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      candidates.push({ name, ip: addr.address });
    }
  }
  const score = (ip) => {
    if (ip.startsWith('192.168.')) return 0;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 1;
    if (ip.startsWith('10.')) return 2;
    return 3;
  };
  candidates.sort((a, b) => score(a.ip) - score(b.ip));
  return candidates[0]?.ip ?? null;
}
