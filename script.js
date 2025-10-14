import { TV } from './js/models/tv.js'
import { nextInteractiveElement, previousInteractiveElement } from './js/helpers/input.js';

let tv;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init());
} else {
  init();
}

async function init() {
  // user input
  window.addEventListener('keydown', e => {
    showOnMouseMove(e);
    input(e);
  });
  window.addEventListener('mousemove', e => showOnMouseMove(e));

  // render
  document.addEventListener('changechannel', ({ detail }) => changeChannel(detail));
  document.addEventListener('typechannel', ({ detail }) => typeChannel(detail));

  tv = await TV.init();
}

function input(e) {
  switch (e.key) {
    case "ArrowUp":
    case "PageUp":
      tv.channelUp();
      break;
    case "ArrowDown":
    case "PageDown":
      tv.channelDown();
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
      tv.typeChannel(e.key);
      break;
  }
  switch (e.keyCode) {
    case 403: // yellow
    case 404: // yellow
    case 405: // yellow
    case 406: // blue
      colorButton(e.keyCode);
      break;
  }
}

function showOnMouseMove() {
  document.querySelectorAll('.show-on-mousemove').forEach((element) => {
    element.getAnimations().forEach((animation) => {
      animation.currentTime = 0;
      animation.play();
    });
  });
}

function colorButton(keyCode) {
  const buttonIndex = keyCode - 403;
  const buttons = document.querySelectorAll('[aria-role="navigation"] .button');
  buttons[buttonIndex - (4 - buttons.length)].click();
}

function typeChannel({ number }) {
  document.getElementById('channel-icon').src = "";
  document.getElementById('channel-name').textContent = "";
  document.getElementById('channel-number').textContent = number;
  document.querySelector('.hud').getAnimations().forEach((animation) => {
    animation.currentTime = 0;
    animation.play();
  });
}

function changeChannel({ channel, programme }) {
  const streamError = document.querySelector('.stream-error');
  streamError.classList.add('hidden');
  const videoElement = document.querySelector('#stream video');
  videoElement.src = channel.stream;
  videoElement.play()
    .catch(_ => {
      // if we are still on the same stream
      if (videoElement.src == channel.stream) {
        streamError.classList.remove('hidden')
      }
    });

  document.getElementById('channel-icon').src = channel?.icon;
  document.getElementById('channel-name').textContent = channel.name;
  document.getElementById('channel-number').textContent = channel.number;

  programme?.then(programme => {
    const programmeTemplate = document.getElementById('programme-template');
    const programmeSpan = programmeTemplate.content.cloneNode(true);
    programmeSpan.getElementById('programme-title').textContent = programme.title
    programmeSpan.getElementById('programme-start').textContent = programme.start.toLocaleTimeString(navigator.language, { timeStyle: "short" })
    programmeSpan.getElementById('programme-stop').textContent = programme.stop.toLocaleTimeString(navigator.language, { timeStyle: "short" })
    const progress = programmeSpan.getElementById('programme-progress')
    progress.max = programme.stop - programme.start;
    progress.value = new Date() - programme.start;

    document.getElementById('programme').replaceWith(programmeSpan);
  });

  document.querySelector('.hud').getAnimations().forEach((animation) => {
    animation.currentTime = 0;
    animation.play();
  });
}
