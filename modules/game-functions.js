const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, SelectMenuBuilder } = require('discord.js');

function capitaliseFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
function normaliseSettingText(title){
  return capitaliseFirstLetter(title.replaceAll('_', ' '))
}

module.exports = (client) => {
  // Setup- Choose the settings for the game
  client.gameDefaultSelect = (interaction) => {
    client.gameSetupSetAll(interaction.guildId, client.gameDefaultOptions)
    var previousSettings = client.gameSetupText(interaction.guildId)
    const row = client.constructRow(
      new Button("Start", "SetupNext", 3),
      new Button("Edit", "Edit", 2)
    )
    interaction.reply({content: previousSettings, components:[row]})
  }
  client.gameSetup = async (interaction, number=0) => {
    if(number > 0){
      var previousSettings = client.gameSetupText(interaction.guildId)
    }
    if(number > client.gameSettingsOrder.length-1){
      const row = client.constructRow(new Button("Next", "SetupNext", 1));
      await interaction.update({content: previousSettings, components: [row]})
      return
    }
    const currentKey = client.gameSettingsOrder[number]
    const currentOptions = client.gameSettingsOptions[currentKey]

    const row = client.constructRow(new StringSelect(currentOptions, "Setup"+number.toString()));
    //var component = client.selectComponentRow(currentOption, "Setup"+number.toString())

    var title = normaliseSettingText(currentKey)
    if(number == 0){
      await interaction.update({content: title, components: [row]})
    } else{
      await interaction.update({content: previousSettings+"\n"+title, components: [row]})
    }
  }
  
  client.gameSetupSet = (guildId, settingNum, settingOption) => {
    var game = client.games.get(guildId)
    if(!game){
      return
    }
    const settingKey = client.gameSettingsOrder[settingNum]
    game.settings[settingKey] = settingOption
    client.games.set(guildId, game)
  }
  client.gameSetupSetAll = (guildId, newSettings) => {
    var game = client.games.get(guildId)
    if(!game){
      return
    }
    game.settings = newSettings;
    client.games.set(guildId, game);
  }
  client.gameSetupText = (guildId) => {
    var settingsArr = ["--**Game Settings**--"]
    var settings = client.games.get(guildId).settings;
    // if(guildId == -1) {
    //   settingsArr = ["--**Default Settings**--"]
    //   settings = client.gameDefaultOptions;
    // }
    var index = 0
    for(var key in settings){
      var value = settings[key]
      if(!value){continue}
      settingsArr.push(normaliseSettingText(key).concat(": ", normaliseSettingText(value.toString())))
      if(index == 2){settingsArr[settingsArr.length -1 ] += "s"}
      index ++
    }
    return settingsArr.join('\n')
  }
  client.gameSettingsOptions  = {
    "number_of_songs": [2,4,5,10,15,20],
    "mode":   {
      "Playlist-Have songs randomly picked from a category": "playlist",
      "Player-Have each player choose a song and get the others to guess it": "player"
    },
    "time_to_guess": {"15 seconds": 15, "30 seconds-Recommended": 30, "45 seconds": 45, "1 minute": 60, "1 minute 30": 90},
   }
  client.gameSettingsOrder = ["number_of_songs", "mode", "time_to_guess"]
  client.gameDefaultOptions = {
    "number_of_songs": 4,
    "mode":   "playlist",
    "time_to_guess": 30,
  }


  // PreGame- Choose the category and playlist
  client.gameChooseCategory = async(interaction) => {  // Choose between all categories
    var game = client.games.get(interaction.guildId)
    if(game.settings.mode != "playlist"){return}
    // Choose Category
    var component = client.selectComponentRow(Object.keys(client.gameCategories).map(capitaliseFirstLetter), "Category")
    interaction.followUp({content: "Select a category", components: [component]})
  }
  client.gameCategoryOptions = async(interaction) => {  // Display options for the specific category
    const categoryName = interaction.values[0].toLowerCase()
    const category = client.gameCategories[categoryName]

    client.gameCategoryInfoSet(interaction.guildId, "name", categoryName)  // Set name
    client.gameCategoryInfoSetMulti(interaction.guildId, category.optionsPresets.default.categoryInfo)  // Set default values


    const components = client.gameCategoryComponents(interaction.guildId, category)

    interaction.update({content: category.options.content, components: components})
  }
  client.gameCategoryComponents = (guildId, categoryOrNull, final=false) => {  // Create components with category options
    const categoryInfo = client.games.get(guildId).categoryInfo
    var category = categoryOrNull
    if(!category){
      category = client.gameCategories[categoryInfo.name]
    }
    const categoryOptions = category.options
    var rowsArr = []

    // Selects
    for(var i=0; i<categoryOptions.select.length; i++){
      const selectData = categoryOptions.select[i]
      var selectOptions = selectData.options

      var min, max =1
      if(selectData.multi){
        min = 0;
        max = (selectOptions.length == undefined) ? Object.keys(selectOptions).length : selectOptions.length
      }

      var optionDefaults = []
      // Showing previously selected items
      if(categoryInfo[selectData.id] != null){
        for(var optionLabel in selectOptions){
          const optionValue = selectOptions[optionLabel]
          if(categoryInfo[selectData.id].includes(optionValue)){
            optionDefaults.push(optionValue)
          }
        }
      }
      rowsArr.push(client.constructRow(
        new StringSelect(
          selectOptions, "Cat"+ selectData.id, 
          (final) ? optionDefaults.join(", ").substring(0,149) : selectData.placeholder, min, max, 
          (final) ? [] : optionDefaults, final
        )
      ))
    }

    // Buttons
    var rows = {}
    var maxNum = 0
    for(var i=0; i<categoryOptions.button.length; i++){
      const buttonData = categoryOptions.button[i]
      var buttonStyle = buttonData.style
      var buttonId = buttonData.id

      if(buttonData.toggle){
        var buttonStatus = buttonData.initial
        if(categoryInfo[buttonId] != null){
          buttonStatus = categoryInfo[buttonId]
        }
        if(buttonStatus){
          buttonStyle = 3
          buttonId = "cat" + buttonId + "T"
        } else{
          buttonStyle = 2
          buttonId = "cat" + buttonId + "F"
        }
      }
      const button = new Button(buttonData.label, buttonId, buttonStyle, null, final);
      if(buttonData.row in rows){
        rows[buttonData.row].push(button)
      } 
      else{
        rows[buttonData.row] = [button]
        maxNum = Math.max(buttonData.row, maxNum)
      }
    }
    for(var i=1; i<=maxNum; i++){
      rowsArr.push(client.constructRow(...rows[i.toString()]))
    }
    var finalRow = []
    // Preset buttons
    for(const presetName in category.optionsPresets){
      const presetInfo = category.optionsPresets[presetName]
      finalRow.push(new Button(capitaliseFirstLetter(presetName), "catPreset"+presetName, 2, presetInfo.emoji, final))
    }
    // Start button:
    const currentNum = client.gameFilteredSongNum(guildId)
    var suffix = ""
    if(currentNum > 0){
      suffix = ` (${currentNum} songs)`
    }
    if(!final) {
      finalRow.push(new Button("Start"+suffix, "Start", 1, "▶️", !(currentNum >= client.games.get(guildId).settings["number_of_songs"])))
    }

    rowsArr.push(client.constructRow(...finalRow))

    return rowsArr
  }
  client.gameCategoryInfoSet = (guildId, infoId, value) => {
    var game = client.games.get(guildId)
    if(!game){
      return
    }
    game.categoryInfo[infoId] = value
    client.games.set(guildId, game)
  }
  client.gameCategoryInfoSetMulti = (guildId, dict) => {
    var game = client.games.get(guildId)
    if(!game){
      return
    }
    for(const key in dict){
      game.categoryInfo[key] = dict[key]
    }
    client.games.set(guildId, game)
  }
  client.gameCategoryFinal = async (interaction) => {  // Display the final category settings  (Unused)
    const rows = client.gameCategoryComponents(interaction.guildId, null, true);
    // const game = client.games.get(interaction.guildId)
    // const categoryFilter = game.categoryInfo
    // var rows = ["--**Playlist Settings**--"]
    // for(const flterName in categoryFilter){
    //   var value = categoryFilter[flterName]

    //   if(Array.isArray(filterValue)){
    //     var filterValue = filterValue.join(', ')
    //   }
    //   else if(typeof value == "boolean"){
    //     if(value){filterValue = "✅"}
    //     else{filterValue = "❌"}
    //   }
    //   else{filterValue = value}
    //   rows.push(capitaliseFirstLetter(flterName) + ": "+ filterValue)
    // }
    await interaction.update({content: "--**Playlist Settings**--", components: rows});
  }

  client.gameFilteredSongNum = (guildId) => {  // Gets the number of songs after the filter (!)
    var count = 0

    const game = client.games.get(guildId)
    const categoryFilter = game.categoryInfo
    const categoryName = game.categoryInfo.name
    const category = client.gameCategories[categoryName]
    const allAlbums = category.albums

    let filterAlbumNames = [];
    let filterTags = {};
    let filterPopularity = 0;

    if(categoryName == "disney"){
      filterAlbumNames = categoryFilter.films1.concat(categoryFilter.films2)
      filterTags["version"] = [];
      if(categoryFilter.original){filterTags["version"].push("original") }
      if(categoryFilter.remake){filterTags["version"].push("remake"); }
      if(categoryFilter.broadway){filterTags["version"].push("broadway"); }
      filterPopularity = 100000;
    } else if(categoryName == "games") {
      filterAlbumNames =  categoryFilter.songs1;
      filterPopularity = 10000;
    }
    for(var albumName of filterAlbumNames){
      if(!(albumName in allAlbums)) {console.log(albumName+" not in albums"); continue;}
      const songs = allAlbums[albumName].songs
      for(var songName in songs){
        if(categoryFilter.popular && songs[songName].popularity <= filterPopularity){continue}
        let validTags = true;
        for(let [tagName, tagValue] of Object.entries(filterTags)) {
          if(tagValue == "" || tagValue == []) {continue; }
          if(Array.isArray(tagValue)){
            if(tagValue.indexOf(songs[songName].tags[tagName]) == -1) {validTags = false;}
          } else if(songs[songName].tags[tagName] != tagValue) {validTags = false;}
        }
        if(validTags){
          if(songs[songName].instrumental){
            if(categoryFilter.instrumental){
              count += 1
            }
          } else{
            count += 1
          }
        }
      }
    }
    return count
  }
  client.gameFilteredSongs = (guildId) => {  // Gets the list of songs after the filter (!)
    const game = client.games.get(guildId)
    const categoryFilter = game.categoryInfo
    const categoryName = game.categoryInfo.name
    const category = client.gameCategories[categoryName]
    const categoryAlbums = category.albums
    var songList = []
    if(categoryName == "disney"){
      const filmNames = categoryFilter.films1.concat(categoryFilter.films2)
      var songVersions = []
      if(categoryFilter.original){songVersions.push("original")}
      if(categoryFilter.remake){songVersions.push("remake")}
      if(categoryFilter.broadway){songVersions.push("broadway")}

      for(var filmName of filmNames){
        const songs = categoryAlbums[filmName].songs
        for(var songName in songs){
          if(songVersions.includes(songs[songName].tags.version) && !game.playedSongs.includes(client.stringClean(songs[songName].title))){
            if(songs[songName].instrumental){
              if(categoryFilter.instrumental){
                songList.push(songs[songName])
              }
            } else{
              songList.push(songs[songName])
            }
          }
        }
      }
      if(categoryFilter.popular){
        songList = songList.filter(song => song.popularity > 100000)
      }
    }
    else{
      const albums = categoryFilter.songs1
      for(var albumName of albums){
        for(var songName in categoryAlbums[albumName].songs){
          if(!game.playedSongs.includes(client.stringClean(categoryAlbums[albumName].songs[songName].title))){
            songList.push(categoryAlbums[albumName].songs[songName])
          }
        }
      }
    }
    return songList
  }

  // Main Game-
  client.gameStartRound =  async (guildId, channel) => {
    const game = client.games.get(guildId)
    const songs = client.gameFilteredSongs(guildId)
    const songData = songs[Math.floor(Math.random()*songs.length)];  // picks a random song


    game.currentSong = songData
    game.currentSongName = client.stringClean(songData.title)
    console.log(songData.fullTitle)
    game.playedSongs.push(game.currentSongName)
    game.status = client.gameStatus.PLAYING
    game.songStartTimestamp = Date.now()

    // Send messages
    client.gameUpdatePlayers(guildId)
    client.gameResetPlayers(guildId)
    if(game.messages.length == 0){
      game.messages.push(await channel.send({embeds: [client.gameMainRoundEmbed(guildId)]}))
      game.messages.push(await channel.send({embeds: [client.gamePlayersEmbed(guildId)]}))
    } else {
      game.messages[0].edit({embeds: [client.gameMainRoundEmbed(guildId)]});
      game.messages[1].edit({embeds: [client.gamePlayersEmbed(guildId)]});
    }
    var musicMisc = null;

    // Play music
    if(songData.youtubeLink != undefined){
      musicMisc = await client.playYTMusic(game.connection, songData.youtubeLink, 20)
    }
    if(musicMisc == null && songData.appleLink != undefined){
      musicMisc = await client.playAppleMusic(game.connection, songData.appleLink)
    } 
    if(musicMisc == null && songData.mediaUrl != undefined){
      musicMisc = client.playMusic(game.connection, [songData.mediaUrl.youtube, songData.mediaUrl.apple])
    } 
    if (musicMisc == null){
      console.log("Song without a link: "+songData.fullTitle);
      return client.gameStartRound(guildId, channel);
    }
    game.musicMisc = musicMisc
    client.games.set(guildId, game)
    client.gameRoundTimer(guildId)
  }

  client.gameMainRoundEmbed = (guildId, hidden=true) => {
    const game = client.games.get(guildId)   // Message 1

    var rows = []
    var currentRow = ""
    game.currentSongName.split(" ").forEach((word, index) => {
      if(currentRow.length+word.length > 40){
        rows.push("\ ".repeat(Math.max(0, Math.floor((45-currentRow.length)/2))) + currentRow, "\ ")
        currentRow = ""
      }
      if(hidden){
        currentRow += word.replace(/[a-zA-Z]/g, '\_\ ') + "  "
      }else{
        currentRow += word + "  "
      }

    })
    if(rows.length > 0){
      rows.push("\ ".repeat(Math.max(0,Math.floor((45-currentRow.length)/2))) + currentRow)
    } else{
      rows.push("\ ".repeat(Math.max(0,Math.floor((20-currentRow.length)/2))) + currentRow)
    }


    var embed = {
      title: `🎵\ \ Song ${game.currentRoundNum+1} of ${game.settings.number_of_songs} playing`,
      description: "```"+rows.join("\n")+"```\n",
      color: 15105570,
      footer: {text: "Do /guess to submit a guess"}
    }
    if(!hidden){
      embed = {
        title: `🎵\ \ Song ${game.currentRoundNum+1} of ${game.settings.number_of_songs}`,
        description: "```"+rows.join("\n")+"```",
        color: 3066993,
        thumbnail: {url: client.gameCategories[game.categoryInfo.name].albums[game.currentSong.albumName].imageUrl}
      }
      if(game.currentSong.geniusLink != null) {
        description += "\n[Lyrics]("+game.currentSong.geniusLink+")"
      }
    }
    return embed
  }
  client.gamePlayersEmbed = (guildId, hidden=true) => {
    const game = client.games.get(guildId)
    var rows = []
    for(const playerId in game.players){
      const playerData = game.players[playerId]
      var emoji = "❔"
      if(playerData.status.success){emoji = "✅"}
      else if(playerData.lastGuess.content != undefined){
        if(Date.now()-playerData.lastGuess.timestamp > 500){
          playerData.lastGuess = undefined
        }
        else{
          emoji = "❌"
        }
      }
      rows.push(emoji + "ㅤㅤ`"+(playerData.username.padEnd(15)+"`")+"ㅤㅤ"+playerData.points)
    }
    var embed = {
      description: rows.join("\n"),
      color: 15105570,
    }
    if(!hidden){
      embed.color = 3066993
    }
    return embed
  }

  client.gameRoundTimer = (guildId) => {
    const game = client.games.get(guildId)
    const songStart = game.songStartTimestamp

    setTimeout(() => {  // Start timer
      const newGame = client.games.get(guildId)
      if(songStart != newGame.songStartTimestamp){return}
      if(newGame.status != client.gameStatus.PLAYING){return}

      var embed = client.gameMainRoundEmbed(guildId)
      embed.thumbnail = {url: "https://cdn.discordapp.com/attachments/879382929548140594/1026847827592224778/countdown-test-1.gif"}

      game.messages[0].edit({embeds: [embed]})
    }, (game.settings["time_to_guess"]-15)*1000)
    setTimeout(() => {  // Stop playing

      const newGame = client.games.get(guildId)
      if(songStart != newGame.songStartTimestamp){return}
      if(newGame.status != client.gameStatus.PLAYING){return}
      client.gameStatusSet(guildId, client.gameStatus.PLAYLAST)
      setTimeout(() => {client.gameEndRound(guildId)}, 1000)

    }, (game.settings["time_to_guess"])*1000)
  }
  client.gameEndRound = (guildId) => {

    const game = client.games.get(guildId)
    if(game.status != client.gameStatus.PLAYLAST){return}
    game.messages[0].edit({embeds: [client.gameMainRoundEmbed(guildId, false)]})
    game.messages[1].edit({embeds: [client.gamePlayersEmbed(guildId, false)]})
    var oldRoundMsg = game.messages[0];
    setTimeout(() => {
      if(game.messages.length < 2){return}
      client.fadeMusic(game.musicMisc, 1500)
    }, 3000)
    setTimeout(() => {
      if(game.messages.length < 2){return}
      game.messages[1].delete()
      const channel = game.messages[0].channel
      game.messages = []
      game.status = client.gameStatus.PLAYSTOP
      game.currentRoundNum += 1
      client.games.set(guildId, game)
      if(game.currentRoundNum == game.settings["number_of_songs"]){
        const playlistButton = new Button("Edit Playlist", "catLast", 1)
        const currentNum = client.gameFilteredSongNum(guildId)
        var suffix = ""
        if(currentNum > 0){ suffix = ` (${currentNum} songs)` }
        const startButton = new Button("Play Again"+suffix, "Start", 1, "▶️")
        const stopButton = new Button("Close", "Close", 4)
        channel.send({embeds: [client.gameFinalEmbed(guildId)], components: [client.constructRow(playlistButton, startButton, stopButton)]})
        return
      }

      client.gameStartRound(guildId, channel)
    }, 5000)
    setTimeout(() => {
      oldRoundMsg.delete();
    }, 10000)
  }
  client.gameUpdatePlayers = (guildId) => {
    const game = client.games.get(guildId)
    const members = game.voiceChannel.members
    for(const member of members){
      if(!game.players.hasOwnProperty(member[0]) && member[0] != '1021738451390963734'){
        game.players[member[0]] = {
          username: member[1].user.username,
          lastGuess: {},  // {content: "", timestamp: }
          status: {success: false, successTime: undefined}, // , timestamp:
          points: 0
        }
      }
    }
    client.games.set(guildId, game)
  }
  client.gameResetPlayers = (guildId) => {
    const game = client.games.get(guildId)
    const members = game.voiceChannel.members
    for(const member of members){
      if(member[0] != '1021738451390963734'){
        game.players[member[0]].status = {success: false}
        game.players[member[0]].lastGuess = {}
      }
    }
    client.games.set(guildId, game)
  }
  client.playerCorrect = (guildId, userId) => {
    const game = client.games.get(guildId)
    const player = game.players[userId]
    player.status = {success: true}
    var timeLeft = Math.max(0, (game.settings["time_to_guess"] * 1000) - (Date.now() - game.songStartTimestamp))
    player.points += Math.floor(timeLeft/1000)

    if(game.messages[1].channel.messages.fetch(game.messages[1].id) != null){
      game.messages[1].edit({embeds: [client.gamePlayersEmbed(guildId)]})
    }


    var complete = true
    for(const playerId in game.players){
      const playerData = game.players[playerId]
      if(!playerData.status.success){complete = false}
    }

    if(complete && game.status == client.gameStatus.PLAYING){
      client.gameStatusSet(guildId, client.gameStatus.PLAYLAST)
      client.gameEndRound(guildId)
    }
    client.games.set(guildId, game)
  }
  client.playerIncorrect = (guildId, userId, content, timestamp) => {
    const game = client.games.get(guildId)
  }
  client.gameFinalEmbed = (guildId) =>  {
    const game = client.games.get(guildId)

    var rows = []
    var rankings = {}
    for(const playerId in game.players){
      const playerData = game.players[playerId]
      rankings[playerId] = playerData.points
    }
    var items = Object.keys(rankings).map((key) => {return [key, rankings[key]]})
    items.sort((a, b) => { return b[1]-a[1]})
    var sortedIds = items.map((kvp) => {return kvp[0]})
    for(var i=0; i<sortedIds.length; i++){
      const playerData = game.players[sortedIds[i]]
      var emoji = " "
      if(i == 0){emoji = "🥇"}
      else if(i==1){emoji = "🥈"}
      else if(i==2){emoji = "🥉"}
      rows.push(emoji+ "ㅤㅤ`"+(playerData.username.padEnd(15)+"`")+"ㅤㅤ"+playerData.points)
    }
    var embed = {
      title: "🏆ㅤFinal Results",
      description: rows.join("\n"),
      color: 3066993,
      footer: {text: "Change the avaliable songs or Play again"}
    }
    game.currentRoundNum = 0
    game.playedSongs = []
    game.players = {}
    game.status = client.gameStatus.END
    client.games.set(guildId, game)
    return embed
  }



  client.gameStatus = {
    JOIN: "Joining",
    SETUP: "Setup",
    PREGAME: "Pregame",
    PLAYING: "Playing",
    PLAYLAST: "PlayLast",  // Stops guessing from /guess at end
    PLAYSTOP: "PlayingStopped",
    END: "End"
  }

  client.gameStatusSet = (guildId, status) => {
    var game = client.games.get(guildId)
    if(!game){
      return
    }
    game.status = status
    client.games.set(guildId, game)
  }

  class Button {
    // Styles:
    // 1- Blue(Primary)  2- Grey(Secondary)  3-Green(Success)  4-Red(Danger) 5-Grey(URL)
    constructor(label, id, style, emoji=null, disabled = false) {
      this.label = label;  this.id = id;  this.style = style;  this.emoji = emoji;  this.disabled = disabled;
    }
    construct() {
      const button = new ButtonBuilder()
         .setCustomId(this.id)
         .setLabel   (this.label)
         .setStyle   (this.style)
         .setDisabled(this.disabled)
      if(this.emoji != null){
        button.setEmoji(this.emoji)
      }
      return button;
    }
  }
  class StringSelect {
    // Option:   {key:value}
    constructor(options, id, placeholder, min=1, max=1, defaultOptions=[], disabled=false) {
      this.options = options;  this.id = id;  this.placeholder = placeholder;  this.min = min;  this.max = max; this.defaultOptions = defaultOptions; this.disabled = disabled;
    }
    construct() {
      const select = new StringSelectMenuBuilder()
        .setCustomId(this.id || "select")
        .setPlaceholder(this.placeholder || "Nothing selected")
        .setDisabled(this.disabled)
      if(this.min != 1){ select.setMinValues(this.min) }
      if(this.max != 1){ select.setMaxValues(this.max) }
      
      let optionObjs = [];
      if(Array.isArray(this.options)){
        this.options.forEach((option, i) => {
          optionObjs.push({ label: option.toString(), value: option.toString(), default: this.defaultOptions.includes(option.toString()) })
        });
      } else {
        for(let label in this.options) {
          var description = undefined;
          var value = this.options[label].toString()
          if(label.includes('-')){
            var labelArr = label.split('-')
            label = labelArr[0]
            description = labelArr[1]
          }
          optionObjs.push({ label: label, description: description, value: value, default: this.defaultOptions.includes(value) });
        }
      }
      select.addOptions(optionObjs);
      return select;
    }
  }
}


// Game Songs \\
//Pokemon
//Hollow Knight
//Mario
//Zelda
//Persona 5
//Undertale
//Minecraft
//-----------\\
