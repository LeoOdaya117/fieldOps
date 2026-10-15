export type NotificationItem = {
    id: string;
    type: string;
    title: string;
    body: string;
    createdAt: string | null;
    readAt: string | null;
    actionUrl: string | null;
};

export type NotificationSummary = {
    total: number;
    unread: number;
    items: NotificationItem[];
};
export type NotificationInbox = {
    data: NotificationItem[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};
