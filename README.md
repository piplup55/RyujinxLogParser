# Ryujinx Log Parser

Usage:

These Examples expect you to have a command handler already

# Context Menu

```
const { ContextMenuCommandBuilder } = require("@discordjs/builders")
const { ApplicationCommandType } = require("discord.js")
const { RyuParseLogFile, RyuCreateEmbed } = require('../../components/functions/LogParser.js')
const axios = require('axios');

module.exports = {
    data: new ContextMenuCommandBuilder()
    .setName('Ryujinx Log Reader')
	.setType(ApplicationCommandType.Message)
    .setIntegrationTypes(1)
    .setContexts([0,1,2]),
    run: async (interaction) => {
        const message = interaction.targetMessage

        await interaction.deferReply()

        if (message.attachments.size > 0) {
            // Grab the first attachment from the message
            const firstAttachment = message.attachments.first();
            const response = await axios.get(firstAttachment.url, { responseType: 'text' });
            const analysedLog = RyuParseLogFile(response.data);
            const embed = RyuCreateEmbed(analysedLog, message.author);

            interaction.followUp({ embeds: [embed] })

        } else {
            await interaction.followUp({ content: 'No attachments found in this message.', ephemeral: true });
        }
    }
}
```
# Slash Command
```
const { RyuParseLogFile, RyuCreateEmbed } = require('../../components/functions/LogParser.js')
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ryujinxlogreader')
        .setDescription('Upload a Ryujinx log file to be analyzed')
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('The log file to analyze')
                .setRequired(true)
        ),
  run: async (interaction) => {
    const file = interaction.options.getAttachment('file');
    interaction.deferReply()
    try {
        // Download the file content
        const response = await axios.get(file.url, { responseType: 'text' });

        // Download and parse the log file
        const analysedLog = await RyuParseLogFile(response.data);
        
        // Create the embed
        const embed = RyuCreateEmbed(analysedLog, interaction.user);

        // Send the embed as a reply
        await interaction.followUp({ embeds: [embed] });

    } catch (error) {
        console.error('Error processing the log file:', error);
        await interaction.followUp({ content: 'There was an error processing the log file.' });
    }
  }
}
```