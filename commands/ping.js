const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	slash_ignore: true,
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(client, interaction) {
		return interaction.reply('Pong!');
	},
};
