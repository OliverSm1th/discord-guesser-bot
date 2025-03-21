module.exports = async (client, interaction) => {
  if (interaction.isChatInputCommand()) return chatInputCommand(client, interaction);
  if (interaction.isStringSelectMenu()) return selectMenuCommand(client, interaction)
  if (interaction.isButton()) return buttonCommand(client, interaction)
}


async function chatInputCommand(client, interaction){
  const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(client, interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
}

async function selectMenuCommand(client, interaction) {
  if(interaction.customId.startsWith("Setup")){
    const number = parseInt(interaction.customId.slice(5))
    client.gameSetupSet(interaction.guildId, number, interaction.values[0])
    client.gameSetup(interaction, number+1)
  }
  else if(interaction.customId.startsWith("Category")){
    client.gameCategoryOptions(interaction)
  }
  else if(interaction.customId.startsWith("Cat")){
    client.gameCategoryInfoSetAlbum(interaction.guildId, interaction.customId.slice(3), interaction.values)
    var components = client.gameCategoryComponents(interaction.guildId)
    interaction.update({components: components})
  }
  else{
    interaction.update({ content: 'Something was selected!', components: [] })
  }
}

async function buttonCommand(client, interaction) {
  if(interaction.customId.endsWith("T") || interaction.customId.endsWith("F")){  // Toggle buttons
    var newValue = false
    if(interaction.customId.endsWith("F")){
      newValue = true
    }
    // Get original components:
    var components = []
    if(interaction.customId.startsWith("cat")){
      const tagId = interaction.customId.slice(3, -1)
      client.gameCategoryInfoSet(interaction.guildId, tagId, newValue)
      const category = client.categories[client.games.get(interaction.guildId).categoryInfo.name];
      let tagInfo = category.tags[tagId];
      if(tagInfo != null) {
        if(tagInfo.force != null) {
          let dict = Object.fromEntries(Object.entries(tagInfo.force).map(([k,v]) => [k,{"status": v, "disabled": newValue}]))
          client.gameCategoryInfoSetMulti(interaction.guildId, dict)
        }
      }
      //console.log("Changed "+interaction.customId.slice(3, -1)+" to "+newValue)
      components = client.gameCategoryComponents(interaction.guildId)
    }


    await interaction.update({components: components});
  }
  if(interaction.customId == "Edit") {
    client.gameSetupSetAll(interaction.guildId, {});
    client.gameSetup(interaction);
  }else if(interaction.customId == "SetupNext"){
    client.gameStatusSet(interaction.guildId, client.gameStatus.PREGAME)
    await interaction.update({content: client.gameSetupText(interaction.guildId), components: []})
    client.gameChooseCategory(interaction)
  } else if(interaction.customId == "catLast") {
    components = client.gameCategoryComponents(interaction.guildId)
    await interaction.reply({components: components});
  } else if(interaction.customId.startsWith("catPreset")){
    const category = client.categories[client.games.get(interaction.guildId).categoryInfo.name];
    switch(interaction.customId.slice(9)){
      case "Default":
        if(category.defaults != null) {
          client.gameCategoryInfoSetMulti(interaction.guildId, category.defaults)
        } else {
          client.gameCategoryInfoSetDefault(interaction.guildId, category.tags);
        }
        break;
      case "All":
        client.gameCategoryInfoSetAllAlbums(interaction.guildId, client.albumNames(category))
        break;
    }
    
    components = client.gameCategoryComponents(interaction.guildId)
    await interaction.update({components: components});
  }
  else if(interaction.customId == "Start"){
    client.gameCategoryFinal(interaction)
    client.gameStartRound(interaction.guildId, interaction.channel)
  }
  else if(interaction.customId == "Close"){
    interaction.update({components: []});
    const game = client.games.get(interaction.guildId)
    client.leaveVC(game.connection);

  }

}



