const fs = require('node:fs');
const path = require('node:path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');

require("dotenv").config()
const { clientID, guildId, token }  = Object.assign({}, process.env, require("./config.json"));

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));


// for (const file of commandFiles) {
// 	const filePath = path.join(commandsPath, file);
// 	const command = require(filePath);
// 	commands.push(command.data.toJSON());
// }
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		await rest.put(
			Routes.applicationCommands(clientID.toString()),
			{ body: commands },
		);

		console.log('Successfully reloaded application (/) commands.');
	} catch (error) {
		console.error(error);
	}
})();

// rest.put(Routes.applicationGuildCommands(clientId, "734493355097980990"), { body: commands })
// 	.then(() => console.log('Successfully registered application commands.'))
// 	.catch(err => {
// 		console.log("Request Body:");
// 		console.log(err.requestBody); 
// 		// console.log("Raw Error:");
// 		// console.log(err.rawError.errors);
// 		// console.log("Full Error:");
// 		console.log(err)
// 	});
