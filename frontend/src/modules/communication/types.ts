// Mirrors backend/apps/communication/serializers.py. Keep them in sync.
export interface Message {
  id: number;
  sender: number;
  sender_name: string;
  recipient: number;
  recipient_name: string;
  subject: string;
  body: string;
  reply_to: number | null;
  is_read: boolean;
  created_at: string;
}

export interface MessageInput {
  recipient: number;
  subject: string;
  body: string;
  reply_to?: number | null;
}

/** Someone this user is allowed to write to. */
export interface Recipient {
  id: number;
  name: string;
  role: string;
}
