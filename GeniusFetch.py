import json
import statistics
from lyricsgenius import Genius, api
# Apple URL:
import requests
from bs4 import BeautifulSoup
#Youtube Data:
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import urllib.parse as urllib
import re
import os
import pickle

geniusAccessToken = "hcSihlBAHTE-x4Y7UTkMgl4OAJNIaJymScKVSfoHPKwprXllsVBlK2g0Y3vhHfwE"
youtubeAPIKey = "AIzaSyAS1WE2EXZiLWBm5MVzFmBYa_5pkeb_8us"

genius = Genius(geniusAccessToken, skip_non_songs=False)
senderGenius = api.base.Sender(geniusAccessToken)

SkipCategoryDuplicates = False
SkipSongDuplicates = True

BASE_CATEGORY = {"songs": {}, "options": {}, "optionsPresets": {}, "albums": {}}
PATH_CAT_JSON = 'game-categories.json'

# Youtube:
SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]


# Sample: We don't talk about bruno:  7406121
class Youtube:
    def __init__(self, APIKey):
        self.YTClient = build('youtube', 'v3', developerKey=youtubeAPIKey)
    def _get_video_id(self, videoUrl):
        print("Converting URL: "+videoUrl)
        parsed_url = urllib.urlparse(videoUrl)
        video_id = urllib.parse_qs(parsed_url.query).get("v")
        if(video_id):
            return video_id[0]
        else:
            raise Exception(f"Wasn\'t able to parse video URL: {url}")
    def _get_video_details(self, video_id):
        return self.YTClient.videos().list(part="snippet,contentDetails,statistics", id=video_id).execute()
    def _duration_to_str(self, duration):
        parsed_duration = re.search(f"PT(\d+H)?(\d+M)?(\d+S)", duration).groups() # parsing it to be something like '5:50:15'
        duration_str = ""
        for d in parsed_duration:
            if d:
                duration_str += f"{d[:-1]}:"
        duration_str = duration_str.strip(":")
        return duration_str
    def _print_video_infos(self, video_response):
        items = video_response.get("items")[0]
        # get the snippet, statistics & content details from the video response
        snippet, statistics, content_details  = items["snippet"], items["statistics"], items["contentDetails"]
        # get infos from the snippet
        channel_title, title, description, publish_time = snippet["channelTitle"],snippet["title"],snippet["description"],snippet["publishedAt"]
        # get stats infos
        comment_count,like_count,view_count = statistics["commentCount"],statistics["likeCount"],statistics["viewCount"]
        # get duration from content details
        duration = self._duration_to_str(content_details["duration"]) # duration in the form of something like 'PT5H50M15S'
        

        print(f"""\
        Title: {title}
        Description: {description}
        Channel Title: {channel_title}
        Publish time: {publish_time}
        Duration: {duration}
        Number of comments: {comment_count}
        Number of likes: {like_count}
        Number of views: {view_count}
        """)
    def print_video_info(self, video_url):
        video_id = self._get_video_id(video_url)
        response = self._get_video_details(video_id)
        self._print_video_infos(response)
    def get_song(self, video_url):
        video_id = self._get_video_id(video_url)
        response = self._get_video_details(video_id)
        items = response.get("items")[0]
        snippet = items["snippet"]
        statistics = items["statistics"]
        content_details = items["contentDetails"]
        return {"title":snippet["title"], "description":snippet["description"], "views": statistics["viewCount"], "duration": content_details["duration"], 
                "publishTime": snippet["publishedAt", "channelTitle": snippet["channelTitle"]]}
    def search_song(self, search_query):
        print("Not done")

youtubeApi = Youtube(youtubeAPIKey)


