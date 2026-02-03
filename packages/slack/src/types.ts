
export interface SlackToken {
    token: string;
}

export interface SlackMessage {
    type: string;
    subtype?: string;
    text: string;
    ts: string;
    user?: string;
    bot_id?: string;
}

export interface SlackResponse {
    ok: boolean;
    error?: string;
    warning?: string;
    response_metadata?: {
        next_cursor?: string;
    };
}

export interface SlackPostMessageResponse extends SlackResponse {
    channel: string;
    ts: string;
    message: SlackMessage;
}

export interface SlackHistoryResponse extends SlackResponse {
    messages: SlackMessage[];
}
