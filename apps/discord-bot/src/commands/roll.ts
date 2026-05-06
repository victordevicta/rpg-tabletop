import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';
import { postRoll } from '../lib/api';

export const data = new SlashCommandBuilder()
  .setName('roll')
  .setDescription('Roll dice — e.g. 1d20+5, 2d6, 4d6dl1')
  .addStringOption((opt) =>
    opt
      .setName('expression')
      .setDescription('Dice expression (e.g. 1d20+5)')
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName('label')
      .setDescription('Optional label for this roll')
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const expression = interaction.options.getString('expression', true);
  const label = interaction.options.getString('label') ?? undefined;

  await interaction.deferReply();

  try {
    const response = await postRoll({
      expression,
      label,
      discordChannelId: interaction.channelId,
      discordGuildId: interaction.guildId ?? '',
      discordUserId: interaction.user.id,
      discordUsername: interaction.user.username,
    });

    if (response.error) {
      await interaction.editReply(`❌ ${response.error}`);
      return;
    }

    const { result } = response;
    const embed = new EmbedBuilder()
      .setTitle(label ? `🎲 ${label}` : '🎲 Roll Result')
      .setDescription(`**${interaction.user.displayName}** rolled \`${expression}\``)
      .addFields(
        { name: 'Formula', value: result?.formula ?? expression, inline: false },
        { name: 'Total', value: `**${result?.total ?? '?'}**`, inline: true },
      )
      .setColor(0xb8860b)
      .setTimestamp();

    if (result?.critical === 'success') {
      embed.addFields({ name: '✨ Critical!', value: 'Natural 20!', inline: true });
      embed.setColor(0x00ff00);
    } else if (result?.critical === 'failure') {
      embed.addFields({ name: '💀 Critical Fail!', value: 'Natural 1...', inline: true });
      embed.setColor(0xff0000);
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply('❌ Failed to process roll. Is the API running?');
  }
}
