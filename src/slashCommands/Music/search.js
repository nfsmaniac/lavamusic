const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, PermissionsBitField, Client, CommandInteraction, ApplicationCommandOptionType, ButtonStyle } = require("discord.js");
const { convertTime } = require("../../utils/convert");
const { _, _A_ } = require("simplin.js");
const { AggregatedSearchResults } = require("../../utils/SearchAggregator");
const { duration } = require("moment");

module.exports = {
    name: "search",
    description: "Search for a song on YouTube.",
    userPrems: [],
    player: false,
    inVoiceChannel: true,
    sameVoiceChannel: true,
    options: [
        {
            name: "input",
            description: "Song to search for.",
            required: true,
            type: ApplicationCommandOptionType.String
        }
    ],

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */

    run: async (client, interaction,) => {
        await interaction.deferReply({
            ephemeral: false
        });

        const query = interaction.options.getString("input");
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.resolve(['Speak', 'Connect']))) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(client.embedColor).setDescription(`I don't have enough permissions to execute this command! Please give me permission to \`CONNECT\` or \`SPEAK\`.`)] });
        const { channel } = interaction.member.voice;
        if (!interaction.guild.members.cache.get(client.user.id).permissionsIn(channel).has(PermissionsBitField.resolve(['Speak', 'Connect']))) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(client.embedColor).setDescription(`I don't have enough permissions to connect to your VC. Please give me permission to \`CONNECT\` or \`SPEAK\`.`)] });

        const messages = [];
        const msg = await interaction.editReply({ embeds: [new EmbedBuilder().setColor(client.embedColor).setDescription(`Searching ${query} song please wait`)] });
        messages.push(msg);

        let player = interaction.client.manager.get(interaction.guildId);
        if (!player)
            player = interaction.client.manager.create({
                guild: interaction.guildId,
                voiceChannel: channel.id,
                textChannel: interaction.channelId,
                volume: 80,
                selfDeafen: true,
            })
        if (player && player.state !== "CONNECTED") player.connect();

        const but = new ButtonBuilder().setCustomId("s_one").setLabel("1").setStyle(ButtonStyle.Success);
        const but2 = new ButtonBuilder().setCustomId("s_two").setLabel("2").setStyle(ButtonStyle.Success);
        const but3 = new ButtonBuilder().setCustomId("s_three").setLabel("3").setStyle(ButtonStyle.Success);
        const but4 = new ButtonBuilder().setCustomId("s_four").setLabel("4").setStyle(ButtonStyle.Success);
        const but5 = new ButtonBuilder().setCustomId("s_five").setLabel("5").setStyle(ButtonStyle.Success);
        const row = new ActionRowBuilder().addComponents(but, but2, but3, but4, but5);

        const emojiplaylist = client.emoji.playlist;

        [await results, platforms] = AggregatedSearchResults(client, query, interaction.user);
        if(!Array.isArray(results)) results = [results];
        if(platforms == null || results.length === 1){
            switch(results[0].loadType) {
                case "TRACK_LOADED":
                    player.queue.add(results[0].tracks[0]);
                    const embed = new EmbedBuilder()
                    .setDescription(`${emojiplaylist} **Added to queue** - [${results[0].tracks[0].title}](${results[0].tracks[0].uri}) \`${convertTime(results[0].tracks[0].duration, true)}\` • ${results[0].tracks[0].requester}`)
                    .setColor(client.embedColor);

                    msg.edit({ embeds: [embed] });
                    if (!player.playing) player.play()
                break;
                case "NO_MATCHES":
                const nomatch = new EmbedBuilder()
                    .setDescription(`No search results found for ${query}`)
                    .setColor("Red")
                    msg.edit({ embeds: [nomatch] });
                if (!player.playing){
                    player.destroy()
                }
                break;
            }
            return;
        }
        for(i=0; i<platforms.length; i++)
        {
            s = results[i];
            if(s.loadType !== "SEARCH_RESULT") continue;
            tracks = s.tracks.length > 5 ? s.tracks.slice(0,5) : s.tracks;
            let index = 1;
            numbers = tracks.map(x => index++).join('\n');
            artists = tracks.map(x => x.author).join('\n');
            titles = tracks.map(x => `[${x.title}](${x.uri}) \`${convertTime(x.duration, true)}\``).join('\n');
            //durations = tracks.map(x => x.duration).join('\n');

            let p = platforms[i].toUpperCase();
            const embd = new EmbedBuilder()
                    .setColor(0xFFFFFF)
                    .setTitle(_(p, interaction.locale))
                    .setURL(encodeURI(_("URL_QUERY_" + p, query, interaction.locale)))
                    .setDescription(_("RESPONSE_SEARCH_DESC", interaction.locale))
                    .setThumbnail(`https://cdn.discordapp.com/attachments/1034573195191255110/1034573612860055702/${platforms[i].toLowerCase().replace(' ', '-')}_icon.png`)
                    .addFields(
                        //{ name: '\u200B', value: '\u200B' },
                        { name: '\u0023', value: numbers, inline: true },
                        { name: 'Artist', value: artists, inline: true },
                        { name: 'Track', value: titles, inline: true },
                        //{ name: 'Length', value: '03:26\n02:46', inline: true },                        
                    )
                    .setFooter({text: _("RESPONSE_SEARCH_FOOTER_" + p, interaction.locale),
                                iconURL: 'https://www.google.com/favicon.ico'});

            const row = new ActionRowBuilder();
            for(j = 0; j < tracks.length; j++)
            {
                row.addComponents(
                    new ButtonBuilder()
                            .setCustomId(`${i}_${j}`)   // platformId_trackId, bot will parse it back after button_onClick to load the track from array
                            .setLabel(j+1)
                            .setStyle(ButtonStyle.Success)
                );
            }

            if(i === 0) await msg.edit({ embeds: [searched], components: [row] });
            else messages.push(await interaction.followUp({ embeds: [embd], components: [row] }));
            
        }
        let s = await player.search(query, interaction.user);
        switch (s.loadType) {
            case "NO_MATCHES":
                const nomatch = new EmbedBuilder()
                    .setDescription(`No search results found for ${query}`)
                    .setColor("Red")
                msg.edit({ embeds: [nomatch] });
                if (!player.playing){
                    player.destroy()
                }
                break;
            case "TRACK_LOADED":
                player.queue.add(s.tracks[0]);
                const embed = new EmbedBuilder()
                    .setDescription(`${emojiplaylist} **Added to queue** - [${s.tracks[0].title}](${s.tracks[0].uri}) \`${convertTime(s.tracks[0].duration, true)}\` • ${s.tracks[0].requester}`)
                    .setColor(client.embedColor)

                msg.edit({ embeds: [embed] });
                if (!player.playing) player.play()
                break;
            case "SEARCH_RESULT":
                let index = 1;
                const tracks = s.tracks.slice(0, 5);
                const results = s.tracks.slice(0, 5).map(x => `• ${index++} | [${x.title}](${x.uri}) \`${convertTime(x.duration)}\``)
                    .join("\n");
                const searched = new EmbedBuilder()
                    .setTitle("Select the track that you want.")
                    .setColor(client.embedColor)
                    .setDescription(results);

                await msg.edit({ embeds: [searched], components: [row] });
                const search = new EmbedBuilder()
                    .setColor(client.embedColor);

                const collector = msg.createMessageComponentCollector({
                    filter: (f) => f.user.id === interaction.user.id ? true : false && f.deferUpdate(),
                    max: 1,
                    time: 60000,
                    idle: 60000 / 2
                });

                collector.on("end", async (collected) => {
                    if(msg) await msg.edit({components: [new ActionRowBuilder().addComponents(but.setDisabled(true), but2.setDisabled(true), but3.setDisabled(true), but4.setDisabled(true), but5.setDisabled(true))] })
                });

                collector.on("collect", async (b) => {
                    if (!b.deferred) await b.deferUpdate();
                    if (!player && !collector.ended) return collector.stop();
                    if (player.state !== "CONNECTED") player.connect();

                    if (b.customId === "s_one") {
                        player.queue.add(s.tracks[0]);
                        if (player && player.state === "CONNECTED" && !player.playing && !player.paused && !player.queue.size) await player.play();

                        if(msg) await msg.edit({ embeds: [search.setDescription(`${emojiplaylist} **Added to queue** - [${s.tracks[0].title}](${s.tracks[0].uri}) \`${convertTime(s.tracks[0].duration, true)}\` • ${interaction.member.user}`)] })
                    } else if (b.customId === "s_two") {
                        player.queue.add(s.tracks[1]);
                        if (player && player.state === "CONNECTED" && !player.playing && !player.paused && !player.queue.size) await player.play();

                        if(msg) await msg.edit({ embeds: [search.setDescription(`${emojiplaylist} **Added to queue** - [${s.tracks[1].title}](${s.tracks[1].uri}) \`${convertTime(s.tracks[1].duration, true)}\` • ${interaction.member.user}`)] })

                    } else if (b.customId === "s_three") {
                        player.queue.add(s.tracks[2]);
                        if (player && player.state === "CONNECTED" && !player.playing && !player.paused && !player.queue.size) await player.play();

                        if(msg)  await msg.edit({ embeds: [search.setDescription(`${emojiplaylist} **Added to queue** - [${s.tracks[2].title}](${s.tracks[2].uri}) \`${convertTime(s.tracks[2].duration, true)}\` • ${interaction.member.user}`)] })

                    } else if (b.customId === "s_four") {
                        player.queue.add(s.tracks[3]);
                        if (player && player.state === "CONNECTED" && !player.playing && !player.paused && !player.queue.size) await player.play();

                        if(msg)  await msg.edit({ embeds: [search.setDescription(`${emojiplaylist} **Added to queue** - [${s.tracks[3].title}](${s.tracks[3].uri}) \`${convertTime(s.tracks[3].duration, true)}\` • ${interaction.member.user}`)] })

                    } else if (b.customId === "s_five") {
                        player.queue.add(s.tracks[4]);
                        if (player && player.state === "CONNECTED" && !player.playing && !player.paused && !player.queue.size) await player.play();

                        if(msg)  await msg.edit({ embeds: [search.setDescription(`${emojiplaylist} **Added to queue** - [${s.tracks[4].title}](${s.tracks[4].uri}) \`${convertTime(s.tracks[4].duration, true)}\` • ${s.tracks[4].requester}`)] })

                    }
                    
                });
                break;
            case "PLAYLIST_LOADED":
                player.queue.add(s.tracks)
                    const list = new EmbedBuilder()
                        .setDescription(`Playlist Loaded [${s.playlist.name}](${query})`)
                        .setColor(client.embedColor)
                        msg.edit({embeds: [list] });
                        if(!player.playing) player.play()


        }

    }
}



