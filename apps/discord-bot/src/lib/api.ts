import axios from 'axios';

const client = axios.create({
  baseURL: process.env.INTERNAL_API_URL ?? 'http://localhost:3001',
  headers: {
    'x-internal-secret': process.env.INTERNAL_API_SECRET ?? 'internal-secret',
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
});

export async function postRoll(data: {
  expression: string;
  discordChannelId: string;
  discordGuildId: string;
  discordUserId: string;
  discordUsername: string;
  label?: string;
}) {
  const res = await client.post('/api/internal/discord/roll', data);
  return res.data as {
    diceRoll?: unknown;
    result?: { total: number; formula: string; expression: string; critical?: string };
    worldId?: string;
    error?: string;
  };
}

export async function getSessionLink(channelId: string, guildId: string) {
  const res = await client.get('/api/internal/discord/session-link', {
    params: { channelId, guildId },
  });
  return res.data as { world?: { name: string }; url?: string; error?: string };
}
