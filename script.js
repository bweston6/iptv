import { Channels } from './js/models/channels.js';
import { Database } from './js/models/database.js';
import { nextInteractiveElement, previousInteractiveElement } from './js/helpers/input.js';
import { settings } from './js/models/settings.js';

let channels;
let database;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init());
} else {
  init();
}

async function init() {
  // no bfcache
  window.addEventListener('unload', function () { });
  window.addEventListener('beforeunload', function () { });

  // video
  document.addEventListener('changechannel', changeChannel);

  if (!settings['m3u-url']) {
    window.location.href = './settings/index.html';
    return;
  }
  if (settings['xmltv-url']) {
    document.querySelector('[aria-label="guide"]').classList.remove('hidden');
  }

  database = await Database.init();
  channels = await Channels.init(settings, database.db);
  initInput();
}

function initInput() {
  window.addEventListener('keydown', (e) => {
    console.log(e);
    switch (e.key) {
      // animations
      case "ArrowLeft":
      case "ArrowRight":
      case "Tab":
        showOnMouseMove();
        break;
    };
    switch (e.key) {
      case "ArrowUp":
      case "PageUp":
        channels.channelUp();
        break;
      case "ArrowDown":
      case "PageDown":
        channels.channelDown();
        break;
      case "ArrowRight":
        nextInteractiveElement(document.activeElement).focus({ 'focusVisible': true });
        break;
      case "ArrowLeft":
        previousInteractiveElement(document.activeElement).focus({ 'focusVisible': true });
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

  window.addEventListener('mousemove', showOnMouseMove);
}

function showOnMouseMove() {
  document.querySelectorAll('.show-on-mousemove').forEach((element) => {
    element.getAnimations().forEach((animation) => {
      animation.currentTime = 0;
      animation.play();
    });
  });
}

let channelString = "";
let channelTimeoutId;
function typeChannel(character) {
  channelString += character;
  Array.from(document.getElementById('channel-icon').children).forEach(child => child.remove());
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

    channelTimeoutId = undefined;
    channelString = ""
  }, 1000);
}

function changeChannel({ detail: channel }) {
  const channelIconElement = document.getElementById('channel-icon');
  Array.from(channelIconElement.children).forEach(child => child.remove());
  if (channel.icon) {
    const imgElement = document.createElement('img');
    imgElement.src = channel.icon;
    imgElement.alt = "";
    channelIconElement.appendChild(imgElement);
  }

  document.getElementById('channel-number').textContent = channel.number;
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
