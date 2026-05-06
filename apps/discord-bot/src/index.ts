import 'dotenv/config';
import { Client, Collection, Events, GatewayIntentBits, ChatInputCommandInteraction } from 'discord.js';
import * as roll from './commands/roll';
import * as session from './commands/session';
import * as scene from './commands/scene';
import * as help from './commands/help';

interface Command {
  data: { name: string; toJSON(): unknown };
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

const commands = new Collection<string, Command>();

for (const cmd of [roll, session, scene, help] as Command[]) {
  commands.set(cmd.data.name, cmd);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Eldertable Bot ready as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error in /${interaction.commandName}:`, err);
    const reply = interaction.replied || interaction.deferred
      ? interaction.followUp
      : interaction.reply;
    await reply.call(interaction, { content: '❌ An error occurred.', ephemeral: true });
  }
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.warn('⚠️  DISCORD_BOT_TOKEN not set — bot will not start. Set it in .env to enable Discord integration.');
  process.exit(0);
}

client.login(token);
