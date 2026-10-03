import express from 'express';
import morgan from 'morgan';
import {createPod} from './kubernetes/pod.js';
import {createService} from './kubernetes/service.js';
import {waitForPod as waitForPodReady} from './kubernetes/waitForPod.js';
import {normalizeKubernetesError} from './kubernetes/config.js';
import {v4 as uuid} from 'uuid';


const app = express();
app.disable('x-powered-by');

export function buildPreviewUrl(sandboxId, port = process.env.PREVIEW_PORT || '8081') {
  const portSuffix = port ? `:${port}` : '';
  return `http://${sandboxId}.preview.localhost${portSuffix}`;
}

// Middleware
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.get('/api/sandbox/health', (req, res) => {
  res.status(200).json({ 
    status: 'success',
    message: 'Sandbox API is healthy!' });
});

app.post('/api/sandbox/create', async (req, res) => {
  try {
    const sandboxId = uuid();// Generate a unique ID for the sandbox

    console.log("Creating sandbox:", sandboxId);
    await createPod(sandboxId);
    await createService(sandboxId);
    await waitForPodReady(sandboxId);

    res.status(201).json({
      status: 'success',
      message: `Sandbox environment created with ID: ${sandboxId}`,
      sandboxId,
      previewUrl: buildPreviewUrl(sandboxId)
    });

  } catch (err) {
    console.error("ERROR:", err);

    const normalizedError = normalizeKubernetesError(err);
    const statusCode = normalizedError.message.includes('Kubernetes cluster') || normalizedError.message.includes('Kubernetes access') ? 503 : 500;

    res.status(statusCode).json({
      status: 'error',
      message: normalizedError.message || 'Sandbox creation failed'
    });
  }
});
export default app;
