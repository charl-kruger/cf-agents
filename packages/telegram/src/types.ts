
export interface TelegramToken {
    token: string;
}

export interface TelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
}

export interface TelegramChat {
    id: number;
    type: string;
    title?: string;
    username?: string;
}

export interface TelegramMessage {
    message_id: number;
    from?: TelegramUser;
    date: number;
    chat: TelegramChat;
    text?: string;
}

export interface TelegramResponse<T> {
    ok: boolean;
    result: T;
    description?: string;
    error_code?: number;
}
