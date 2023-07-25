console.log("Loading bot");

const YouTube = require('simple-youtube-api');
const Discord = require("discord.js");
const fs = require("fs");
const Enmap = require("enmap");

console.log("Packages Loaded")



const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildVoiceStates,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent
  ]
});
client.config = require("./config.json");
client.gameCategories = require("./game-categories.json");
// Temp: Only for messageCreate (forming /\)
client.gameCategoriesNew = require("./data/game-song-data/game-categories-data");
client.gameCategoriesSongs = require("./data/game-song-data/game-songs-data");
client.gameCategoriesAppleLink = require("./data/game-song-data/game-apple-link-data");

require("./modules/functions")(client);
require("./modules/game-functions")(client);
require("./modules/general-functions")(client);

// Stored locally:
client.games = new Map()

// Events
fs.readdir("./events/", (err, files) => {
  if (err) return console.error(err);
  files.forEach(file => {
    const event = require(`./events/${file}`);
    let eventName = file.split(".")[0];
    client.on(eventName, event.bind(null, client))
  })
})

// Commands
client.commands = new Enmap();
fs.readdir("./commands/", (err, files) => {
  if(err) return console.error(err);
  files.forEach(file => {
    if(!file.endsWith(".js")) return;

    let command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
  })
})

client.login(client.config.token);
