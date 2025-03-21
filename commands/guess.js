const { SlashCommandBuilder } = require('discord.js');



// For VC, remove comments

module.exports = {
	data: new SlashCommandBuilder()
		.setName('guess')
		.setDescription('Make a guess for the currently playing song')
		.addStringOption(option=>
			option.setName('name')
						.setDescription("Your guess for the song")
						.setRequired(true)),
	async execute(client, interaction) {
		const game = client.games.get(interaction.guildId)
		if(game == null){return client.basicReply(interaction, true, "There is no game taking place, start one using `/startGame`", "info")}
		if(game.status != client.gameStatus.PLAYING){return client.basicReply(interaction, true, "There is no music playing", "info")}

		const guessText = client.stringClean(interaction.options.get('name').value).replace(/[^a-zA-Z ]/g, '')

		if(game.currentSongNames.includes(guessText)){
			var url = null;

			if(game.currentSong.media.genius != null){
				url = game.currentSong.media.genius
			} else if(game.currentSong.media.youtube != null){
				url = game.currentSong.media.youtube
			}

			let title = game.currentSong.title ?? game.currentSong.albumName
			var description = "["+title+"]("+url+")"

			if(game.currentSong.artist != null){
				description += "\nby "+game.currentSong.artist
			}

			var tags = []
			for(var tagName in game.currentSong.tags){
				tags.push(game.currentSong.tags[tagName].toLowerCase())
			}
			if(tags.length > 0){
				description += " **("+tags.join(", ")+")**"
			}
			if(game.currentSong.albumName != null) {
				let parentName = game.currentSong.parentName ?? game.currentSong.albumName;
				description += "\nfrom "+parentName.split("/")[0];
			}

			var fields = []
			if(game.currentSong.fact != null){   // Fact: leftover from genius, might remove
				var fact = game.currentSong.fact
				if(fact.length > 200){
					fact = fact.slice(0, 200)+"..."
					if(game.currentSong.media.genius != null) {
						fact += "ㅤ[(more)]("+game.currentSong.media.genius+")"
					}
				}
				description += "\n\n**Fact:** " +fact
			}

			var embed = {
				title: "✅ㅤCorrect",
				description:description,
				color: 3066993,
				thumbnail: {url: game.currentSong.media.thumbnail},
				fields: fields,
			}
			client.playerCorrect(interaction.guildId, interaction.user.id)
			interaction.reply({embeds: [embed], ephemeral: true})
		}
		else{
			await client.basicReply(interaction, false, "Incorrect", "error")
			setTimeout(() => {interaction.deleteReply()}, 1000)
		}
	}
};
