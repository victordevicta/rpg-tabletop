import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';
import { getSessionLink } from '../lib/api';

export const data = new SlashCommandBuilder()
  .setName('session')
  .setDescription('Manage your Eldertable session')
  .addSubcommand((sub) =>
    sub.setName('link').setDescription('Get the table link for this channel'),
  )
  .addSubcommand((sub) =>
    sub.setName('start').setDescription('Announce a session start in this channel'),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply();

  const data = await getSessionLink(interaction.channelId, interaction.guildId ?? '');

  if (sub === 'link') {
    if (data.error) {
      await interaction.editReply(`❌ ${data.error}`);
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle(`🗺️ ${data.world?.name ?? 'Eldertable'} — Table Link`)
      .setDescription(`Join the virtual table:`)
      .addFields({ name: 'Link', value: data.url ?? 'Not available' })
      .setColor(0x8b0000);
    await interaction.editReply({ embeds: [embed] });
  } else if (sub === 'start') {
    if (data.error) {
      await interaction.editReply(`❌ ${data.error}`);
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle(`⚔️ Session Started: ${data.world?.name ?? 'Unknown World'}`)
      .setDescription('Adventurers, the session has begun!')
      .addFields({ name: 'Join the Table', value: data.url ?? 'Not available' })
      .setColor(0x8b0000)
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
}
