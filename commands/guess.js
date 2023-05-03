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

		let guessText = client.stringClean(interaction.options.get('name').value).replace(/[^a-zA-Z ]/g, '')

		if(guessText == game.currentSongName.replace(/[^a-zA-Z ]/g, '')){
			const album = client.gameCategories[game.categoryInfo.name].albums[game.currentSong.albumName]
			//console.log(game.currentSong.albumName)
			var url = game.currentSong.geniusLink
			if("youtubeLink" in game.currentSong){
				url = game.currentSong.youtubeLink
			}else if("mediaUrl" in game.currentSong){
				if("youtube" in game.currentSong.mediaUrl){
					url = game.currentSong.mediaUrl.youtube
				} else{
					url = game.currentSong.mediaUrl.apple
				}
			}
			var artistString = ""
			if("artistInfo" in game.currentSong){
				artistString = game.currentSong.artistInfo
			} else{
				artistString = "by" +album.artist.name
			}

			var description = "["+game.currentSong.title+"]("+url+")\n"+artistString
			var tags = []
			for(var tagName in game.currentSong.tags){
				tags.push(game.currentSong.tags[tagName].toLowerCase())
			}
			if(tags.length > 0){
				description += " **("+tags.join(", ")+")**"
			}

			var fields = []
			if(game.currentSong.fact != "null"){
				var fact = game.currentSong.fact
				if(fact.length > 200){
					fact = fact.slice(0, 200)+"...ㅤ[(more)]("+game.currentSong.geniusLink+")"
				}
				description += "\n\n**Fact:** " +fact
			}

			var embed = {
				title: "✅ㅤCorrect",
				description:description,
				color: 3066993,
				thumbnail: {url: album.imageUrl},
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
