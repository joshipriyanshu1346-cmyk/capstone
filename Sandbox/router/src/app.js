// import express from "express";
// import morgan from "morgan";
// import { createProxyMiddleware } from "http-proxy-middleware";

// const app = express();

// export function extractSandboxIdFromHost(host) {
//     if (!host) return null;

//     const cleanHost = host.split(':')[0].trim().toLowerCase();
//     const previewHost = ".preview.localhost";

//     if (!cleanHost.endsWith(previewHost)) {
//         return null;
//     }

//     const sandboxId = cleanHost.slice(0, -previewHost.length);
//     return sandboxId && sandboxId !== "localhost" ? sandboxId : null;
// }

// // Middleware
// app.use(morgan("dev"));

// // Health check endpoints
// app.get("/api/status/healthz", (req, res) => {
//     res.status(200).send("OK Healthy");
// });

// app.get("/api/status/readyz", (req, res) => {
//     res.status(200).send("READY");
// });

// // Cache for proxy instances
// const proxies = {};

// /**
//  * Get or create a proxy middleware for a specific sandbox ID
//  * @param {string} sandboxId - The unique identifier for the sandbox
//  * @returns {Function} Express middleware function
//  */
// function getProxy(sandboxId) {
//     const target = `http://sandbox-service-${sandboxId}:80`;

//     if (!proxies[sandboxId]) {
//         console.log(`[PROXY] Creating proxy for sandbox: ${sandboxId}`);
//         console.log(`[PROXY] Target service: ${target}`);

//         proxies[sandboxId] = createProxyMiddleware({
//             target,
//             changeOrigin: true,
//             ws: true,
//             xfwd: true,
//             timeout: 60000,           // 60 second socket timeout
//             proxyTimeout: 60000,       // 60 second proxy timeout
//             retries: 3,               // Retry failed requests
//             retryDelay: 1000,         // Wait 1 second between retries

//             onProxyReq: (proxyReq, req, res) => {
//                 console.log(`[PROXY-REQ] ${req.method} ${req.originalUrl} -> ${target}`);
//                 // Add headers to identify the request
//                 proxyReq.setHeader('X-Forwarded-For', req.ip);
//                 proxyReq.setHeader('X-Real-IP', req.ip);
//             },

//             onProxyRes: (proxyRes, req, res) => {
//                 console.log(`[PROXY-RES] ${proxyRes.statusCode} ${req.method} ${req.originalUrl} <- ${target}`);
//             },

//             onError: (err, req, res) => {
//                 console.error(`[PROXY-ERROR] Sandbox: ${sandboxId}`);
//                 console.error(`[PROXY-ERROR] Target: ${target}`);
//                 console.error(`[PROXY-ERROR] Message: ${err.message}`);
//                 console.error(`[PROXY-ERROR] Code: ${err.code}`);
//                 console.error(`[PROXY-ERROR] Full Error:`, err);

//                 if (!res.headersSent) {
//                     res.status(502).json({
//                         success: false,
//                         message: "Failed to connect to sandbox service",
//                         error: err.message,
//                         code: err.code,
//                         sandboxId,
//                         target,
//                     });
//                 }
//             },
//         });
//     }

//     return proxies[sandboxId];
// }

// /**
//  * Main routing middleware - routes requests based on hostname to appropriate sandbox service
//  */
// app.use((req, res, next) => {
//     try {
//         const host = req.headers.host;

//         // Validate host header
//         if (!host) {
//             console.error("[ROUTER] Missing host header");
//             return res.status(400).json({
//                 success: false,
//                 message: "Host header is required",
//             });
//         }

//         console.log(`[ROUTER] Incoming request - Host: ${host}, Path: ${req.path}, Method: ${req.method}`);

//         // Extract sandbox ID from hostname (e.g., "abc-123.preview.localhost" -> "abc-123")
//         const sandboxId = extractSandboxIdFromHost(host);

//         if (!sandboxId) {
//             console.error(`[ROUTER] Invalid sandbox ID extracted from host: ${host}`);
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid sandbox ID in hostname",
//             });
//         }

//         console.log(`[ROUTER] Routing to sandbox service - ID: ${sandboxId}`);

//         // Get and apply proxy middleware
//         const proxy = getProxy(sandboxId);
//         return proxy(req, res, next);
//     } catch (error) {
//         console.error("[ROUTER] Unexpected error:", error);
//         if (!res.headersSent) {
//             res.status(500).json({
//                 success: false,
//                 message: "Internal routing error",
//                 error: error.message,
//             });
//         }
//     }
// });

// // Error handler for uncaught errors
// app.use((err, req, res, next) => {
//     console.error("[ERROR] Unhandled error:", err);
//     if (!res.headersSent) {
//         res.status(500).json({
//             success: false,
//             message: "Internal server error",
//             error: err.message,
//         });
//     }
// });

// export default app;




import express from "express";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

const PORT = Number(process.env.PORT || 3000);
const SANDBOX_MANAGER_URL = process.env.SANDBOX_MANAGER_URL;

// --------------------------------------------------
// Extract sandbox ID from hostname
// Example: abc-123.preview.localhost -> abc-123
// --------------------------------------------------

