import express from 'express';
import morgan from 'morgan';
// https://nextstep.tcsapps.com/indiacampus/#

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


export default app;
