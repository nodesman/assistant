
import { GoogleAuthService } from './GoogleAuthService';
import { Config } from './Config';
import { BrowserWindow } from 'electron';

export class AuthManager {
    private googleAuthService: GoogleAuthService;

    constructor(config: Config) {
        this.googleAuthService = new GoogleAuthService(config);
    }

    async getAuthorizedUser(): Promise<any> {
        return this.googleAuthService.getAuthorizedUser();
    }

    async authorize(window: BrowserWindow): Promise<void> {
        return this.googleAuthService.authorize(window);
    }

    async removeGoogleAccount(): Promise<void> {
        return this.googleAuthService.removeGoogleAccount();
    }
}