export function extractSandboxIdFromHost(host) {
  if (!host || typeof host !== "string") {
    return null;
  }

  const cleanHost = host
    .split(":")[0]
    .trim()
    .toLowerCase();

  const previewHost = ".preview.localhost";

  if (!cleanHost.endsWith(previewHost)) {
    return null;
  }

  const sandboxId = cleanHost.slice(
    0,
    -previewHost.length
  );

  // Allow DNS-compatible sandbox IDs only.
  // Prevent invalid Kubernetes Service names.
  const validIdPattern =
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

  if (!sandboxId || !validIdPattern.test(sandboxId)) {
    return null;
  }

  return sandboxId;
}

// --------------------------------------------------
// Logging
// --------------------------------------------------

app.use(morgan("dev"));

// --------------------------------------------------
// Health endpoints
// These must work without a sandbox hostname.
// --------------------------------------------------

app.get("/api/status/healthz", (req, res) => {
  res.status(200).send("OK Healthy");
});

app.get("/api/status/readyz", (req, res) => {
  res.status(200).send("READY");
});

// --------------------------------------------------
// Sandbox creation API
//
// IMPORTANT:
// This router does not currently contain Kubernetes
// provisioning logic. Forward creation requests to
// your actual sandbox manager backend.
// --------------------------------------------------

app.post("/api/sandbox/create", (req, res, next) => {
  if (!SANDBOX_MANAGER_URL) {
    return res.status(503).json({
      success: false,
      message:
        "Sandbox creation backend is not configured",
      hint:
        "Configure SANDBOX_MANAGER_URL to point to the service that creates Kubernetes Pods and Services."
    });
  }

  return next();
});

if (SANDBOX_MANAGER_URL) {
  const sandboxManagerProxy = createProxyMiddleware({
    target: SANDBOX_MANAGER_URL,
    changeOrigin: true,
    timeout: 60000,
    proxyTimeout: 60000,

    on: {
      proxyReq: (proxyReq, req) => {
        console.log(
          `[CREATE] ${req.method} ${req.originalUrl} -> ${SANDBOX_MANAGER_URL}`
        );
      },

      error: (err, req, res) => {
        console.error(
          "[CREATE] Sandbox manager proxy failed:",
          err.message
        );

        if (!res.headersSent) {
          res.status(502).json({
            success: false,
            message: "Could not reach sandbox creation backend",
            error: err.message
          });
        }
      }
    }
  });

  app.use("/api/sandbox/create", sandboxManagerProxy);
}

// --------------------------------------------------
// Proxy cache
// One proxy per sandbox ID
// --------------------------------------------------

const proxies = new Map();

function getProxy(sandboxId) {
  let proxy = proxies.get(sandboxId);

  if (proxy) {
    return proxy;
  }

  const target = `http://sandbox-service-${sandboxId}:80`;

  console.log(
    `[PROXY] Creating proxy for sandbox: ${sandboxId}`
  );
  console.log(`[PROXY] Target service: ${target}`);

  proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    ws: true,
    xfwd: true,
    timeout: 60000,
    proxyTimeout: 60000,

    on: {
      proxyReq: (proxyReq, req) => {
        console.log(
          `[PROXY-REQ] ${req.method} ${req.originalUrl} -> ${target}`
        );
      },

      proxyRes: (proxyRes, req) => {
        console.log(
          `[PROXY-RES] ${proxyRes.statusCode} ${req.method} ${req.originalUrl}`
        );
      },

      error: (err, req, res) => {
        console.error(`[PROXY-ERROR] Sandbox: ${sandboxId}`);
        console.error(`[PROXY-ERROR] Target: ${target}`);
        console.error(`[PROXY-ERROR] ${err.message}`);

        if (res && !res.headersSent) {
          res.status(502).json({
            success: false,
            message: "Failed to connect to sandbox service",
            error: err.message,
            sandboxId,
            target
          });
        }
      }
    }
  });

  proxies.set(sandboxId, proxy);

  return proxy;
}

// --------------------------------------------------
// Main sandbox routing middleware
//
// Example:
// Host: abc-123.preview.localhost
// Target: sandbox-service-abc-123:80
// --------------------------------------------------

app.use((req, res, next) => {
  const host = req.headers.host;

  console.log(
    `[ROUTER] Host: ${host}, Path: ${req.originalUrl}, Method: ${req.method}`
  );

  const sandboxId = extractSandboxIdFromHost(host);

  if (!sandboxId) {
    return res.status(400).json({
      success: false,
      message: "Invalid sandbox ID in hostname",
      expectedHost: "<sandbox-id>.preview.localhost",
      receivedHost: host || null
    });
  }

  console.log(`[ROUTER] Routing to sandbox: ${sandboxId}`);

  return getProxy(sandboxId)(req, res, next);
});

// --------------------------------------------------
// Error handler
// --------------------------------------------------

app.use((err, req, res, next) => {
  console.error("[ERROR] Unhandled router error:", err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    success: false,
    message: "Internal routing error"
  });
});

export default app;

// If this is your application's entry file, start the
// server here. If another file already calls app.listen(),
// keep the listener in that file instead.
if (process.env.START_ROUTER === "true") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Router listening on port ${PORT}`);
  });
}
