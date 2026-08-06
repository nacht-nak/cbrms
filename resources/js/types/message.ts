export interface MessageSender {
    id: number;
    username: string;
    avatar?: string | null;
    fname?: string | null;
    lname?: string | null;
}

export interface Message {
    id: number;
    conversation_id: number;
    sender_id: number;
    body: string;
    read_at: string | null;
    created_at: string;
    sender: MessageSender;
}

export interface ConversationUser {
    id: number;
    username: string;
    profile?: {
        fname?: string | null;
        lname?: string | null;
        avatar?: string | null;
    } | null;
}

export interface ConversationItem {
    id: number;
    other_user: ConversationUser;
    last_message?: string | null;
    unread: number;
    updated_at?: string | null;
}
