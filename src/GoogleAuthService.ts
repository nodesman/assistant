import { google } from 'googleapis';
import open from 'open';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Config } from './Config';
import { GoogleTokens, GoogleAuthConfig } from './types';
import os from 'os';
import { WebServer } from './WebServer';

export class GoogleAuthService {
    private config: Config;
    private authConfig: GoogleAuthConfig;
    private tokenPath: string;
    private oauth2Client: google.auth.OAuth2 | null = null;

    constructor(config: Config) {
        this.config = config;
        const appConfig = this.config.get();

        if (!appConfig.google_auth || !appConfig.google_auth.client_id || !appConfig.google_auth.client_secret || !appConfig.google_auth.redirect_uris || appConfig.google_auth.redirect_uris.length === 0 || !appConfig.google_auth.token_path) {
            throw new Error("Incomplete Google Auth configuration in config.yaml. Please ensure client_id, client_secret, redirect_uris (with at least one URI), and token_path are set.");
        }
        this.authConfig = appConfig.google_auth;

        this.tokenPath = this.expandTilde(this.authConfig.token_path as string);

        const redirectUri = this.authConfig.redirect_uris![0] as string;

        this.oauth2Client = new google.auth.OAuth2(
            this.authConfig.client_id as string,
            this.authConfig.client_secret as string,
            redirectUri
        );

        if (!this.oauth2Client) {
            throw new Error("Failed to initialize OAuth2 client.");
        }
    }

    private expandTilde(filePath: string): string {
        if (filePath && filePath.startsWith('~')) {
            return path.join(os.homedir(), filePath.slice(1));
        }
        return filePath;
    }

    async authorize(): Promise<void> {
        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ];

        const authUrl = this.oauth2Client!.generateAuthUrl({
            access_type: 'offline',
            scope: scopes.join(' '),
            prompt: 'consent',
        });

        const webServer = new WebServer();
        await webServer.startForAuth(3000, async (code) => {
            await this.getTokens(code);
        });

        await open(authUrl);
    }

    async getTokens(code: string): Promise<void> {
        try {
            const { tokens } = await this.oauth2Client!.getToken(code);
            this.oauth2Client!.setCredentials(tokens);
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
            this.oauth2Client = null;
            console.log('Google account unlinked successfully.');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error removing Google account token file:', error);
            }
        }
    }

    private async saveTokens(tokens: GoogleTokens): Promise<void> {
        const dir = path.dirname(this.tokenPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2));
        console.log(`Tokens saved to ${this.tokenPath}`);
    }

    private async loadTokens(): Promise<GoogleTokens | null> {
        try {
            const content = await fs.readFile(this.tokenPath, 'utf8');
            const tokens: GoogleTokens = JSON.parse(content);
            return tokens;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return null;
            } else {
                console.error('Error loading Google tokens:', error);
            }
            return null;
        }
    }

    async getOAuth2Client(): Promise<google.auth.OAuth2> {
        const tokens = await this.loadTokens();
        if (tokens) {
            this.oauth2Client!.setCredentials(tokens);
        }

        if (this.oauth2Client!.credentials && this.oauth2Client!.credentials.access_token) {
            const expiryDate = this.oauth2Client!.credentials.expiry_date;
            const now = Date.now();
            if (expiryDate && (expiryDate - now < 5 * 60 * 1000)) {
                try {
                    const { credentials } = await this.oauth2Client!.refreshAccessToken();
                    this.oauth2Client!.setCredentials(credentials);
                    await this.saveTokens(credentials as GoogleTokens);
                } catch (error) {
                    throw new Error('Failed to refresh access token. Please re-authorize.');
                }
            }
            return this.oauth2Client!;
        }
        
        throw new Error('Google account not authorized. Please run the authorize command.');
    }
}
