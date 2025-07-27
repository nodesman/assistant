import { google } from 'googleapis';
import { shell } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Config } from './Config';
import { GoogleTokens } from './types';
import { WebServer } from './WebServer';
import { BrowserWindow } from 'electron';

export class GoogleAuthService {
    private config: Config;
    private tokenPath: string;
    private oauth2Client: google.auth.OAuth2;

    constructor(config: Config) {
        this.config = config;
        const userDataPath = this.config.getUserDataPath();
        this.tokenPath = path.join(userDataPath, 'google-tokens.json');

        // Load credentials from Vite's build-time replacement variables
        const clientId = import.meta.env.GOOGLE_CLIENT_ID;
        const clientSecret = import.meta.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new Error('Google client_id or client_secret not found. Ensure they are set in your .env file or build environment.');
        }

        this.oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            'http://localhost:3000/auth/google/callback'
        );
    }

    async authorize(window: BrowserWindow): Promise<void> {
        console.log('[Auth] Starting authorization process...');
        try {
            const scopes = [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile',
            ];

            const authUrl = this.oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: scopes.join(' '),
                prompt: 'consent',
            });

            const webServer = new WebServer();
            await webServer.startForAuth(3000, window, async (code) => {
                await this.getTokens(code);
            });

            await shell.openExternal(authUrl);
        } catch (error) {
            console.error('[Auth] An error occurred during the authorization process:', error);
        }
    }

    async getTokens(code: string): Promise<void> {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);
            await this.saveTokens(tokens as GoogleTokens);
            console.log('Google account authorized successfully!');
        } catch (error) {
            console.error('Error retrieving access token:', error);
            throw new Error('Failed to authorize Google account.');
        }
    }

    async getAuthorizedUser(): Promise<any> {
        try {
            const auth = await this.getOAuth2Client();
            const oauth2 = google.oauth2({ auth, version: 'v2' });
            const { data } = await oauth2.userinfo.get();
            return data;
        } catch (error) {
            return null;
        }
    }

    async removeGoogleAccount(): Promise<void> {
        try {
            await fs.unlink(this.tokenPath);
            this.oauth2Client.setCredentials(null);
            console.log('Google account unlinked successfully.');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error removing Google account token file:', error);
            }
        }
    }

    private async saveTokens(tokens: GoogleTokens): Promise<void> {
        await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2));
        console.log(`Tokens saved to ${this.tokenPath}`);
    }

    private async loadTokens(): Promise<GoogleTokens | null> {
        try {
            const content = await fs.readFile(this.tokenPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            return null;
        }
    }

    async getOAuth2Client(): Promise<google.auth.OAuth2> {
        const tokens = await this.loadTokens();
        if (tokens) {
            this.oauth2Client.setCredentials(tokens);
        }

        if (this.oauth2Client.credentials?.access_token) {
            const expiryDate = this.oauth2Client.credentials.expiry_date || 0;
            if (expiryDate - Date.now() < 5 * 60 * 1000) { // 5 minutes buffer
                try {
                    const { credentials } = await this.oauth2Client.refreshAccessToken();
                    this.oauth2Client.setCredentials(credentials);
                    await this.saveTokens(credentials as GoogleTokens);
                } catch (error) {
                    throw new Error('Failed to refresh access token. Please re-authorize.');
                }
            }
            return this.oauth2Client;
        }
        
        throw new Error('Google account not authorized.');
    }
}

