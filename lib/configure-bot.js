const config = require('../config.json');
const { SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');

const commands = [
  new SlashCommandBuilder().setName('join').setDescription('Join the preconfigured channel.'),
  new SlashCommandBuilder().setName('status').setDescription('Display the user-channel mapping.'),
  new SlashCommandBuilder().setName('leave').setDescription('Leave the preconfigured channel.'),
  new SlashCommandBuilder().setName('flush').setDescription('Unmap all connected users.'),
];

const botRest = new REST({ version: '10' }).setToken(config.discordToken);

botRest.put(
  Routes.applicationCommands(config.discordClientId),
  { body: commands }
).then(() => console.log('Successfully registered bot commands'))
 .catch(console.error);