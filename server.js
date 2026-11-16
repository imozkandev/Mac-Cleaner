/**
 * server.js - Embedded Local API & Web Server for mac-cleaner
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

const routes = require('./src/api/routes');

const app = express();
const PORT = process.env.PORT || 4173;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', routes);

// Serve static frontend assets
const publicDir = path.join(__dirname, 'src/public');
app.use(express.static(publicDir));

// Fallback to index.html for SPA navigation
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(publicDir, 'index.html'));
  }
  next();
});

let serverInstance = null;

function startServer(port = PORT) {
  return new Promise((resolve, reject) => {
    serverInstance = http.createServer(app);
    serverInstance.listen(port, () => {
      console.log(`mac-cleaner service running on http://localhost:${port}`);
      resolve({ port, app, server: serverInstance });
    });
    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Try next port if port is busy
        console.log(`Port ${port} in use, trying ${port + 1}...`);
        startServer(port + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

function stopServer() {
  if (serverInstance) {
    serverInstance.close();
    serverInstance = null;
  }
}

// If run directly: node server.js
if (require.main === module) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
  stopServer
};
