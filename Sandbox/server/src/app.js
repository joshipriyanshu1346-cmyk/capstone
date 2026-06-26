import express from 'express';
import morgan from 'morgan';
import {createPod} from './kubernetes/pod.js';
import {createService} from './kubernetes/service.js';
import {v4 as uuid} from 'uuid';


const app = express();

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

    await Promise.all([
      createPod(sandboxId),// Create a Kubernetes pod for the sandbox
      createService(sandboxId)// Create a Kubernetes service for the sandbox
    ]);

    res.status(201).json({
      status: 'success',
      message: `Sandbox environment created with ID: ${sandboxId}`,
      sandboxId,
      previewUrl: `http://${sandboxId}.preview.localhost`
    });

  } catch (err) {
    console.error("ERROR:", err);

    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});
export default app;
