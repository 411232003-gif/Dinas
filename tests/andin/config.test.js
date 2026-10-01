import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function start(overrides, args = []) {
  return spawnSync(process.execPath, ['server/andin/index.js', ...args], {
    encoding: 'utf8', timeout: 15000,
    env: { ...process.env, ANDIN_ORIGINS: '', ANDIN_STORAGE: 'file', ...overrides },
  });
}

test('production cannot enable development authentication', () => {
  const result = start({ NODE_ENV: 'production' }, ['--dev-auth']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Development authentication is forbidden/);
});

test('production requires an explicit origin allowlist', () => {
  const result = start({ NODE_ENV: 'production' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ANDIN_ORIGINS/);
});

test('game persistence refuses the existing default Firestore database', () => {
  const result = start({ NODE_ENV: 'production', ANDIN_ORIGINS: 'https://test.invalid', ANDIN_STORAGE: 'firestore', ANDIN_FIRESTORE_DATABASE: '(default)' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /isolated named database/);
});

test('development authentication rejects non-local origins', () => {
  const result = start({ NODE_ENV: 'development', ANDIN_ORIGINS: 'https://test.invalid' }, ['--dev-auth']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /only permits localhost origins/);
});
