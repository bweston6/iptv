import { settings } from './models/settings.js';

let channels = JSON.parse(localStorage.getItem('channels'));

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init());
} else {
  init();
}

function init() {
  if (!settings['m3u-url']) {
    window.location.replace('./settings');
    return;
  }

  initChannels();
  initRemote();
}

function initRemote() {
  window.addEventListener('keydown', (e) => {
    const channelIndex = JSON.parse(localStorage.getItem('channel-index')) ?? 0;
    let newChannelIndex = channelIndex;
    switch (e.key) {
      case "ArrowUp":
      case "PageUp":
        newChannelIndex = channelIndex <= channels.length ? channelIndex + 1 : channelIndex;
        break;
      case "ArrowDown":
      case "PageDown":
        newChannelIndex = channelIndex > 0 ? channelIndex - 1 : channelIndex;
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
    if (newChannelIndex != channelIndex) {
      localStorage.setItem('channel-index', JSON.stringify(newChannelIndex));
      changeChannel(channels[newChannelIndex]);
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
    let channelNumber = Number(channelString);

    const lowestChannelNumber = channels.reduce((acc, curr) => {
      return Number(curr.number) < acc ? Number(curr.number) : acc;
    }, Infinity)
    if (channelNumber < lowestChannelNumber) {
      channelNumber += lowestChannelNumber - 1;
    }

    channelTimeoutId = undefined;
    channelString = ""

    for (let i = 0; i < channels.length; i++) {
      if (channels[i].number == channelNumber) {
        localStorage.setItem('channel-index', JSON.stringify(i));
        changeChannel(channels[i]);
      }
    }
  }, 1000);
}

async function initChannels() {
  if (!channels || channels.length === 0) {
    const response = await fetch(settings['m3u-url']);
    const text = await response.text();
    channels = parseM3U(text);
    localStorage.setItem('channels', JSON.stringify(channels));
  }

  changeChannel(channels[JSON.parse(localStorage.getItem('channel-index')) ?? 0]);
}

function parseM3U(m3u) {
  const regex = new RegExp('^#EXTINF:.*(?:tvg-chno="(?<number>\\d+)")?.*,(?<name>.*)\\n(?<stream>.*)', 'gm')
  const tracks = Array.from(m3u.matchAll(regex)).map((track) => track.groups);
  return tracks;
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
