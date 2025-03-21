const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, SelectMenuBuilder } = require('discord.js');

function capitalise(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
function normaliseSettingText(title){
  return capitalise(title.replaceAll('_', ' '));
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
    "number_of_songs": 10,
    "mode":   "playlist",
    "time_to_guess": 30,
  }


  // PreGame- Choose the category and playlist
  client.gameChooseCategory = async(interaction) => {  // Choose between all categories
    var game = client.games.get(interaction.guildId)
    if(game.settings.mode != "playlist"){return}
    // Choose Category
    var component = client.selectComponentRow(Object.keys(client.categories).map(capitalise), "Category")
    interaction.followUp({content: "Select a category", components: [component]})
  }
  client.gameCategoryOptions = async(interaction) => {  // Display options for the specific category
    const categoryName = interaction.values[0].toLowerCase()
    const category = client.categories[categoryName]

    client.gameCategoryInfoSet(interaction.guildId, "name", categoryName)  // Set name
    if(category.defaults != null) {                                        // Set default values
      client.gameCategoryInfoSetMulti(interaction.guildId, category.defaults)
    } else {
      client.gameCategoryInfoSetDefault(interaction.guildId, category.tags) 
    }
    
    

    const components = client.gameCategoryComponents(interaction.guildId, category)

    interaction.update({content: "Configure which songs are used by album, tags and popularity", components: components})
  }
  client.gameCategoryComponents = (guildId, categoryOrNull, final=false) => {  // Create components with category options
    const categoryInfo = client.games.get(guildId).categoryInfo
    var category = categoryOrNull
    if(!category){
      category = client.categories[categoryInfo.name]
    }
    const albumNames = client.albumNames(category);
    const chosenAlbums = Object.values(categoryInfo.albums).flat(1);
    var rowsArr = []

    // Selects  (also change in gameCategoryInfoSetAllAlbums)
    var selectNum = Math.ceil(albumNames.length / 25)
    var selectSize = Math.ceil(albumNames.length / selectNum)
    var start = 0; var end = selectSize;
    for(var i=0; i<selectNum; i++){
      if(i == selectNum-1) {
        end = albumNames.length;
      }
      var selectAlbums = albumNames.slice(start, end)

      var optionDefaults = []
      var selectOptions = {};
      
      selectAlbums.forEach((selectAlbumName) =>{
        const [selectAlbum, isMulti] = client.getCategoryAlbum(category, selectAlbumName, true);
        if(selectAlbum.songStats == null) {return; }
        // Showing previously selected items
        const albumName = selectAlbumName.split("/")[0]
        if(chosenAlbums.includes(selectAlbumName)){
          optionDefaults.push(selectAlbumName)
        }

        // Adding to option
        var instrumental = selectAlbum.songStats.instrumental.toString();
        var lyrical = selectAlbum.songStats.lyrical.toString();
        let description = lyrical+" songs, "+instrumental+" instrumental";
        if(isMulti) {description = (parseInt(lyrical,10)+parseInt(instrumental,10))+" tracks"}
        selectOptions[albumName+"- "+description] = selectAlbumName;
      })
      rowsArr.push(client.constructRow(
        new StringSelect(
          selectOptions, "Cat"+ i, 
          (final) ? optionDefaults.join(", ").substring(0,149) : " ", 0, Object.keys(selectOptions).length, 
          (final) ? [] : optionDefaults, final
        )
      ))
      start = end;
      end += selectSize
    }

    // Buttons
    var rows = {}
    var maxNum = 0
    var buttonsData = {
      "Most Popular": {"id":"popular", "row": 1},
      "Include Instrumental": {"id":"instrumental", "row": 1},
    }
    if(category.tags != null) {
      let i = 0;
      for([tagId, tagInfo] of Object.entries(category.tags)) {
        let tagName = tagInfo.name ?? capitalise(tagId)
        buttonsData[tagName] = {"id": tagId, "row":2+Math.floor(i/5)};
        i++;
      }
    }

    Object.keys(buttonsData).forEach(buttonLabel => {
      var buttonData = buttonsData[buttonLabel];
      var buttonId = buttonData.id
      var buttonStatus = categoryInfo[buttonId].status ?? false;
      var buttonDisabled = categoryInfo[buttonId].disabled ?? false;

      if(buttonStatus){
        buttonStyle = 3
        buttonId = "cat" + buttonId + "T"
      } else{
        buttonStyle = 2
        buttonId = "cat" + buttonId + "F"
      }

      const button = new Button(buttonLabel, buttonId, buttonStyle, null, (final || buttonDisabled));
      if(buttonData.row in rows){
        rows[buttonData.row].push(button)
      } 
      else{
        rows[buttonData.row] = [button]
        maxNum = Math.max(buttonData.row, maxNum)
      }
    })

    for(var i=1; i<=maxNum; i++){
      rowsArr.push(client.constructRow(...rows[i.toString()]))
    }
    var finalRow = []
    // Preset buttons
    finalRow.push(new Button("Default", "catPresetDefault", 2, '⚙️', final))
    finalRow.push(new Button("All songs", "catPresetAll", 2, '🎵', final))
    // Start button:
    const currentNum = client.gameFilteredSongNum(categoryInfo)
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
    if(value == true || value == false) {
      game.categoryInfo[infoId] = {status: value}
    } else {
      game.categoryInfo[infoId] = value
    }

    client.games.set(guildId, game)
  }
  client.gameCategoryInfoSetMulti = (guildId, dict) => {
    var game = client.games.get(guildId)
    if(!game){
      return
    }
    for(const key in dict){
      let tagInfo = dict[key];
      if(dict[key] == true || dict[key] == false) {
        tagInfo = {status: dict[key]};
      }
      game.categoryInfo[key] = tagInfo;
    }
    client.games.set(guildId, game)
  }
  client.gameCategoryInfoSetDefault = (guildId, tags) => { // unused
    let defaultConfig = {
      albums: {},
      popular: true,
      instrumental: false,
    };
    if(tags != null) {
      Object.keys(tags).forEach(tagId => {
        defaultConfig[tagId] = true;
      })
    }
    client.gameCategoryInfoSetMulti(guildId, defaultConfig)
  }
  client.gameCategoryInfoSetAllAlbums = (guildId, albumNames) => {
    let allConfig = {albums: {}};
    var selectNum = Math.ceil(albumNames.length / 25);
    var selectSize = Math.ceil(albumNames.length / selectNum);
    var start = 0; var end = selectSize;
    for(var i=0; i<Math.ceil(albumNames.length / 25); i++){
      if(i == selectNum-1) { end = albumNames.length; }
      allConfig.albums[i] = albumNames.slice(start, end)
      start = end;
      end += selectSize
    }
    client.gameCategoryInfoSetMulti(guildId, allConfig)
  }
  client.gameCategoryInfoSetAlbum = (guildId, selectName, albums) => {
    var game = client.games.get(guildId)
    if(!game){ return }
    game.categoryInfo.albums[selectName] = albums
  }
  client.gameCategoryFinal = async (interaction) => {  // Display the final category settings
    const rows = client.gameCategoryComponents(interaction.guildId, null, true);
    await interaction.update({content: "--**Playlist Settings**--", components: rows});
  }

  client.gameFilteredSongNum = (categoryInfo) => {  // Gets the number of songs after the filter (!)

    return client.gameFilteredSongs(categoryInfo, [])[0].length;
    var count = 0

    const categoryFilter = categoryInfo
    const categoryName = categoryInfo.name
    const category = client.categories[categoryName]

    let filterTags = []
    let ignoreTags = [];  // ignore when not enabled
    if(category.tags != null) {
      for([tagId, tagInfo] of Object.entries(category.tags)) {
        if(!tagId in categoryFilter) {continue;}
        switch(tagInfo.type) {
          case null:
          case undefined:
          case "and":
            if (categoryFilter[tagId] == true) {
              filterTags.push(tagId);
            }
            break;
          case "ignore":
            if (categoryFilter[tagId] == false) { 
              ignoreTags.push(tagId);
            }  else {filterTags.push(tagId);}
            break;
          default:
            console.log("Invalid tag type: "+tagInfo.type+"   ("+tagId+")");
        }
      }
    }
    let filterAlbumNames = Object.values(categoryFilter.albums).flat(1);

    
    for(var albumName of filterAlbumNames){
      if(!(albumName in allAlbums)) {console.log(albumName+" not in albums"); continue;}
      const songs = allAlbums[albumName].songs
      for(var songKey in songs){
        var currentSong = songs[songKey]
        if(categoryFilter.popular && currentSong.popularity <= client.config.filterPopularity){continue;}

        if(category.tags != null) {
          if(currentSong.tags == null && filterTags.length > 0) {continue;}
          if(currentSong.tags != null && !currentSong.tags.every(tag => filterTags.includes(tag) || ignoreTags.includes(tag))) {continue;}
        }

        if(!categoryFilter.instrumental && currentSong.instrumental){ continue; }
        count += 1
      }
    }
    return count
  }
  client.gameFilteredSongs = (categoryInfo, playedSongs) => {  // Gets the list of songs after the filter (!)
    var songList = []
    const categoryFilter = categoryInfo
    const categoryName = categoryInfo.name
    const category = client.categories[categoryName]
    const albumNames = client.albumNames(category);
    let guessAlbum = false; // Whether to guess the song or album name

    
    let filterTags = []
    let ignoreTags = [];  // ignore when not enabled
    if(category.tags != null) {
      for([tagId, tagInfo] of Object.entries(category.tags)) {
        const tagEnabled = categoryFilter[tagId].status ?? false;
        switch(tagInfo.type) {
          case null:
          case undefined:
          case "and":
            if (tagEnabled) {
              filterTags.push(tagId);
            }
            break;
          case "ignore":
            if (!tagEnabled) { 
              ignoreTags.push(tagId);
            } else {filterTags.push(tagId);}
            break;
          case "":
            break;
        }
        if(tagEnabled && tagInfo.guessAlbum != null) {
          guessAlbum = true; 
        }
      }
    }
    let filterAlbumNames = Object.values(categoryFilter.albums).flat(1);
    
    
    for(var albumName of filterAlbumNames){
      if(!albumNames.includes(albumName)) {console.log(albumName+" not in albums"); continue;}

      const [filterAlbum, multiAlbum] = client.getCategoryAlbum(category, albumName, true);
      const songs = filterAlbum.songs
    
      let filterPop = client.config.filterPopularity;
      
      if(filterAlbum.songStats != null && filterAlbum.songStats.pop != null) {
        const songStats = filterAlbum.songStats
        let size25 = Math.floor((songStats.maxPop - songStats.minPop)/4)  // size of a 25% segmemnt
        filterPop = songStats.meanPop + size25;
      }
      
      for(var songKey in songs){
        var currentSong = songs[songKey]

        if(!multiAlbum && categoryFilter.popular.status && currentSong.popularity <= filterPop){continue;}
        
        if(!multiAlbum && (filterTags != null || ignoreTags != null)) {
          if(currentSong.tags == null && filterTags.length > 0) {continue;}
          if(currentSong.tags != null && !currentSong.tags.every(tag => filterTags.includes(tag) || ignoreTags.includes(tag))) {continue;}
        }
        if(!categoryFilter.instrumental.status && currentSong.instrumental){ continue; }

        if(multiAlbum) currentSong.parentName = albumName
        else           currentSong.albumName = albumName

        let title = (guessAlbum || multiAlbum) ? currentSong.albumName : currentSong.title

        if(playedSongs.includes(client.stringClean(title))){continue;}

        songList.push(currentSong)
      }
    }
    //console.log(playedSongs);
    return [songList, guessAlbum]
  }

  // Main Game-
  client.gameStartRound =  async (guildId, channel) => {
    const game = client.games.get(guildId)

    let [songs, guessAlbum] = client.gameFilteredSongs(game.categoryInfo, game.playedSongs)
    if(songs.length == 0) {game.playedSongs = []; [songs, guessAlbum] = client.gameFilteredSongs(game.categoryInfo, [])}
    //console.log(songs.map(song => song.albumName));
    const songData = songs[Math.floor(Math.random()*songs.length)];  // picks a random song

    game.settings.guessAlbum = guessAlbum
    game.currentSong = songData
    const songNames = client.stringClean(game.settings.guessAlbum ? songData.albumName : songData.title, {multipleOptions: true});
    game.currentSongName = songNames[0]
    game.currentSongNames = songNames.map(name => name.replace(/[^a-zA-Z ]/g, ''))

    console.log(game.currentSongName)
    game.playedSongs.push(songNames[0]);
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

    // Play music
    if(songData.media != undefined && songData.media.youtube != undefined){
      let seekS = 20;
      if(songData.duration - seekS < game.settings["time_to_guess"]) {
        seekS = 0;
      }
      if(songData.startS != null) {
        console.log("Setting start to: "+songData.startS);
        seekS = songData.startS;
      }
      game.musicMisc.resource = await client.playYTMusic(game.musicMisc.player, songData.media.youtube, seekS)
    } else {
      console.log("Song without a link: "+songData.title);
      return client.gameStartRound(guildId, channel);
    }
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
        currentRow += word.replace(/[a-zA-Z0-9]/g, '\_\ ') + "  "
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
        thumbnail: {url: game.currentSong.media.thumbnail}
      }
      if(game.currentSong.media.genius != null) {
        embed.description += "\n[Lyrics]("+game.currentSong.media.genius+")    "
      }
      if(game.currentSongNames.length > 1) {
        embed.description += "or: `"+game.currentSongNames.splice(1).join("` \/ `")+"`"
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
      client.fadeMusic(game.musicMisc, 2000)
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
        const currentNum = client.gameFilteredSongNum(game.categoryInfo)
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
      if(!game.players.hasOwnProperty(member[0]) && member[0] != client.config.clientID){
        game.players[member[0]] = {
          username: member[1].user.username,
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
      if(member[0] != client.config.clientID){
        game.players[member[0]].status = {success: false}
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
