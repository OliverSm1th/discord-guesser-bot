#  Discord Music Guesser Bot

The bot plays a music guessing game in voice channels, playing short snippets of music and giving points based on who guesses first.

The song list is stored in [categories.json](categories.json) and is generated from Youtube playlists.
The playlist is accompanied by some settings dictating how the title, artist, etc will be extracted and the bot automatically populates the song list from this.  

## Main Services/Sources Used
- [Discord.js](https://discord.js.org/#/) - Interface with Discord 
- [ytdl-core](https://www.npmjs.com/package/ytdl-core)+[disordjs/voice](https://www.npmjs.com/package/@discordjs/voice) - Play music in voice channels
- [Genius](https://genius.com/) - Sourcing the song information and play links

## Showcase

| /startgame| /guess |
|----------------|------------|
|<img src="https://i.imgur.com/VoGmus1.gif">|<img src="https://i.imgur.com/yZaQLyM.gif">|
