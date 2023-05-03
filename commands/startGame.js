const { SlashCommandBuilder } = require('discord.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('startgame')
		.setDescription('Starts a new game in the voice channel you\'re currently in'),
	async execute(client, interaction) {
		const member =  interaction.member;
		let game = client.games.get(interaction.guildId);

		if (!member || !member.voice || !member.voice.channel) {
			return client.basicReply(interaction, true, "You must be in a voice channel to start a game", "info");
		}
		if (game && game.status != client.gameStatus.END) {
			return client.basicReply(interaction, true, "There is already a game taking place", "info");
		} 


		const voiceChannel = member.voice.channel;
		const permissions = voiceChannel.permissionsFor(client.user)
		if(!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
			return client.basicReply(interaction, true, "Need permissions to connect and speak in the voice channel", "error", "Invalid Permissions");
		}

		game = {
			voiceChannel: voiceChannel,
			connection: null,
			status: client.gameStatus.JOIN,
			messages: [],
			mainUser: interaction.user,
			settings: {},
			categoryInfo: {},
			currentRoundNum: 0,
			currentSong: {},
			songStartTimestamp: 0,
			currentSongName: "",
			playedSongs: [],
			players: {}
		};

		console.log("Joining channel");

		game.status = client.gameStatus.SETUP;
		client.games.set(interaction.guildId, game);

		client.joinVC(voiceChannel).then(async (connection) =>  {
			if(connection == null) {
				client.games.delete(interaction.guildId);
				return client.basicReply(interaction, true, "Unable to join voice channel", "error");
			}
			game.connection = connection;
			game.status = client.gameStatus.SETUP;
			client.games.set(interaction.guildId, game);
			client.gameDefaultSelect(interaction);
		})
	}
};