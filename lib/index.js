const config = require('../config.json');
const stream = require('stream');
const CBuffer = require('cbuffer');
const { RtAudio, RtAudioApi, RtAudioFormat, RtAudioStreamFlags } = require('audify');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
const { OpusEncoder } = require('@discordjs/opus');


const rtAudio = new RtAudio(RtAudioApi.WINDOWS_ASIO);

const devices = rtAudio.getDevices();

const selectedDeviceId = devices.findIndex(({ name }) => name === config.asioDevice);

if (!selectedDeviceId) {
  console.error(`Invalid device ${config.asioDevice}. Valid devices are: ${devices.map(({ name }) => name).join(', ')}.`);

  process.exit(-1);
}

console.log(devices[selectedDeviceId]);

const ignoredUserIds = config.userIgnoreList ?? [];

console.log(`Found device ${config.asioDevice}, starting Discord bot...`);

const voiceConnection = { current: null };

const frameSize = rtAudio.openStream(
  {
    deviceId: selectedDeviceId,
    nChannels: config.numChannels,
    firstChannel: config.startChannel - 1,
  },
  null,
  RtAudioFormat.RTAUDIO_SINT16,
  48000,
  1024,
  'Unraveller',
  null,
  null,
  RtAudioStreamFlags.RTAUDIO_NONINTERLEAVED
);

rtAudio.start();

const outputChannels = [...new Array(config.numChannels)].map((_, index) => {
  const channel = config.startChannel + index;
  try {
    const encoder = new OpusEncoder(48000, 1);

    const outputStream = new stream.Writable();
    const bufferSize = frameSize * 2;

    const channelData = {
      channel,
      userId: null,
      outputBuffer: new CBuffer(bufferSize),
      outputStream,
    };

    channelData.outputStream._write = function(chunk, encoding, done) {
      try {
        const decoded = encoder.decode(chunk);

        for (let elem of decoded) {
          channelData.outputBuffer.push(elem);

          if (channelData.outputBuffer.length === bufferSize) {
            // Flush all buffers
            const writeBuffer = Buffer.concat(outputChannels.map(channel => {
              return Buffer.concat([Buffer.from(channel.outputBuffer.toArray())], bufferSize);
            }));

            rtAudio.write(writeBuffer);

            outputChannels.map(channel => {
              channel.outputBuffer = channel.outputBuffer.empty();
            });
            // console.log(frameSize, outputBuffer.toArray().length);
            // outputStreamRaw.write(Buffer.from(outputBuffer.toArray()));
          }
        }

        // console.log(frameSize, decoded.byteLength, '-', decoded.length);
        // const recoded = Buffer.concat([decoded], frameSize * 4);
        // console.log(frameSize, recoded.byteLength);
        // outputStreamRaw.write(recoded);
      } catch (e) {
        console.error(e);
      }

      done();
    }

    console.log(`Slot for channel ${channel} created with frame size ${frameSize}.`);

    return channelData;
  } catch (e) {
    console.error(`Failed to prepare channel ${channel}`, e);
  }
});

function getOutputChannelDataForUser(id) {
  return outputChannels.find(({ userId }) => userId === id);
}

function getEmptyChannel() {
  return outputChannels.find(({ userId }) => userId === null);
}

const client = new Client({ intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildVoiceStates
] });

client.once('ready', async () => {
	console.log('Discord bot ready!');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'join') {
    await interaction.reply('Joining channel...');
    
    voiceConnection.current = joinVoiceChannel({
      channelId: interaction.channel.id,
      guildId: interaction.channel.guild.id,
      adapterCreator: interaction.channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: true,
    });
    
    voiceConnection.current.receiver.speaking.on('start', async userId => {
      try {
        const user = await client.users?.fetch(userId) ?? { username: '<unfetched>' };

        if (ignoredUserIds.indexOf(userId) === -1) {
          if (!getOutputChannelDataForUser(userId)) {
            const channel = getEmptyChannel();

            if (channel) {
              channel.userId = userId;
              channel.stream = voiceConnection.current.receiver.subscribe(userId);

              channel.stream.pipe(channel.outputStream)
              
              console.log(`User ${user.username} piping to channel ${channel.channel}.`);
            } else {
              console.log(`User ${user.username} has connected, but there is no available channel!`);
            }
          }
        }
      } catch (e) {
        console.error(`Unable to attach user to channel.`, e);
      }
    });
    
    voiceConnection.current.on(VoiceConnectionStatus.Connecting, async () => {
      console.log('Connecting to voice channel...');
      await interaction.editReply('Attempting to connect...');
    });
    
    voiceConnection.current.on(VoiceConnectionStatus.Ready, async () => {
      console.log('Connected to voice channel.');
      await interaction.editReply('Joined!');
    });

  } else if (interaction.commandName === 'leave') {
    await interaction.reply('Leaving channel...');

    await voiceConnection.current.destroy();

    await interaction.editReply('Left channel!');
  }
})

client.login(config.discordToken);

function onExit() {
  try {
    voiceConnection.current?.destroy();
    outputChannels.forEach(({ stream }) => stream?.stop());
  } catch (e) {}
};

process.on('exit', onExit);
process.on('SIGINT', onExit);
process.on('SIGUSR1', onExit);
process.on('SIGUSR2', onExit);
process.on('uncaughtException', e => {
  console.error(e);
  // onExit();
});