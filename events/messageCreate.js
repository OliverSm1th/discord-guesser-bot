const fs = require('fs');
const genius = require("genius-lyrics");

const regex = /<[^>]*>/g;

function isNumeric(str) {
  if (typeof str != "string") return false // we only process strings!
  return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
      !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
  }

function findTitleFromGeniusLink(json, link){

  for(var albumName in json){
    if(json.hasOwnProperty(albumName)){
      var album = json[albumName]
      for(var songName in album.songs){
        if(!album.songs.hasOwnProperty(songName)){continue;}
        // if(link == "https://genius.com/Original-broadway-cast-of-aladdin-one-jump-ahead-lyrics" && albumName == "Aladdin" && song.title == "One Jump Ahead (Ft. Adam Jacobs)"){
        //   console.log(song.geniusLink)
        // }
        var song = album.songs[songName]
        if(song.geniusLink == link){
          if(song.artistInfo == ""){
            return [album.name, song.title]
          }
          return [album.name, song.title+"|"+song.artistInfo]
        }
      }
    }
  }
  console.log("Unable to find title from: "+ link)
  return [null, null]
}

function findAppleLinkFromGeniusLink(json, link){
  for(var i=0; i<json.length; i++){
    const appleData = json[i]
    //console.log(appleData)
    if(link == appleData["web-scraper-start-url"]){return appleData["previewTrack"].split(",\"preview_url\":\"")[1].split("\",\"url\":")[0]}
  }
  console.log("Unable to find apple link from: "+ link)
  return null
}

function checkSongDataExists(songJson, link){
  for(var i=0; i<songJson.length; i++){
    var songData = songJson[i]
    if(songData["web-scraper-start-url"] == link){
      return true
    }
  }
  return false
}

function collapseAlbumTitle(title){
  return title.replace(":", "(").split("(")[0].trim()
}
const originalEndings = ["Original Motion Picture Soundtrack)", "Original Motion Picture Soundtrack/Deluxe Edition)",
"Original Motion Picture Soundtrack/Bonus Track Version)", "Original Motion Picture Soundtrack) (2010 Bonus Version)",
"Original Soundtrack)", "Soundtrack from the Motion Picture)", "Original Soundtrack)", "Soundtrack)", "An Original Walt Disney Records Soundtrack",
"Original Motion Picture Soundtrack) 2010 Bonus Version)"]
const broadwayEndings = ["Original Broadway Cast Recording)"]
function songVersionFromAlbumTitle(title){
  if(title.includes(":")){
    var info = title.split(":")[1].replace("(", "").trim()
  } else{
    var info = title.split("(").slice(1).join("").trim()
  }
  if(isNumeric(info.replace("Original Motion Picture Soundtrack)", "").replace(/\[|\]|\)|\(/g, '').trim())){
    if(parseInt(info.replace("Original Motion Picture Soundtrack)", "").replace(/\[|\]|\)|\(/g, '').trim()) > 2000){
      //console.log("Remake: "+info.replace("Original Motion Picture Soundtrack)", "").replace(/\[|\]|\)|\(/g, '').trim()+" remake")
      //return info.replace("Original Motion Picture Soundtrack)", "").replace(/\[|\]|\)|\(/g, '').trim()+" remake"
      return "remake"
    }
    else{
      info = info.trim().slice(0, -5).trim()
    }
  }
  if(originalEndings.includes(info)){
    return "original"
  }
  else if(broadwayEndings.includes(info)){
    return "broadway"
  }
  else
  console.log("other: "+info)
  return "other"
}

function parseSongTitle(title, albumTitle){
  var songName = title.trim()
  var artistName = ""
  var changed = true
  while(changed){
    changed = false
    if (songName.endsWith(")")){
      bracketArr = songName.split("(")
      artistName = bracketArr.pop().replace(")", "").trim() + " " + artistName
      songName = bracketArr.join('(').trim()

      changed = true
    }
    if(songName.includes("by")){
      //console.log("removed by")
      byArr = songName.split("by")
      songName = byArr.shift().trim()
      artistName = "by "+byArr.join("by").trim()
      changed = true
    }
    if (songName.endsWith(albumTitle)){
      console.log("removed title "+albumTitle)
      albumTitleArr = songName.split(albumTitle)
      songName = albumTitleArr[albumTitleArr.length-2].trim()
      artistName = artistName
      changed = true
    }
  }

  return songName+"|"+artistName
}


