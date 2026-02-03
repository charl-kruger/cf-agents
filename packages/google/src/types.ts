
export interface GoogleToken {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
}

export interface GoogleAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes?: string[];
}

export interface GoogleTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
}

export interface GmailMessage {
    id: string;
    threadId: string;
}

export interface GmailMessageList {
    messages: GmailMessage[];
    resultSizeEstimate: number;
}

export interface GmailMessageDetail {
    id: string;
    threadId: string;
    snippet: string;
    payload: {
        headers: { name: string; value: string }[];
    };
}

export interface GoogleCalendarEvent {
    id: string;
    summary: string;
    start: { dateTime: string; date?: string };
    end: { dateTime: string; date?: string };
    htmlLink: string;
}

export interface GoogleCalendarList {
    items: GoogleCalendarEvent[];
}

export interface GoogleSheet {
    spreadsheetId: string;
    properties: {
        title: string;
    };
}

export interface GoogleSheetValueRange {
    range: string;
    majorDimension: string;
    values: string[][];
}
