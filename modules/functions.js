const {joinVoiceChannel, createAudioPlayer, createAudioResource} = require('@discordjs/voice')
const { ActionRowBuilder, SelectMenuBuilder, ButtonBuilder } = require('discord.js');
const ytdl = require('ytdl-core');
const fluentFfmpeg = require('fluent-ffmpeg')
fluentFfmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);

const delay = (n) => new Promise( r => setTimeout(r, n));

module.exports = (client) => {

  client.basicEmbed = (text, type, title, footer) => {
    switch(type){
      case "info":
        color = 15105570
        break
      case "error":
        color = 15158332
        break
      case "done":
        color = 3066993
        break
      case "timeout":
        color = 12370112
        break
      default:
        color = type
    }

    var embed = {
      description: text,
      color: color,
      footer:{
        text: ""
      }
    }

    if(title !== undefined) embed.title = title
    if(footer !== undefined) embed.footer.text = footer

    return embed
  }

  client.selectComponentRow = (options, id, placeholder, min=1, max=1, defaultOptions=[]) => {
    //console.log("id: "+id)
    var new_options = []
    if(Array.isArray(options)){
      options.forEach((option, i) => {
        new_options.push({ label: option.toString(), value: option.toString(), default: defaultOptions.includes(option.toString()) })
      });
    }
    else{
      for(var label in options) {
        var description = undefined;
        var value = options[label].toString()
        if(label.includes('-')){
          var labelArr = label.split('-')
          label = labelArr[0]
          description = labelArr[1]
        }
        new_options.push({
          label: label, description: description, value: value, default: defaultOptions.includes(value)
        })
        //console.log("Label: "+label+ " | Description: "+description+ " | Value: "+value)
      }
    }
    var selectMenu = new SelectMenuBuilder()
      .setCustomId(id || "select")
      .setPlaceholder(placeholder || "Nothing selected")
      .addOptions(...new_options)
    if(min != 1){
      selectMenu.setMinValues(min)
    }
    if(max != 1){
      selectMenu.setMaxValues(max)
    }

    const row = new ActionRowBuilder().addComponents(selectMenu)
    //console.log(row.components[0].options)
    return row
  }

  client.buttonComponentRow = (label, id, style, emoji, disabled=false) => {
    return client.getComponentRow([client.buttonComponent(label, id, style, emoji, disabled)])
  }


  client.buttonComponent = (label, id, style, emoji=null, disabled=false) => {
    // Styles:
    // 1- Blue(Primary)  2- Grey(Secondary)  3-Green(Success)  4-Red(Danger) 5-Grey(URL)
    const button = new ButtonBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setStyle(style)
        .setDisabled(disabled)
      if(emoji != null){
        button.setEmoji(emoji)
      }
      return button
  }

  client.getComponentRow = (components) => {
    return new ActionRowBuilder().addComponents(...components)
  }

  client.basicReply = (interaction, hidden, text, type, title, footer) => {
    return interaction.reply({embeds: [client.basicEmbed(text, type, title, footer)], ephemeral: hidden})
  }


  client.getEmbed = (text, type, title, footer) =>
  client.editEmbed = (message, text, type, title, footer) => {
    const embed = client.basicEmbed(text, type, title, footer);

    return message.edit({embeds: [embed]})
  }
  client.sendEmbed = (channel, text, type, title, footer) => {
    const embed = client.basicEmbed(text, type, title, footer);
    return channel.send({embeds: [embed]})
  }

  client.joinVC = async (voiceChannel) =>{
      try{
        const connection = await joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator
        });
        return connection
      }
      catch(err){
        console.error(err)
        return null
      }
  }

  client.getGuild = (guildId) => {return client.guilds.cache.get(guildId); }
  client.getMember = (guildId, userId) => {return client.getGuild(guildId).members.cache.get(userId); }

  client.playYTMusic = (connection, url, seekMs) => {
    var repeats = 0
    var lastError = ""
    var stream = null


    stream = ytdl(url, { highWaterMark: 1024 * 1024, filter: "audioonly" })
    const editedStream = fluentFfmpeg({source: stream}).toFormat('mp3').setStartTime(20)
    const player = createAudioPlayer()
    const resource = createAudioResource(editedStream, {inlineVolume: true})
    connection.subscribe(player)
    player.on("error", error => {
      invalidUrlErrors = ["Error: Input stream error: This video is unavailable"]
      if(invalidUrlErrors.includes(error.toString())){
        return null
      }
      console.log("YT Music Player error: "+error.toString())
    })
    player.play(resource)
    
    return {player: player, resource: resource}
  }
  client.playAppleMusic = (connection, url, seekMs) => {
    //const stream = ytdl(url, { highWaterMark: 1024 * 1024, filter: "audioonly" })
    const player = createAudioPlayer()
    const editedStream = fluentFfmpeg().input(url).toFormat('mp3')
    const resource = createAudioResource(editedStream, {inlineVolume: true})
    //const resource = createAudioResource(url, {inlineVolume: true})
    connection.subscribe(player)
    player.play(resource)
    return {player: player, resource: resource}
  }
  client.playMusic = (connection, urls) => {
    for(let i=0; i<urls.length; i++){
      currentUrl = urls[i]
      if(currentUrl == undefined){
        continue
      }
      if(currentUrl.startsWith("https://audio-ssl.itunes.apple.com/")){ 
        response = client.playAppleMusic(connection, currentUrl, 0)
        if(response != null){
          return response
        }
      } else if(currentUrl.startsWith("http://www.youtube.com/watch?v=ziG-p9bpIro")){
        response = client.playYTMusic(connection, currentUrl, 0)
        if(response != null){
          return response
        }
      }
    }
    console.log("Unable to find valid link: "+urls)
    return null
  }
  client.stopMusic = (musicMsc) => {
    if(musicMsc.player != null){
      return musicMsc.player.stop()
    }
    return
  }
  client.fadeMusic = async (musicMisc, durationMs) => {
    const steps = 10
    const startVolume = 1
    var currentVolume = 1
    for(var i=0; i<steps; i++){
      currentVolume -= Math.round((startVolume/steps)*100)/100
      client.changeVolumeMusic(musicMisc, currentVolume)
      await delay(durationMs/steps)
    }
    return client.stopMusic(musicMisc)
  }
  client.changeVolumeMusic = (musicMisc, newValue) => {
    if(musicMisc == undefined){return}
    musicMisc.resource.volume.setVolume(newValue)
  }

  client.getLyrics = async (title, artist = " ") => {
    //console.log("Lyrics for "+title)
    const options = {
    	apiKey: client.config.geniusKey,
    	title: title,
    	artist: artist,
    	optimizeQuery: true
    };

    return await getLyrics(options)

  }

}
