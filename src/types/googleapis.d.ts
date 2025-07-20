declare namespace google {
    export namespace auth {
        export class OAuth2 {
            constructor(clientId: string, clientSecret: string, redirectUri: string);
            generateAuthUrl(options: any): string;
            getToken(code:string): Promise<any>;
            setCredentials(tokens: any): void;
            refreshAccessToken(): Promise<any>;
            credentials: { access_token?: string | null; expiry_date?: number | null; };
        }
    }
}


