console.log("Loading bot");

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
require("dotenv").config()
client.config = Object.assign({}, process.env, require("./config.json"));
client.categories = require("./categories.json");

require("./modules/functions")(client);
require("./modules/game-functions")(client);
require("./modules/general-functions")(client);
require("./modules/category-functions")(client);
console.log("Files Loaded")

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
    console.log(`Loaded /${command.data.name}`);
  })
})

client.login(client.config.token);

// -- Glitch only --
// const express = require("express");
// const app = express();
// app.use(express.static('public'));
// app.get("/", function(_, response){response.sendFile("/app/success.html")})
// app.listen(process.env.PORT);