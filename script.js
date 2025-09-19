import { Channels } from './js/models/channels.js';
import { Database } from './js/models/database.js';
import { nextInteractiveElement, previousInteractiveElement } from './js/helpers/input.js';
import { settings } from './js/models/settings.js';

class Controller {
  channelString = "";
  channelTimeoutId;
  channels;
  database;
  settings;

  constructor({ channels, database, settings }) {
    this.channels = channels;
    this.database = database;
    this.settings = settings;
  }

  static async init() {
    // no bfcache
    window.addEventListener('unload', function () { });
    window.addEventListener('beforeunload', function () { });

    Controller.checkSettings(settings);

    const database = await Database.init();
    const channels = await Channels.init(settings, database);

    const controller = new Controller({ channels, database, settings });
    controller.addEventListeners();
    controller.changeChannel(controller.channels.channel);

    return controller;
  }

  static checkSettings(settings) {
    if (!settings['m3u-url']) {
      window.location.href = './settings/index.html';
      return;
    }
    if (settings['xmltv-url']) {
      document.querySelector('[aria-label="guide"]').classList.remove('hidden');
    }
  }

  addEventListeners() {
    document.addEventListener('changechannel', ({ detail: channel }) => this.changeChannel(channel));
    window.addEventListener('keydown', e => this.input(e));
    window.addEventListener('mousemove', e => this.showOnMouseMove(e));
  }

  input(e) {
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
        this.channels.channelUp();
        break;
      case "ArrowDown":
      case "PageDown":
        this.channels.channelDown();
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
        this.typeChannel(e.key);
        break;
    }
    switch (e.keyCode) {
      case 403: // yellow
      case 404: // yellow
      case 405: // yellow
      case 406: // blue
        this.colorButton(e.keyCode);
        break;
    }
  }

  showOnMouseMove() {
    document.querySelectorAll('.show-on-mousemove').forEach((element) => {
      element.getAnimations().forEach((animation) => {
        animation.currentTime = 0;
        animation.play();
      });
    });
  }

  typeChannel(character) {
    this.channelString += character;
    document.getElementById('channel-icon').src = "";
    document.getElementById('channel-number').textContent = this.channelString;
    document.getElementById('channel-name').textContent = "";
    document.querySelector('.hud').getAnimations().forEach((animation) => {
      animation.currentTime = 0;
      animation.play();
    });

    if (this.channelTimeoutId) {
      clearTimeout(this.channelTimeoutId);
    }
    this.channelTimeoutId = setTimeout(() => {
      const currentChannel = this.channels.channel;
      this.channels.channel = Number(this.channelString)

      if (currentChannel === this.channels.channel) {
        this.changeChannel(currentChannel)
      }

      this.channelTimeoutId = undefined;
      this.channelString = ""
    }, 1000);
  }

  colorButton(keyCode) {
    const buttonIndex = keyCode - 403;
    const buttons = document.querySelectorAll('[aria-role="navigation"] .button');
    buttons[buttonIndex - (4 - buttons.length)].click();
  }

  changeChannel(channel) {
    if (channel.icon) {
      document.getElementById('channel-icon').src = channel.icon;
    }

    this.database.db.transaction(["programme"])
      .objectStore("programme")
      .index("channelId")
      .getAll(channel.id)
      .onsuccess = (request) => {
        const currentTime = new Date();
        const programmes = request.target.result
        programmes.forEach(programme => {
          if (
            programme.start <= currentTime &&
            programme.stop > currentTime
          ) {
            const programmeTemplate = document.getElementById('programme-template');
            const programmeSpan = programmeTemplate.content.cloneNode(true);
            programmeSpan.getElementById('programme-title').textContent = programme.title
            programmeSpan.getElementById('programme-start').textContent = programme.start.toLocaleTimeString(navigator.language, { timeStyle: "short" })
            programmeSpan.getElementById('programme-stop').textContent = programme.stop.toLocaleTimeString(navigator.language, { timeStyle: "short" })
            const progress = programmeSpan.getElementById('programme-progress')
            progress.max = programme.stop - programme.start;
            progress.value = currentTime - programme.start;

            document.getElementById('programme').replaceWith(programmeSpan);
          }
        })
      };

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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", Controller.init());
} else {
  Controller.init();
}
