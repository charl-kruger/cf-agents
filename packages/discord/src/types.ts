
export interface DiscordToken {
    /**
     * Discord Bot Token
     */
    token: string;
}

export interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;
    bot?: boolean;
}

export interface DiscordMessage {
    id: string;
    channel_id: string;
    author: DiscordUser;
    content: string;
    timestamp: string;
    edited_timestamp: string | null;
    tts: boolean;
    mention_everyone: boolean;
}

export interface DiscordChannel {
    id: string;
    type: number;
    name: string;
}
