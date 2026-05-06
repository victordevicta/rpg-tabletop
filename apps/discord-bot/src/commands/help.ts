import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show Eldertable bot commands');

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('⚔️ Eldertable Bot — Commands')
    .setColor(0xb8860b)
    .addFields(
      { name: '/roll <expression>', value: 'Roll dice. Examples: `1d20`, `2d6+3`, `4d6dl1`, `3d10>=6`', inline: false },
      { name: '/session link', value: 'Get the virtual table link for this channel', inline: false },
      { name: '/session start', value: 'Announce session start and share the table link', inline: false },
      { name: '/scene current', value: 'Show info about the current active scene', inline: false },
      { name: '/help', value: 'Show this help message', inline: false },
    )
    .setFooter({ text: 'Eldertable — Your Modular Virtual Tabletop' });
  await interaction.reply({ embeds: [embed] });
}
