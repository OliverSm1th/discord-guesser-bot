const {joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus} = require('@discordjs/voice')
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder } = require('discord.js');
const ytdl = require('ytdl-core');
const genius = require("genius-lyrics");
const fluentFfmpeg = require('fluent-ffmpeg')
fluentFfmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);

const delay = (n) => new Promise( r => setTimeout(r, n));

module.exports = (client) => {

  const geniusClient = new genius.Client(client.config.geniusKey)

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
    var selectMenu = new StringSelectMenuBuilder()
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
    return row
  }

  client.constructRow = (...objs) => {
    const row = new ActionRowBuilder()
    for(let obj of objs) {
      if (typeof obj.construct == 'function') {
        row.addComponents(obj.construct());
      }
    }
    return row
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
  client.leaveVC = async (connection) => {
    return await connection.disconnect();
  }

  client.getGuild = (guildId) => {return client.guilds.cache.get(guildId); }
  client.getMember = (guildId, userId) => {return client.getGuild(guildId).members.cache.get(userId); }

  let ytRepeats = 0;
  let ytLastError = "";

  client.playYTMusic = (player, url, seekS) => {
    console.log("Playing YT video");
    
    var stream = ytdl(url, { highWaterMark: 1024 * 1024, filter: "audioonly" })
    
    const editedStream = fluentFfmpeg({source: stream}).toFormat('mp3').setStartTime(seekS)
    //const player = createAudioPlayer()
    const resource = createAudioResource(editedStream, {inlineVolume: true})
    //const subscription = connection.subscribe(player)
    player.play(resource)
    return resource;
  }
  client.playAppleMusic = async (player, url) => {  // unused
    console.log("Playing apple music");
    const editedStream = fluentFfmpeg().input(url).toFormat('mp3')
    const resource = createAudioResource(editedStream, {inlineVolume: true})
    return new Promise((resolve) => {
      player.on("error", error => {
        console.log("Apple Music Player error: "+error.toString())
        resolve(null);
      })
      player.on(AudioPlayerStatus.Playing, () => {
        resolve({player: player, resource: resource});
      })
      player.play(resource)
    })
  }
  client.playSetup = (connection) => {
    const player = createAudioPlayer()
    connection.subscribe(player)
    player.on("error", async error => {
      console.log("YT Music Player error: "+error.toString())
      player.pause()
    })
    return player;
  }
  client.playMusic = async (player, urls) => {  // unused
    for(let i=0; i<urls.length; i++){
      currentUrl = urls[i]
      console.log(currentUrl);
      if(currentUrl == undefined){
        continue
      }
      if(currentUrl.startsWith("https://audio-ssl.itunes.apple.com/")){ 
        response = await client.playAppleMusic(player, currentUrl)
        if(response != null){
          return response
        }
      } else if(currentUrl.includes("www.youtube.com/watch?v=")){
        response = await client.playYTMusic(player, currentUrl, 20)
        if(response != null){
          return response
        }
      }
    }
    console.log("Unable to find valid link: "+urls)
    return null
  }
  client.stopMusic = (player) => {
    if(player != null){
      return player.pause()
    } else {
      console.log("Stopping null player");
    }
    return
  }
  client.fadeMusic = async (musicMisc, durationMs) => {
    const steps = 15
    var currentVolume = 1
    for(var i=0; i<steps; i++){
      currentVolume *= 0.8 //Math.exp(-(1/2)*i).toFixed(2)//(currentVolume - Math.pow(0.1, steps)).toFixed(2);
      client.changeVolumeMusic(musicMisc.resource, currentVolume)
      await delay(durationMs/steps)
    }
    return client.stopMusic(musicMisc.player)
  }
  client.changeVolumeMusic = (resource, newValue) => {
    if(!resource || !resource.volume){return}
    resource.volume.setVolume(newValue)
  }

  client.getGenius = async (title, artists = [], partialTitle = false) => {
    let normalisedArtists = artists.map(x => normaliseText(x));
    //console.log("Lyrics for "+title)
    let results;
    try{
      results = await geniusClient.songs.search(title);
    } catch(err) {
      return {};
    }
    for (let song of results) {
      if(partialTitle  && !normaliseText(song.title).includes(normaliseText(title))) { continue; }
      if(!partialTitle && normaliseText(song.title) != normaliseText(title)) {continue;}
      //if(artists.length > 0 && !normalisedArtists.includes(normaliseText(song.artist.name))) { continue; }
      if(artists.length > 0 && !normalisedArtists.some(artist => normaliseText(song.artist.name).includes(normaliseText(artist)))) { continue; }
      let lyrics = null
      try{
        lyrics = await song.lyrics()
      } catch(err) {}
      let artistNames = song._raw.artist_names ?? song.artist.name
      return {lyrics: lyrics, artist: artistNames, url: song.url};
    }
    return {};
  }
  function normaliseText(text) {
    return text.replace(/[^0-9a-z]/gi, '').toLowerCase();
  }

}

