import express from "express";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

export function extractSandboxIdFromHost(host) {
    if (!host) return null;

    const cleanHost = host.split(':')[0].trim().toLowerCase();
    const previewHost = ".preview.localhost";

    if (!cleanHost.endsWith(previewHost)) {
        return null;
    }

    const sandboxId = cleanHost.slice(0, -previewHost.length);
    return sandboxId && sandboxId !== "localhost" ? sandboxId : null;
}

// Middleware
app.use(morgan("dev"));

// Health check endpoints
app.get("/api/status/healthz", (req, res) => {
    res.status(200).send("OK");
});

app.get("/api/status/readyz", (req, res) => {
    res.status(200).send("READY");
});

// Cache for proxy instances
const proxies = {};

/**
 * Get or create a proxy middleware for a specific sandbox ID
 * @param {string} sandboxId - The unique identifier for the sandbox
 * @returns {Function} Express middleware function
 */
function getProxy(sandboxId) {
    const target = `http://sandbox-service-${sandboxId}:80`;

    if (!proxies[sandboxId]) {
        console.log(`[PROXY] Creating proxy for sandbox: ${sandboxId}`);
        console.log(`[PROXY] Target service: ${target}`);

        proxies[sandboxId] = createProxyMiddleware({
            target,
            changeOrigin: true,
            ws: true,
            xfwd: true,
            timeout: 60000,           // 60 second socket timeout
            proxyTimeout: 60000,       // 60 second proxy timeout
            retries: 3,               // Retry failed requests
            retryDelay: 1000,         // Wait 1 second between retries

            onProxyReq: (proxyReq, req, res) => {
                console.log(`[PROXY-REQ] ${req.method} ${req.originalUrl} -> ${target}`);
                // Add headers to identify the request
                proxyReq.setHeader('X-Forwarded-For', req.ip);
                proxyReq.setHeader('X-Real-IP', req.ip);
            },

            onProxyRes: (proxyRes, req, res) => {
                console.log(`[PROXY-RES] ${proxyRes.statusCode} ${req.method} ${req.originalUrl} <- ${target}`);
            },

            onError: (err, req, res) => {
                console.error(`[PROXY-ERROR] Sandbox: ${sandboxId}`);
                console.error(`[PROXY-ERROR] Target: ${target}`);
                console.error(`[PROXY-ERROR] Message: ${err.message}`);
                console.error(`[PROXY-ERROR] Code: ${err.code}`);
                console.error(`[PROXY-ERROR] Full Error:`, err);

                if (!res.headersSent) {
                    res.status(502).json({
                        success: false,
                        message: "Failed to connect to sandbox service",
                        error: err.message,
                        code: err.code,
                        sandboxId,
                        target,
                    });
                }
            },
        });
    }

    return proxies[sandboxId];
}

/**
 * Main routing middleware - routes requests based on hostname to appropriate sandbox service
 */
app.use((req, res, next) => {
    try {
        const host = req.headers.host;

        // Validate host header
        if (!host) {
            console.error("[ROUTER] Missing host header");
            return res.status(400).json({
                success: false,
                message: "Host header is required",
            });
        }

        console.log(`[ROUTER] Incoming request - Host: ${host}, Path: ${req.path}, Method: ${req.method}`);

        // Extract sandbox ID from hostname (e.g., "abc-123.preview.localhost" -> "abc-123")
        const sandboxId = extractSandboxIdFromHost(host);

        if (!sandboxId) {
            console.error(`[ROUTER] Invalid sandbox ID extracted from host: ${host}`);
            return res.status(400).json({
                success: false,
                message: "Invalid sandbox ID in hostname",
            });
        }

        console.log(`[ROUTER] Routing to sandbox service - ID: ${sandboxId}`);

        // Get and apply proxy middleware
        const proxy = getProxy(sandboxId);
        return proxy(req, res, next);
    } catch (error) {
        console.error("[ROUTER] Unexpected error:", error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Internal routing error",
                error: error.message,
            });
        }
    }
});

// Error handler for uncaught errors
app.use((err, req, res, next) => {
    console.error("[ERROR] Unhandled error:", err);
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message,
        });
    }
});

export default app;