class Song:
    def __init__(self, title, fullTitle, sourceLink, popularity, duration, facts=[]):
        self.title = title
        self.fullTitle = fullTitle
        self.sourceLink = sourceLink
        self.popularity = popularity
        self.duration = duration
        self.audio_links = []
        self.facts = facts
    def __init__(self, youtubeUrl):
        data = youtubeApi.get_song(youtubeUrl)
        # Title
        self.fullTitle = data.fullTitle
        self.sourceLink = youtubeUrl
        self.popularity = data.views
        self.duration = data.duration
        self.audio_links = [youtubeUrl]
        self.facts = []
    def __init__(self, geniusId):
        try:
            songInfo = genius.song(geniusId)["song"]
        except:
            print("Unable to get data")
            return

        # Title
        self.fullTitle = songInfo["full_title"]
        self.sourceLink = songInfo["url"]
        self.popularity = songInfo["pageviews"] if("pageviews" in songInfo) else 0
        self.duration = 0
        self.audio_links = []
        self.facts = [songInfo["description"]["plain"]]

        
        if("apple_music_player_url" in songInfo):  # Apple URL
            appleInfo = getAppleFileLink(songInfo["apple_music_player_url"])
            if(appleInfo != None):
                self.audio_links = appleInfo["url"]
                self.duration = appleInfo["duration"]
        if(len(songInfo["media"]) > 0):  # Youtube URL
            notFound = True
            for value in songInfo["media"]:
                if(value["provider"] == "youtube" and notFound):
                    self.audio_links.insert(0, value["url"])
                    notFound = False
    
    def toJson(self):
        return {"title": self.title", "fullTitle": self.fullTitle}




def parseSongTitle(title):
    songName = title.strip()
    extraInfo = ""
    changed = True
    while(changed):
        changed=False
        if(songName[-1] == ")"):
            bracketArr = songName.split("(")
            extraInfo = bracketArr.pop().replace(")", "").strip() + extraInfo
            songName = '('.join(bracketArr).strip()
            changed = True
    if(len(extraInfo) > 0):
        return songName + "|"+extraInfo
    else:
        return songName

def getAppleFileLink(appleUrl):
    response = requests.get(appleUrl)
    if(not response.ok):
        return
    soup = BeautifulSoup(response.text, "html.parser")
    #print(response.text)
    player = soup.find("apple-music-player")
    preview = json.loads(player["preview_track"])
    if(preview == None):
        return 
    return {"url": preview["preview_url"], "duration": float(preview["duration"])}

def getCategoryJSON(categoryName):
    with open(PATH_CAT_JSON, 'r') as f:
        data = json.load(f)
        if(categoryName in data):
            return {"success": True, "data": data[categoryName]}
        else:
            return {"success": False, "data": {}}

def setCategoryJSON(categoryName, newDict):
    with open(PATH_CAT_JSON, 'r+', encoding="utf8") as f:
        data = json.load(f)
        data[categoryName] = newDict
        f.seek(0)
        json.dump(data, f, indent=4)
        f.truncate()

def albumMultiAdd(albums, categoryName):
    for album in albums:
        albumAdd(album, categoryName)

def albumAdd(albumId, categoryName, printInfo=False):
    categoryResult = getCategoryJSON(categoryName)
    if(categoryResult["success"] is False):
        return None
    categoryJson = categoryResult["data"]
    #---Album---
    albumInfo = genius.album(albumId)["album"]
    albumName = albumInfo["description_annotation"]["annotatable"]["title"]
    new_name = input("Would you like to rename the album ("+albumName+")?")
    if(len(new_name)>0):
        albumName = new_name
    albumFullTitle = albumInfo["full_title"]
    albumLink = albumInfo["description_annotation"]["annotatable"]["url"]
    albumImage = albumInfo["cover_art_url"]
    albumDescription = albumInfo["description_preview"]
    albumRelease = albumInfo["release_date"]
    albumViews = albumInfo["song_pageviews"]
    albumArtist = {
        "name": albumInfo["artist"]["name"],
        "url": albumInfo["artist"]["url"],
        "id": albumInfo["artist"]["id"],
        "imageUrl": albumInfo["artist"]["image_url"]
    }
    albumSongs = {}
    if(albumName in categoryJson["albums"] and SkipSongDuplicates):
        albumSongs = categoryJson["albums"][albumName]["songs"]
    albumData = {"name": albumName, "fullTitle": albumFullTitle,  "geniusLink": albumLink, "imageUrl": albumImage, "artist": albumArtist, "desciption": albumDescription, "releaseDate": albumRelease, "views": albumViews, "id": albumId, "songs": albumSongs}
    #-----------

    if(SkipCategoryDuplicates and albumName in categoryJson["albums"]):
        print("Category already exists: "+albumName)
        return None
    
    if(albumName in categoryJson["albums"]):
        albumData = categoryJson["albums"][albumName]
        albumData["songs"] = {**albumData["songs"] , **albumSongs}

    categoryJson["albums"][albumName] = albumData
    
    #---Songs---
    songsDone = False
    #while(not songsDone):
    #    
    #    if(songsInfo)
    songsInfo = genius.album_tracks(albumId, 50)["tracks"]
    songs = categoryJson["albums"][albumName]["songs"]
    for songInfo in songsInfo:
        songName = songInfo["song"]["title"]
        
        if(parseSongTitle(songName) in songs):
            print("Skipping song: "+songName)
            continue
        print("Adding song: "+songName)
        songNum = songInfo["number"]
        songId = songInfo["song"]["id"]
        songInstrumental = songInfo["song"]["instrumental"]
        songLanguage = songInfo["song"]["language"]       
        #songImage = songInfo["song"]["song_art_image_url"]
        songUrl = songInfo["song"]["url"]
        # songArtist = {
        #     "name": songInfo["song"]["primary_artist"]["name"],
        #     "url": songInfo["song"]["primary_artist"]["url"],
        #     "id": songInfo["song"]["primary_artist"]["id"],
        #     "imageUrl": songInfo["song"]["primary_artist"]["image_url"]
        # }
        try:
            moreSongInfo = genius.song(songId)["song"]
        except:
            print("Skipping, Unable to get more data")
            continue

        
        songDescription = moreSongInfo["description"]["plain"]
        songFullTitle = moreSongInfo["full_title"]
        songReleaseDate = moreSongInfo["release_date"]
        songViews = moreSongInfo["pageviews"] if("pageviews" in moreSongInfo) else 0
        songLyrics = genius.lyrics(songId, remove_section_headers=True) if(not songInstrumental) else None
        songUrls = {}
        songDuration = None
        if("apple_music_player_url" in moreSongInfo):
            appleInfo = getAppleFileLink(moreSongInfo["apple_music_player_url"])
            if(appleInfo != None):
                songUrls["apple"] = appleInfo["url"]
                songDuration = appleInfo["duration"]
        media = moreSongInfo["media"]

        lyricLength = None
        if(songLyrics != None):
            if(len(songLyrics)<905):
                lyricLength = "Short"
            elif(len(songLyrics)<2149.5):
                lyricLength = "Average"
            elif len(songLyrics)>5818:
                lyricLength = "Very Long"
            else:
                lyricLength = "Long"

        if(len(media) > 0):
            notFound = True
            for value in media:
                if(value["provider"] == "youtube" and notFound):
                    songUrls["youtube"] = value["url"]
                    notFound = False
        
        songData = {"title": parseSongTitle(songName).split("|")[0], "fullTitle": songFullTitle, "number": songNum, "instrumental": songInstrumental, "language": songLanguage, "geniusLink": songUrl, 
        "mediaUrl": songUrls, "albumName": albumName, "popularity":songViews, "releaseDate": songReleaseDate, "lyrics": songLyrics, "lyricLength": lyricLength, "fact": "Not Added" }
        songs[parseSongTitle(songName)] = songData
        #print(json.dumps(moreSongInfo)+",")

    #---Options: Sets initial starting values---
    if(albumName in categoryJson["albums"] and "options" in categoryJson):
        print("Updating:")
        optionData = categoryJson["options"]
        largestNum = 0
        largestSelectId = ""
        for select in optionData["select"]:
            if( select["id"][-1].isdigit() and int(select["id"][-1]) > largestNum):
                largestNum = int(select["id"][-1])
                largestSelectId = select["id"]
        if(largestNum>0):
            print("adding to "+largestSelectId)
            doNext = False
            for select in optionData["select"]:
                if(select["id"] == largestSelectId):
                    if(len(select["options"])<20):
                        select["options"][albumName+"- "+str(len(albumSongs))+" Songs"] = albumName
                    else:
                        largestNum += 1
                        optionData["select"].push({"id": largestSelectId[:-1]+largestNum, "placeholder": "More Songs", "options": {}, "multi": True})
                    break
    else:
        optionData = {"content": "[content here]", "select": [{"id": "songs1", "placeholder": "All Songs", "options": {}, "multi": True}], 
                        "button": [{"id": "popular","label": "Most Popular", "toggle": True, "row": 1 },]}
    categoryJson["options"] = optionData
    #---Options Presets---
    if(not(albumName in categoryJson["albums"]) or not("optionsPresets" in categoryJson["albums"][albumName])):
        categoryJson["optionsPresets"] = {"default": {"emoji": "\u2699\ufe0f", "categoryInfo": {"songs1": [], "popular": True}},"all songs": {"emoji": "\ud83c\udfb5", "categoryInfo": {"songs1":[]}}}

    setCategoryJSON(categoryName, categoryJson)
    if(printInfo):
        print(json.dumps(songsInfo))

def albumIdFromSong(songName, artistName=""):
    songResult = genius.search_song(songName, artistName, get_full_info=False)


    if songResult is None:
        print("Song not found: "+songName + " | "if(len(artistName>0))else"" + artistName)
        return None

    id = songResult.id
    response = senderGenius._make_request("songs/"+str(id))["song"]

    if("album" in response):
        return response["album"]["id"]
    else:
        print(songName + " has no album associated with it")
        print(json.dumps(response, indent=4, sort_keys=True))
        return None



def main():
    choices = ["1) Create new category", "2) Add albums to category"]
    choice = " "

    while (len(choice) > 0):
        choice = input("\n\nOptions: \n"+"\n".join(choices)+"\n--------\nEnter your choice: ")
        if(len(choice) == 0):
            break
        if(not choice.isdigit()):
            print(f"Invalid Choice (1-{len(choices)})")
        if(int(choice) == 1):
            categoryName = input("Enter category name: ")
            setCategoryJSON(categoryName, BASE_CATEGORY)
            print(f"Added category: {categoryName}")
        elif(int(choice) == 2):
            categoryName = input("Enter category to add to: ")
            catJson = getCategoryJSON(categoryName)
            if(not catJson["success"]):
                print("Category not found: "+categoryName)
            else:
                songName = input("Enter the following information about a song from the album\nSong Name: ")
                artistName = input("Artist Name: ")
                albumId = albumIdFromSong(songName, artistName)
                if(albumId != None):
                    albumAdd(albumId, categoryName)

    

#main()
#albumAdd(194443, "other 1")

#albumId = albumIdFromSong("The Empty Space Above", "Lena Raine")
#albumId = albumIdFromSong("No Escape", "Darren Korb")
#albumAdd(albumId, "games", False)
#getAppleFileLink("https://genius.com/songs/4595813/apple_music_player")

Song("https://www.youtube.com/watch?v=vUzOzTUrO9I&t=1661s")