// How to add disney movies to the list:
// 1) F12 on chrome and select Web Scraper and Sitemap>disneyAlbumScrape
// 2) Sitemap>Edit metadata and set starturl to the genius links for the new movie soundtracks
// 3) Sitemap>Scrape, Wait and then Sitemap>Export Data to game-categories-data.csv
// 4) Use https://www.papaparse.com/demo and enable "Header row" and "Skip empty lines" and download the json to replace current JSON
// Repeat previous steps with sitemap "songURLAll" and links from seperate song genius links (require program) in array
// Save final json as game-songs-data.json
// -----------

module.exports = async (client, message) => {
  if(message.author.id != "273556761980567554") return
  
  let game = client.games.get(message.guildId);
  let args = message.content.split(" ");

  switch(message.content) {
    // case "testApple":
    //   if(!game || !game.connection) { console.log("No game/connection"); return; }
    //   client.playAppleMusic(game.connection, "https://audio-ssl.itunes.apple.com/apple-assets-us-std-000001/AudioPreview128/v4/81/0e/c0/810ec0e5-091d-07c5-2a7b-6ae5b55b3ad0/mzaf_2867474364888169849.plus.aac.p.m4a")
    //   break;
    // case "testMusic":
    //   if(!game || !game.connection) { console.log("No game/connection"); return; }
    //   client.playMusic(game.connection, ["https://www.youtube.com/watch?v=J4KgdaWF03D", "https://audio-ssl.itunes.apple.com/apple-assets-us-std-000001/AudioPreview128/v4/81/0e/c0/810ec0e5-091d-07c5-2a7b-6ae5b55b3ad0/mzaf_2867474364888169849.plus.aac.p.m4a"])
    //   break;
    case "testYT":
      if(!game || !game.connection) { console.log("No game/connection"); return; }
      let player = client.playSetup(game.connection);
      client.playYTMusic(player, "https://www.youtube.com/watch?v=WP2XAGZPh3w", 112)
      break;
    case "testLyrics":
      let data = await client.getGenius("Don\'t Lose Ur Head", ["SIX Cast"]);
      break;
    case "testCatChange":
      let currentSong = client.categories.disney.albums["Tangled"].playlists["https://www.youtube.com/playlist?list=PLD6sgVnrOAktLDRSSUjcwBGQ1Q2Hqzsy0"]["When Will My Life Begin?"]
      currentSong["albumName"] = "Not Tangled"
      client.saveCategoryFile();
      break;
    case "testFilter":
      let categoryInfo = {
        "name": "disney",
        "albums": ["Tangled"],
        "original": true,
        "popular": false,
        "instrumental": false
      }
      console.log(client.gameFilteredSongs(categoryInfo, []))
      break;
    case "testFilterNum":
      message.channel.send(client.gameFilteredSongNum(categoryInfo).toString())
      break;
    case "testYTPlaylist":
      client.testGetPlaylist("https://www.youtube.com/playlist?list=PLBBD14ACEDBE6A817");
      break;
    case "refreshFile":
      client.refreshCategoryFile();
      break;
    }

    if(args[0] == "albumPL"){
      args.shift();
      await client.loadAlbumPlaylists(args[0], args.slice(1).join(' '))
      client.saveCategoryFile();
    } else if(args[0] == "albumSong" || args[0].startsWith("https://www.youtu")) {
      if(args[0] == "albumSong") { args.shift(); }
      const result = await client.addSongAlbum(args[1], args.slice(2).join(' '), args[0])
      if(result) {
        message.react('✅');
        client.saveCategoryFile();
      } else {
        message.react('❌');
      }
    }
}

