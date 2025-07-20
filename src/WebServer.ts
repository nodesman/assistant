import express from 'express';
import http from 'http';

export class WebServer {
    private app: express.Application;
    private server: http.Server | null = null;

    constructor() {
        this.app = express();
    }

    public startForAuth(port: number, callback: (code: string) => void): Promise<void> {
        return new Promise((resolve, reject) => {
            this.app.get('/oauth2callback', (req, res) => {
                const code = req.query.code as string;
                if (code) {
                    res.send('<h1>Authorization successful!</h1><p>You can close this window.</p>');
                    callback(code);
                    this.stop();
                    resolve();
                } else {
                    res.status(400).send('<h1>Authorization failed.</h1><p>No authorization code was provided.</p>');
                    reject(new Error('Authorization failed'));
                }
            });

            this.server = this.app.listen(port, () => {
                console.log(`Listening for OAuth callback on http://localhost:${port}`);
            });
        });
    }

    public stop(): void {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}
