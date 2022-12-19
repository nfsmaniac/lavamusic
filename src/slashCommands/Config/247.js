const { EmbedBuilder, CommandInteraction } = require("discord.js");
const MusicBot = require("../../structures/Client");
const { Player } = require("erela.js");
const Model = require("../../schema/247");
const { _, _A_ } = require("simplin.js");

module.exports = {
  name: _("SLASH_247_NAME"),
  name_localizations: _A_("SLASH_247_NAME"),
  description: _("SLASH_247_DESC"),
  description_localizations: _A_("SLASH_247_DESC"),
  default_member_permissions: ["ManageChannels"],
  player: true,
  dj: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  /**
   *
   * @param {MusicBot} client
   * @param {CommandInteraction} interaction
   */

  run: async (client, interaction) => {
    await interaction.deferReply({
      ephemeral: false,
    });
    /**
     * @type {Player}
     */
    let player = interaction.client.manager.get(interaction.guildId);
    const data = await Model.findOne({ Guild: interaction.guildId });
    if (player.twentyFourSeven) {
      player.twentyFourSeven = false;
      const embed = new EmbedBuilder()
        .setDescription(_("RESPONSE_247_DISABLED"))
        .setColor(client.embedColor);
      await interaction
        .editReply({ embeds: [embed] })
        .catch((err) => console.error("Promise Rejected At", err));
    } else {
      player.twentyFourSeven = true;
      const embed = new EmbedBuilder()
        .setDescription(_("RESPONSE_247_ENABLED"))
        .setColor(client.embedColor);
      await interaction
        .editReply({ embeds: [embed] })
        .catch((err) => console.error("Promise Rejected At", err));
    }

    if (!data)
      return await Model.create({
        Guild: player.guild,
        247: player.twentyFourSeven,
        VoiceChannel: interaction.guild.members.me.voice?.channelId,
        TextChannel: interaction.channelId,
      });

    await data.updateOne({
      Guild: player.guild,
      247: player.twentyFourSeven,
      VoiceChannel: interaction.guild.members.me.voice?.channelId,
      TextChannel: interaction.channelId,
    });
    return;
  },
};
