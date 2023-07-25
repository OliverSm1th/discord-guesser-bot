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

  switch(message.content) {
    case "testApple":
      if(!game || !game.connection) { console.log("No game/connection"); return; }
      client.playAppleMusic(game.connection, "https://audio-ssl.itunes.apple.com/apple-assets-us-std-000001/AudioPreview128/v4/81/0e/c0/810ec0e5-091d-07c5-2a7b-6ae5b55b3ad0/mzaf_2867474364888169849.plus.aac.p.m4a")
      break;
    case "testYT":
      if(!game || !game.connection) { console.log("No game/connection"); return; }
      client.playYTMusic(game.connection, "https://www.youtube.com/watch?v=J4KgdaWF03E", 20)
      break;
    case "testMusic":
      if(!game || !game.connection) { console.log("No game/connection"); return; }
      client.playMusic(game.connection, ["https://www.youtube.com/watch?v=J4KgdaWF03D", "https://audio-ssl.itunes.apple.com/apple-assets-us-std-000001/AudioPreview128/v4/81/0e/c0/810ec0e5-091d-07c5-2a7b-6ae5b55b3ad0/mzaf_2867474364888169849.plus.aac.p.m4a"])
    case "testLyrics":
      let lyrics = await client.getLyrics("Go the distance");
      message.channel.send(lyrics);
  }

  // if (message.content == "missingSongs"){
  //   console.log("[")
  //   for(var i=0; i<client.gameCategoriesNew.length; i++){
  //     var song = client.gameCategoriesNew[i]
  //     if(song == null || song["songTitle-href"] == null){continue}
  //     if(!checkSongDataExists(client.gameCategoriesSongs, song["songTitle-href"])){
  //       if(i == client.gameCategoriesNew.length-1){ console.log("\""+song["songTitle-href"]+"\"") }
  //       else {     console.log("\""+song["songTitle-href"] + "\",")}
  //     }
  //   }
  //   console.log("]")
  // }
  // else if(message.content == "appleLinks"){  // Done at the end
  //   for(const filmName in client.gameCategories.disney.albums){
  //     const film = client.gameCategories.disney.albums[filmName]
  //     for(const songName in film.songs){
  //       const song = film.songs[songName]
  //       if(song.appleLink != undefined && song.appleLink != "null"){
  //         song.appleLink = findAppleLinkFromGeniusLink(client.gameCategoriesAppleLink, song.appleLink)
  //       }
  //       else if(song.appleLink == "null"){song.appleLink = undefined}
  //     }
  //   }
  //   fs.writeFile("./game-categories.json", JSON.stringify(client.gameCategories, null, 2), function writeJSON(err) {
  //    if(err) return console.log(err)
  //    console.log("saved to ./game-categories.json")
  //   })
  // }
  // else if (message.content == "syncDisney"){
  //   //var new_format = client.gameCategories.disney.albums
  //   var new_format = {}


  //   // General song data from album
  //   for(var i=0; i<client.gameCategoriesNew.length; i++){
  //     var song = client.gameCategoriesNew[i]
  //     if(song.albumName == undefined){continue}

  //     var releaseDate = null
  //     if(song.albumReleaseDate){
  //       releaseDate = parseInt(song.albumReleaseDate.split("Released")[1].trim().substr(-4))
  //     }

  //     var albumName = collapseAlbumTitle(song.albumName)
  //     if(!new_format.hasOwnProperty(albumName)){  // Adds Album if new
  //       console.log("Adding "+albumName)
  //       new_format[albumName] = {
  //         "name": albumName,
  //         "image_url": song["albumCover-src"],
  //         "geniusLink": song["web-scraper-start-url"],
  //         "releaseDate": releaseDate,
  //         "songs": {}
  //       }
  //     } else if(releaseDate < new_format[albumName].releaseDate){
  //       new_format[albumName].releaseDate = releaseDate
  //     }
  //     var album = new_format[albumName]
  //     var songTitle = parseSongTitle(song.songTitle.split("\n")[0].trim())
  //     //if(album.songs.hasOwnProperty(songTitle.replace(/\|$/, ""))){continue;}
  //     var popularity = song.songPopularity
  //     var popularityInt = 0
  //     if(popularity != null){
  //       if(popularity.endsWith('K')){
  //         popularityInt = parseFloat(popularity.slice(0,-1))*1000
  //       }
  //       else if(popularity.endsWith('M')){
  //         popularityInt = parseFloat(popularity.slice(0,-1))*1000000
  //       }
  //     }

  //     album.songs[songTitle.replace(/\|$/, "")] = {
  //       "fullTitle": song.songTitle.split("\n")[0].trim(),
  //       "title": songTitle.split("|")[0],
  //       "artistInfo": songTitle.split("|")[1],
  //       "geniusLink": song["songTitle-href"],
  //       "popularity": popularityInt,
  //       "version": songVersionFromAlbumTitle(song.albumName),
  //       "albumName": albumName
  //     }
  //   }

  //   // Specific song data
  //   for(var i=0; i<client.gameCategoriesSongs.length; i++){
  //     var songData = client.gameCategoriesSongs[i]
  //     var [albumName, songTitle] = findTitleFromGeniusLink(new_format, songData["web-scraper-start-url"])
  //     //console.log("Found "+songTitle)
  //     //console.log(songData["web-scraper-start-url"] + " -> "+albumName+" | "+songTitle)
  //     var song = new_format[albumName].songs[songTitle]
  //     if(songData.songURL && songData.songURL.length > 0){
  //       if(!songData.songURL.includes("https://www.youtube.com/embed/")){console.log("Invalid url: "+songData.songURL);}
  //       else{
  //         song.youtubeLink = "https://www.youtube.com/watch?v="+songData.songURL.split("?")[0].split("embed/")[1]
  //       }
  //     }
  //     song.appleLink = songData.backupLink
  //     if(song.appleLink == "null"){song.appleLink = undefined}
  //     if(songData.songLyrics && songData.songLyrics != "null"){
  //       song.lyrics = songData.songLyrics.replace("br", '|*').replace(regex, '').replace('|*', '<br>')
  //       song.instrumental = false
  //       if(song.lyrics.length<905){
  //         song.lyricLength = "Short"
  //       } else if(song.lyrics.length<2149.5){
  //         song.lyricLength = "Average"
  //       }else if(song.lyrics.length>5818){
  //         song.lyricLength = "Very Long"
  //       } else{
  //         song.lyricLength = "Long"
  //       }

  //     }else{
  //       song.instrumental = true
  //     }
  //     if(songData.GeniusAnnotation){
  //       song.fact = songData.GeniusAnnotation
  //     }
  //   }

  //   // create stats for each album
  //   var films1 = {}
  //   var films2 = {}
  //   for(var albumName in new_format){
  //     var instrumental = 0
  //     var lyrical = 0
  //     if(new_format.hasOwnProperty(albumName)){
  //       var album = new_format[albumName]
  //       for(var songName in album.songs){
  //         var song = album.songs[songName]
  //         if(song.instrumental){
  //           instrumental += 1
  //         }
  //         else{
  //           lyrical += 1
  //         }
  //       }
  //       album.songStats = {
  //         "instrumental": instrumental,
  //         "lyrical": lyrical
  //       }
  //       var description = album.songStats.lyrical + " Songs, "
  //       if(album.songStats.instrumental > 0){
  //         description += album.songStats.instrumental + " Instrumentals"
  //       }
  //       if(album.releaseDate < 2000){
  //         films1[album.name+"-"+description] = album.name
  //       } else{
  //         films2[album.name+"-"+description] = album.name
  //       }
  //       // } else if(album.releaseDate < 2009){
  //       //   films2[album.name+"-"+description] = album.name
  //     }
  //   }

  //   // var disneyOptions = {
  //   //   "content": "Configure which songs are used by film, version and popularity",
  //   //   "select" : [
  //   //     {"id": "films1", "placeholder": "20th Century Films", "options": films1, "multi": true},
  //   //     {"id": "films2", "placeholder": "Modern Films", "options": films2, "multi": true},
  //   //   ],
  //   //   "button": [
  //   //     {"id": "popular", "label": "Most Popular", "toggle":true, "initial":true, "row": 1},
  //   //     {"id": "instrumental", "label": "Include Instrumental", "toggle":true, "initial":false, "row": 1},
  //   //     {"id": "original", "label": "Original", "toggle":true, "initial":true, "row": 2},
  //   //     {"id": "remake", "label": "Remake", "toggle":true, "initial":true, "row": 2},
  //   //     {"id": "broadway", "label": "Broadway", "toggle":true, "initial":true, "row": 2},
  //   //   ]
  //   // }

  //   client.gameCategories.disney.albums = new_format

  //   // var finalJson = {"disney": {"albums": new_format, "options": disneyOptions}, "other1": {}, "other2": {}}
  //   // client.gameCategories = finalJson
  //   fs.writeFile("./game-categories.json", JSON.stringify(client.gameCategories, null, 2), function writeJSON(err) {
  //    if(err) return console.log(err)
  //    console.log("saved to ./game-categories.json")
  //   })
  // }
  // else if (message.content == "fixDisney") {
  //   const disney = client.gameCategories["disney"]["albums"]
  //   for(var movieName in disney){
  //     var album_url = disney[movieName].imageUrl;
  //     if (/^https:\/\/t2.genius.com\/unsafe/.test(album_url)) {
  //       var new_url = album_url.replace(/https:\/\/t2.genius.com\/unsafe\/\d+x\d+\/(.*)/, "$1");
  //       new_url = new_url.replace(/%3A/g, ":");
  //       new_url = new_url.replace(/%2F/g, "/");
  //       console.log(new_url);
  //       disney[movieName].imageUrl = new_url;
  //     }
      
  //   }
  //   writeToGameCategories(client);
  // }



}

function writeToGameCategories(client) {
  fs.writeFile("./game-categories.json", JSON.stringify(client.gameCategories, null, 2), function writeJSON(err) {
    if(err) return console.log(err)
    console.log("saved to ./game-categories.json")
   })
}

