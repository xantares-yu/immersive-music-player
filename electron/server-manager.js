/**
 * Aetheria Sound · Embedded Server Manager
 * Ensures backend API & Meting streaming proxy are always available.
 * Transparently attaches to existing localhost:8080 or launches in-process background worker.
 */
const http = require('http');
const path = require('path');
const { fork } = require('child_process');

class ServerManager {
  constructor(port = 8080) {
    this.targetPort = port;
    this.serverProcess = null;
    this.serverUrl = `http://localhost:${port}`;
  }

  /**
   * Ping port to see if server is already alive
   */
  checkServerAlive(port = this.targetPort, timeout = 1000) {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}/api/motion-covers`, { timeout }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Ensure backend server is ready
   */
  async ensureServer() {
    const isAlreadyRunning = await this.checkServerAlive();
    if (isAlreadyRunning) {
      console.log(`[ServerManager] Detected active server running on ${this.serverUrl}`);
      return this.serverUrl;
    }

    console.log('[ServerManager] Starting embedded server instance in-process...');
    const serverScript = path.join(__dirname, '..', 'server.js');
    try {
      this.serverModule = require(serverScript);
      if (this.serverModule && typeof this.serverModule.startServer === 'function') {
        this.serverModule.startServer(this.targetPort);
      }
    } catch (err) {
      console.error('[ServerManager] Error requiring server.js:', err);
    }

    // Wait until server responds to ping
    const maxRetries = 15;
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(r => setTimeout(r, 100));
      if (await this.checkServerAlive(this.targetPort)) {
        console.log(`[ServerManager] Embedded server confirmed ready at ${this.serverUrl}`);
        return this.serverUrl;
      }
    }

    console.warn('[ServerManager] Server readiness check timed out, attempting connection anyway.');
    return this.serverUrl;
  }

  /**
   * Cleanly stop embedded server on application exit
   */
  shutdown() {
    if (this.serverModule && this.serverModule.server) {
      console.log('[ServerManager] Gracefully closing embedded server...');
      try {
        this.serverModule.server.close();
      } catch (err) {}
      this.serverModule = null;
    }
  }
}

module.exports = ServerManager;
