import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import * as roll from './commands/roll';
import * as session from './commands/session';
import * as scene from './commands/scene';
import * as help from './commands/help';

const commands = [roll.data, session.data, scene.data, help.data].map((c) => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN ?? '');

(async () => {
  console.log('Deploying slash commands...');
  await rest.put(
    Routes.applicationGuildCommands(
      process.env.DISCORD_CLIENT_ID ?? '',
      process.env.DISCORD_GUILD_ID ?? '',
    ),
    { body: commands },
  );
  console.log('Slash commands deployed.');
})();
