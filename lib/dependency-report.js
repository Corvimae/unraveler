const { generateDependencyReport } = require('@discordjs/voice');
const { RtAudio, RtAudioApi } = require('audify');

console.log(generateDependencyReport());

const rtAudio = new RtAudio(RtAudioApi.WINDOWS_ASIO);

const devices = rtAudio.getDevices();

console.log(devices);