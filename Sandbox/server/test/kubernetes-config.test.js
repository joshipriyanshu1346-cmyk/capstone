import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeKubernetesError } from '../src/kubernetes/config.js';
import { buildPreviewUrl } from '../src/app.js';

test('builds preview URLs with the local port by default', () => {
  assert.equal(buildPreviewUrl('abc-123'), 'http://abc-123.preview.localhost:8081');
});

test('can build preview URLs without a port', () => {
  assert.equal(buildPreviewUrl('abc-123', ''), 'http://abc-123.preview.localhost');
});

test('includes the configured preview port in preview URLs', () => {
  assert.equal(buildPreviewUrl('abc-123', '8081'), 'http://abc-123.preview.localhost:8081');
});

test('normalizes connection refused errors into a clear message', () => {
  const error = new Error('request to https://127.0.0.1:53468/api/v1/namespaces/default/pods failed, reason: connect ECONNREFUSED 127.0.0.1:53468');
  const normalized = normalizeKubernetesError(error);

  assert.equal(normalized.message, 'Kubernetes cluster is unreachable. Start your cluster or fix your kubeconfig before creating a sandbox.');
});

test('handles missing pod status gracefully', () => {
  const error = new Error('Cannot read properties of undefined (reading \'status\')');
  const normalized = normalizeKubernetesError(error);

  assert.equal(normalized.message, 'Cannot read properties of undefined (reading \'status\')');
});
