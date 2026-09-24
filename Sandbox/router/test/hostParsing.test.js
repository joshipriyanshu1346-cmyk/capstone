import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSandboxIdFromHost } from '../src/app.js';

test('extracts sandbox id from preview hostname', () => {
  assert.equal(extractSandboxIdFromHost('abc-123.preview.localhost'), 'abc-123');
});

test('extracts sandbox id when hostname includes a port', () => {
  assert.equal(extractSandboxIdFromHost('abc-123.preview.localhost:3000'), 'abc-123');
});

test('rejects non preview hosts', () => {
  assert.equal(extractSandboxIdFromHost('localhost:3000'), null);
});
