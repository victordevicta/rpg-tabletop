import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getSessionLink } from '../lib/api';

export const data = new SlashCommandBuilder()
  .setName('scene')
  .setDescription('Scene information')
  .addSubcommand((sub) =>
    sub.setName('current').setDescription('Show the current active scene'),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const link = await getSessionLink(interaction.channelId, interaction.guildId ?? '');
  if (link.error) {
    await interaction.editReply(`❌ ${link.error}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🏔️ Current Scene`)
    .setDescription(`World: **${link.world?.name ?? 'Unknown'}**\nOpen the table to see the active scene.`)
    .addFields({ name: 'Table Link', value: link.url ?? 'Not available' })
    .setColor(0x4b0082);
  await interaction.editReply({ embeds: [embed] });
}
