export interface DiscordRollRequest {
  expression: string;
  worldId: string;
  discordUserId: string;
  discordUsername: string;
  channelId: string;
  guildId: string;
}

export interface DiscordSessionAnnouncement {
  worldId: string;
  worldName: string;
  tableUrl: string;
  guildId: string;
  channelId: string;
}

export function formatRollEmbed(
  expression: string,
  total: number,
  formula: string,
  username: string,
  label?: string,
): object {
  return {
    embeds: [
      {
        title: label ? `🎲 ${label}` : '🎲 Roll Result',
        description: `**${username}** rolled \`${expression}\``,
        fields: [
          { name: 'Formula', value: formula || expression, inline: false },
          { name: 'Total', value: `**${total}**`, inline: true },
        ],
        color: 0xb8860b,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export function formatSessionEmbed(worldName: string, tableUrl: string): object {
  return {
    embeds: [
      {
        title: `⚔️ Session Started: ${worldName}`,
        description: 'A new session has begun at the Eldertable.',
        fields: [{ name: 'Join the Table', value: tableUrl, inline: false }],
        color: 0x8b0000,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
