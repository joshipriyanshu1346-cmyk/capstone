import express from 'express';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';
const app = express();

app.use(express.json());
app.use(morgan('combined'));

app.get('/api/health', (req, res) => {
    res.status(200).json({  
        status: 'success',
        message: 'Template API is healthy!' });
});

app.get('/api/ready', (req, res) => {
    res.status(200).json({  
        status: 'success',
        message: 'Template API is ready!' });
});

const proxy = {}
function getProxy(sandboxID) {
    const target = `http://${sandboxID}.preview.localhost`;
    if (!proxy[sandboxID]) {
            proxy[sandboxID] = createProxyMiddleware({
            target,
            changeOrigin: true,
            ws: true,
            logLevel: 'debug',
            onError: (err, req, res) => {
                console.error(`Error proxying request to ${target}:`, err);
                res.status(500).send('Proxy error');
            }
            

        });
    }
    return proxy[sandboxID];
}

    

app.use((req,res,next) => {
    const host = req.headers.host;
    const sandboxID = host.split('.')[0];

    return getProxy(sandboxID)(req, res, next);

});

export default app;