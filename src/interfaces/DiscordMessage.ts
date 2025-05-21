export interface DiscordMessage {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
  attachments: { id: string; url: string; name: string }[];
}
