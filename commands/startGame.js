const { SlashCommandBuilder } = require('discord.js');



// For VC, remove comments

module.exports = {
	data: new SlashCommandBuilder()
		.setName('startgame')
		.setDescription('Starts a new game in the voice channel you\'re currently in'),
	async execute(client, interaction) {
		const member =  interaction.member

    if(!member || !member.voice || !member.voice.channel) {
			return client.basicReply(interaction, true, "You must be in a voice channel to start a game", "info");
		}

		const voiceChannel = member.voice.channel;
	console.log("New interact")
    var game = client.games.get(interaction.guildId)
    if(game && game.status != client.gameStatus.END){
		console.log("Output Message")
		console.log(game)
		return client.basicReply(interaction, true, "There is already a game taking place", "info");
	} 
	console.log("Game found")

    const permissions = voiceChannel.permissionsFor(client.user)
    if(!permissions.has("CONNECT") || !permissions.has("SPEAK")) return client.basicReply(interaction, true, "Need permissions to connect and speak in the voice channel", "error", "Invalid Permissions");

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
    }

		console.log("Joining channel")

		game.status = client.gameStatus.SETUP
		client.games.set(interaction.guildId, game)

    client.joinVC(voiceChannel).then(async (connection) =>  {
      if(connection == null) return client.basicReply(interaction, true, "Unable to join voice channel", "error");
      game.connection = connection
      game.status = client.gameStatus.SETUP
      client.games.set(interaction.guildId, game)
			client.gameSetup(interaction)
			//client.playMusic(game.connection, ["https://audio-ssl.itunes.apple.com/apple-assets-us-std-000001/AudioPreview128/v4/12/5c/b0/125cb0bd-3433-686c-5032-7f67acbf6770/mzaf_7241538703262926431.plus.aac.p.m4a"], 0)
			//client.playMusic(game.connection, ["http://www.youtube.com/watch?v=8q4LZx08FlQ", "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview114/v4/2c/b3/2e/2cb32e2c-740f-7c60-2d46-e9c8c146f832/mzaf_8271809903604105650.plus.aac.p.m4a"])
    })

	}
};
