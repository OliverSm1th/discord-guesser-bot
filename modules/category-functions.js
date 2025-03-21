const fs = require('fs');
const moment = require("moment");
const fetch =  (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = (client) => {
    client.saveCategoryFile = () => {
        fs.writeFile("./categories.json", JSON.stringify(client.categories, null, 2), function writeJSON(err) {
               if(err) return console.error(err)
               console.log("-- Saved to ./categories.json --")
        })
    }
    client.refreshCategoryFile = () => {
        client.categories = JSON.parse(fs.readFileSync("./categories.json"));
        console.log("-- Reloaded ./categories.json --")
    }
    client.loadAlbumPlaylists = async (categoryName, albumName) => {
        client.refreshCategoryFile();

        const category = client.categories[categoryName]
        if(category == null) {console.log("Unable to find category: "+categoryName); return;}

        const [album, isMulti] = client.getCategoryAlbum(category, albumName, true);
        if(album == null) {console.log("Unable to find album: "+albumName); return;}

        const playlists = album.playlists;
        if(playlists == null) { console.log("No playlists for: "+categoryName+"/"+albumName); return; }

        if(album.songs == null) {album.songs = {}; }
        let addedInstrumental = 0;
        let addedLyrical = 0;
        let addedPopulatities = [];

        for(const playlistURL of Object.keys(playlists)) {
            if(playlists[playlistURL].complete) {continue;}
            console.log("Loading: "+playlistURL);

            // Blacklist / Whitelist  (same as yt playlist number)
            const blacklist = playlists[playlistURL].blacklist ?? [];
            const whitelist = playlists[playlistURL].whitelist ?? [];

            // Regex: Converts YT title to guess title/genius title/genius artist
            const titleRegex = playlists[playlistURL].titleRegex ?? "(.*?)$";
            const geniusRegex = playlists[playlistURL].geniusRegex               ?? titleRegex;
            const geniusArtistRegex = playlists[playlistURL].geniusArtistRegex;

            const geniusPartial = playlists[playlistURL].geniusTitlePartial      ?? false;
                // allows a genius song which only starts with genius title
            const geniusArtistsOverride = playlists[playlistURL].geniusArtists   ?? [];
                // list of artists to try in genius song search
            const noGenius = playlists[playlistURL].noGenius ?? false;
                // don't try to search for genius song
            const defaultInstrumental = playlists[playlistURL].instrumental ?? false;

            const playlistExtra = {...playlists[playlistURL]};
            delete playlistExtra.titleRegex;
            delete playlistExtra.geniusRegex
            delete playlistExtra.geniusPartial;
            delete playlistExtra.blacklist;
            delete playlistExtra.whitelist
            delete playlistExtra.geniusArtists;
            delete playlistExtra.geniusArtistRegex;
            delete playlistExtra.geniusTitlePartial;
            delete playlistExtra.noGenius;
            delete playlistExtra.complete;
            delete playlistExtra.instrumental;

            const playlistVideos = await YTGetPlaylist(playlistURL);
            let index = 0
            for(let video of playlistVideos){
                index += 1;

                let videoData = await video.fetch();
                if(Object.keys(videoData).length == 0) {index -= 1; continue;}

                if((whitelist.length > 0 && !whitelist.includes(index)) || blacklist.includes(index)) {console.log(index+": Skip"); continue;}
                
                if(videoData.title == null) {console.log("no title"); continue;}
                
                let originalTitle = videoData.title;

                // Title Regex:
                let regexResult = videoData.title.match(new RegExp(titleRegex, 'g'))
                if(regexResult == null) {console.log("Title Regex failed: "+videoData.title);}
                else {videoData.title = regexResult.join(' ').trim(); }

                if(videoData.title.length == 0) {continue;}
                

                let geniusArtists = [];
                geniusArtists.push(...geniusArtistsOverride);
                if(geniusArtistRegex != null) {
                    regexResult = originalTitle.match(new RegExp(geniusArtistRegex, 'g'))
                    if(regexResult != null) {
                        geniusArtists.push(regexResult[0])
                    }
                } 
                if(videoData.channelName.endsWith("- Topic")){
                    geniusArtists.push(videoData.channelName.slice(0, -8));
                }
                //console.log("Artists: "+geniusArtists.join());
                delete videoData.channelName;
                let videoID = videoData.id;
                delete videoData.id;

                Object.assign(videoData, playlistExtra);
                
                


                if(noGenius) {  // Skip genius
                    videoData.instrumental = defaultInstrumental;
                    if(defaultInstrumental) addedInstrumental += 1;
                    else addedLyrical += 1;
                    

                    if(isMulti) {
                        videoData.albumName = videoData.title
                        delete videoData.title;
                    } else {
                        addedPopulatities.push(videoData.popularity)
                    }
                    
                    album.songs[videoID] = videoData;
                    console.log(index+" "+videoData.title);
                    continue;
                }

                // Genius Regex:
                let geniusTitle = videoData.title;
                regexResult = originalTitle.match(new RegExp(geniusRegex, 'g'))
                if(regexResult == null) {console.log("genius regex failed: "+geniusTitle);}
                else{geniusTitle = regexResult.join(' ').trim(); }

                let geniusData = await client.getGenius(geniusTitle, geniusArtists, geniusPartial);  //{lyrics, artist, url};
                if(geniusData != null && Object.keys(geniusData).length > 0) {
                    let status_msg = ""

                    if(geniusData.lyrics == null) {
                        videoData.instrumental = true;
                    } else {
                        videoData.instrumental = false;
                        videoData.lyrics = geniusData.lyrics;
                        if(geniusData.lyrics.length > 200) {
                            videoData.lyrics = videoData.lyrics.slice(0,200)+"..."
                            status_msg = " (l)"
                        } 
                        else {  // Short lyrics, mark as instrumental
                            videoData.instrumental = true;
                            status_msg = " (s)"
                        }
                    }

                    if(videoData.popularity >= client.config.filterPopularity) {
                        status_msg += " ^"
                    }

                    videoData.artist = geniusData.artist;
                    videoData.media["genius"] = geniusData.url;
                    
                    let artist_msg = "";
                    if(videoData.artist != null){
                        artist_msg = " by "+videoData.artist;
                    }
                    console.log(index+" "+videoData.title+artist_msg+status_msg);
                } else {
                    videoData.instrumental = defaultInstrumental;
                    console.log("No genius data found for: "+geniusTitle+ ((geniusArtists.length > 0) ? "   (Artists: "+geniusArtists.join(", ")+")" : ""))
                }
                if(videoData.instrumental) {
                    addedInstrumental += 1;
                } else {
                    addedLyrical += 1;
                }

                if (isMulti) {
                    videoData.albumName = videoData.title
                    delete videoData.title;
                } else {
                    addedPopulatities.push(videoData.popularity)
                }
                
                album.songs[videoID] = videoData
            }

            playlists[playlistURL].complete = true;
        }
        if(album.songStats == null || album.songStats.pop == null) {album.songStats = {instrumental: 0, lyrical: 0, pop: [], meanPop: 0, stdPop: 0}}
        album.songStats.instrumental += addedInstrumental;
        album.songStats.lyrical += addedLyrical;
        //if(album.songStats.pop == null) {album.songStats.pop = []; }
        album.songStats.pop = album.songStats.pop.concat(addedPopulatities)
        if(Object.keys(album.songs).length == 0){ console.log("No Songs added"); return;}
        client.calculatePopStats(album);
    }
    client.addSongAlbum = async(categoryName, albumName, songUrl) => {
        client.refreshCategoryFile();
        let videoID = youtube_parser(songUrl);
        
        const video = new Video(videoID)
        let videoData = await video.fetch();
        if(Object.keys(videoData).length == 0) {console.log("Unable to fetch: "+songUrl); return false;}
        
        const category = client.categories[categoryName]
        let [album, isMulti] = client.getCategoryAlbum(category, albumName, true);
        if(album == null) { console.log("Unable to find album: "+albumName); return false; }
        if(album.songs == null) {album.songs = {}; }
        delete videoData.id;
        delete videoData.channelName;
        videoData.instrumental = true;
        videoData.albumName = videoData.title
        delete videoData.title;

        album.songs[videoID] = videoData

        if(album.songStats == null) {
            if (isMulti)  album.songStats = {instrumental: 0, lyrical: 0}
            else          album.songStats = {instrumental: 0, lyrical: 0, pop: [], meanPop: 0, stdPop: 0}
        }
        album.songStats.instrumental += 1;
        if(!isMulti) {
            album.songStats.pop = album.songStats.pop.concat(videoData.popularity);
            client.calculatePopStats(album);
        }
        console.log("Song added")   
        return true;     
    }
    function youtube_parser(url){
        var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        var match = url.match(regExp);
        return (match&&match[7].length==11)? match[7] : false;
    }

    client.testGetPlaylist = (url) => {YTGetPlaylist(url); }
    client.calculatePopStats = (album) => {
        let array = album.songStats.pop;
        if(array == null || array.length == 0){return}
        let n = array.length;
        let sum = array.reduce((a,c) => a+c, 0);
        let mean = sum / n;
        //let sumSquared = squared.reduce((a,c) => a+c, 0);

        album.songStats.meanPop = Math.round(mean);
        album.songStats.stdPop = Math.round(Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / n))
        album.songStats.maxPop = array.reduce((a,b) => {return Math.max(a,b)});
        album.songStats.minPop = array.reduce((a,b) => {return Math.min(a,b)});
    }
    async function YTGetPlaylist(url, pageToken=""){
        const MAX_PL_RESULTS = 200;
        const id = url.split("=")[1];
        var request_url = `https://www.googleapis.com/youtube/v3/playlistItems?key=${client.config.ytToken}&playlistId=${id}&maxResults=${MAX_PL_RESULTS}&part=snippet`
        if(pageToken != ""){
            request_url += "&pageToken="+pageToken
        }
        const response = await fetch(request_url);
        if(response == undefined || response == null){
            console.log("Unable to fetch playlist: "+url+". Undefined response:"+response);
            return null
        }
        const data = await response.json()
        if(data["pageInfo"] == undefined || data["pageInfo"]["totalResults"] == undefined){
            console.log("Unable to fetch playlist: "+url+". Invalid data:");
            console.log(data)
            return null
        }
        var videosObj = []
        for(let i=0; i<data["items"].length; i++){
            videosObj.push(new Video(data["items"][i]["snippet"]["resourceId"]["videoId"]))
        }
        if("nextPageToken" in data){
            let nextPage = await YTGetPlaylist(url, data["nextPageToken"]);
            var nextVideosObj = Array.from(nextPage)
            videosObj = [...videosObj, ...nextVideosObj]
        }


        return videosObj;
    }
    class Video {
        constructor(id){
            this.id = id;
        }
        async fetch(){
            const request_url = `https://www.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${this.id}&key=${client.config.ytToken}`;
            const response = await fetch(request_url);
            if(response == undefined || response == null){
            console.log("Invalid response fetching video: "+this.id)
            return {}
            }
            const data = await response.json();
            if(data["items"] == null || data["items"].length == 0){return {}}
            const video_data = data["items"][0]
            

            if(video_data.contentDetails.regionRestriction && 
                video_data.contentDetails.regionRestriction.blocked && 
                video_data.contentDetails.regionRestriction.blocked.includes("GB")) {
                    console.log("Blocked:  "+video_data.snippet.title.substring(0,Math.min(video_data.snippet.title.length, 40))+"...");
                    return {};
                }

            const d = moment.duration(video_data.contentDetails.duration)
            return {title: video_data.snippet.title, 
                    media:{youtube:"https://www.youtube.com/watch?v="+video_data.id , 
                    thumbnail: video_data.snippet.thumbnails.high.url}, 
                    duration: d.asSeconds(), 
                    popularity: parseInt(video_data.statistics.viewCount),
                    channelName: video_data.snippet.channelTitle,
                    id: this.id.toString()}
        }
    }

    //---
    client.getCategoryAlbum = (category, albumName, isMultiBool=false) => {
        let album;
        let multi = false
        if(albumName in category.albums) {
            album = category.albums[albumName]; 
        }
        else if(category.multiAlbums != null && albumName in category.multiAlbums) {
            album = category.multiAlbums[albumName]; 
            multi = true;
        }
        else { 
            console.log("Can't find album: "+category+"/"+albumName);
            return null; 
        }
        if(isMultiBool) return [album, multi]
        else return album;
    }
    client.albumNames = (category, splitMulti=false) => {
        let albumNames = [];
        if(category.albums != null) {
            if(splitMulti) albumNames[0] = Object.keys(category.albums);
            else albumNames = Object.keys(category.albums);
        }
        if(category.multiAlbums != null) {
            if(splitMulti) albumNames.push(Object.keys(category.multiAlbums));
            else albumNames = albumNames.concat(Object.keys(category.multiAlbums))
        } else if(splitMulti) {albumNames.push([])}
        
        if(albumNames.length == 0) {console.log("Invalid category: "+category);}
        return albumNames;
    }
}