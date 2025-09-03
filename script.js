import { settings } from './models/settings.js';
import { Channels } from './models/channels.js';

let channels;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init());
} else {
  init();
}

async function init() {
  if (!settings['m3u-url']) {
    window.location.replace('./settings');
    return;
  }

  channels = await Channels.init(settings);
  changeChannel(channels.channel);
  initRemote();
}

function initRemote() {
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "PageUp":
        channels.channelUp();
        changeChannel(channels.channel);
        break;
      case "ArrowDown":
      case "PageDown":
        channels.channelDown();
        changeChannel(channels.channel);
        break;
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
      case "0":
        typeChannel(e.key);
        break;
    }
  });
}

let channelString = "";
let channelTimeoutId;
function typeChannel(character) {
  channelString += character;
  document.getElementById('channel-number').textContent = channelString;
  document.getElementById('channel-name').textContent = "";
  document.querySelector('.hud').getAnimations().forEach((animation) => {
    animation.currentTime = 0;
    animation.play();
  });

  if (channelTimeoutId) {
    clearTimeout(channelTimeoutId);
  }
  channelTimeoutId = setTimeout(() => {
    channels.channel = Number(channelString)
    changeChannel(channels.channel);

    channelTimeoutId = undefined;
    channelString = ""
  }, 1000);
}

function changeChannel(channel) {
  document.getElementById('channel-number').textContent = channel?.number;
  document.getElementById('channel-name').textContent = channel.name;
  document.querySelector('.hud').getAnimations().forEach((animation) => {
    animation.currentTime = 0;
    animation.play();
  });

  const streamLocation = document.getElementById('stream');
  let videoElement = streamLocation.querySelector('video');
  if (!videoElement) {
    videoElement = document.createElement('video');
    streamLocation.appendChild(videoElement);
  }

  videoElement.src = channel.stream;
  videoElement.play();
}
