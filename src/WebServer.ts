import express from 'express';
import http from 'http';
import { BrowserWindow } from 'electron';

export class WebServer {
    private app: express.Application;
    private server: http.Server | null = null;

    constructor() {
        this.app = express();
    }

    /**
     * Start a temporary HTTP server to receive OAuth2 callback, resolving when the server is listening.
     * The provided callback is invoked when the authorization code is received.
     */
    public startForAuth(port: number, window: BrowserWindow, callback: (code: string) => void): Promise<void> {
        return new Promise((resolve, reject) => {
            this.app.get('/oauth2callback', (req, res) => {
                const code = req.query.code as string;
                if (code) {
                    res.send('<h1>Authorization successful!</h1><p>You can close this window.</p>');
                    callback(code);
                    window.webContents.send('google-auth-success');
                    this.stop();
                } else {
                    res.status(400).send('<h1>Authorization failed.</h1><p>No authorization code was provided.</p>');
                }
            });

            this.server = this.app.listen(port, () => {
                console.log(`Listening for OAuth callback on http://localhost:${port}`);
                resolve();
            });
            this.server.on('error', err => reject(err));
        });
    }

    public stop(): void {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}
