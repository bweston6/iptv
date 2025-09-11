import { Channels } from "../js/models/channels.js";
import { Database } from "../js/models/database.js";
import { settings } from "../js/models/settings.js";

const currentTime = new Date();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init());
} else {
  init();
}

let channels;

async function init() {
  const db = (await Database.init()).db;
  channels = await Channels.init(settings, db);

  changeChannel(channels.channel);
  document.addEventListener('changechannel', ({ detail: channel }) => changeChannel(channel));

  const timeList = document.querySelector('#time ol');

  let time = new Date();
  let nextTime = roundToNext30MinIncrement(time);
  const timeListItem = document.createElement('li');
  timeListItem.role = "columnheader"
  const duration = nextTime - time;
  timeListItem.setAttribute('style', `width: ${millisToWidth(duration)}`);
  if (duration >= 900000) {
    timeListItem.textContent = formatTime(time);
  }
  timeList.append(timeListItem);

  const channelObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        continue;
      }

      channelObserver.unobserve(entry.target);

      const programmeList = entry.target.querySelector('.programme-list');

      db.transaction('programme')
        .objectStore('programme')
        .index('channelId')
        .getAll(entry.target.dataset.id)
        .onsuccess = request => {
          const programmes = request.target.result
            .filter(programme => {
              return programme.stop > currentTime &&
                programme.start <= new Date(currentTime).setHours(currentTime.getHours() + 24)
            })
            .sort((a, b) => a.start - b.start)

          for (const programme of programmes) {
            if (programme.start < currentTime) {
              programme.start = currentTime;
            }

            while (programme.stop > nextTime) {
              time = nextTime;
              nextTime = roundToNext30MinIncrement(time);
              const timeListItem = document.createElement('li');
              timeListItem.role = "columnheader";
              timeListItem.setAttribute('style', `width: ${millisToWidth(nextTime - time)}`);
              timeListItem.textContent = formatTime(time);
              timeList.append(timeListItem);
            }

            const programmeElement = document.createElement('li');
            programmeElement.role = "gridcell";
            programmeElement.classList.add('programme');
            programmeElement.textContent = programme.title;
            programmeElement.setAttribute('style', `width: ${millisToWidth(programme.stop - programme.start)}`);

            programmeElement.addEventListener('click', (e) => {
              document.querySelectorAll('[tabindex="0"]').forEach(e => e.removeAttribute('tabindex'));
              e.target.tabIndex = 0;
              e.target.focus();
              renderSelectedProgramme(channels.channels.find(channel => channel.id === programme.channelId), programme)
            });
            if (channels.channel.id === programme.channelId &&
              programme.start <= currentTime &&
              programme.stop > currentTime
            ) {
              renderSelectedProgramme(channels.channel, programme);
            }

            programmeList.append(programmeElement);
          }
        }
    }
  });

  channels.channels.forEach((channel) => {
    const channelElement = document.createElement('li');
    channelElement.classList.add('channel');
    channelElement.role = "row";
    channelElement.dataset.id = channel.id;
    channelElement.dataset.number = channel.number;

    const channelHeader = document.createElement('div');
    channelHeader.classList.add('channel-header');
    channelHeader.role = "rowheader";
    channelHeader.addEventListener('click', e => {
      document.querySelectorAll('[tabindex="0"]').forEach(e => e.removeAttribute('tabindex'));
      e.target.tabIndex = 0;
      e.target.focus();
      const number = e.target.closest('.channel').dataset.number;
      channels.channel = Number(number);
    });
    const channelIcon = document.createElement('img');
    channelIcon.alt = "";
    channelIcon.classList.add('icon');
    channelIcon.loading = "lazy";
    channelIcon.src = channel.icon;
    const channelName = document.createElement('h2');
    channelName.textContent = channel.name;

    channelHeader.append(channelIcon);
    channelHeader.append(channelName);
    channelElement.append(channelHeader);

    const programmeList = document.createElement('ol');
    programmeList.classList.add('programme-list');
    channelElement.append(programmeList);

    document.getElementById('guide').append(channelElement);
    channelObserver.observe(channelElement);
  });

  const currentChannel = document.querySelector(`.channel[data-id="${channels.channel.id}"] .channel-header`);
  currentChannel.scrollIntoView({
    behavior: "instant",
    block: "center",
    container: "nearest"
  });
  const guide = document.getElementById('guide')
  guide.tabIndex = -1;
  currentChannel.tabIndex = 0
  currentChannel.focus();
  guide.addEventListener('keydown', processInput);
}

function renderSelectedProgramme(channel, programme) {
  document.querySelector('#channel-name h1').textContent = channel.name;
  document.querySelector('#channel-name img').src = channel.icon;
  document.getElementById('programme-name').textContent = programme.title;
  document.getElementById('programme-description').textContent = programme.description;
}

function millisToWidth(millis) {
  // 30 mins = 20vw
  const ratio = 20 / (30 * 60000)
  return `${millis * ratio}vw`;
}

function formatTime(time) {
  let formatter = new Intl.DateTimeFormat(navigator.language, {
    timeStyle: "short"
  });

  if (time.getHours() == 0 && time.getMinutes() == 0) {
    formatter = new Intl.DateTimeFormat(navigator.language, {
      weekday: "short", day: "numeric", month: "short"
    });
  }

  return formatter.format(time);
}

function roundToNext30MinIncrement(time) {
  const nextTime = new Date(time);

  nextTime.setMinutes(nextTime.getMinutes() + 30);

  nextTime.setMilliseconds(0);
  nextTime.setSeconds(0);
  nextTime.setMinutes(Math.floor(nextTime.getMinutes() / 30) * 30);
  return nextTime;
}

function changeChannel(channel) {
  const streamElement = document.getElementById('stream');
  Array.from(streamElement.children).forEach(child => child.remove());

  const videoElement = document.createElement('video');
  videoElement.src = channel.stream;
  streamElement.append(videoElement);
  videoElement.play();
}

function processInput(event) {
  const thisSelector = ':is(.channel-header,.programme)[tabindex="0"]';
  let nextElement;

  switch (event.key) {
    case "ArrowUp":
    case "ArrowDown":
    case "ArrowRight":
    case "ArrowLeft":
      event.preventDefault();
  }

  switch (event.key) {
    case "Enter":
      document.querySelector(thisSelector).click();
    case "PageUp":
      channels.channelUp();
      break;
    case "PageDown":
      channels.channelDown();
      break;
    case "ArrowUp":
      break;
    case "ArrowDown":
      break;
    case "ArrowRight":
      nextElement = document.querySelector(`${thisSelector} + .programme`) ??
        document.querySelector(`${thisSelector} + * .programme`);
      break;
    case "ArrowLeft":
      nextElement = document.querySelector(`:has(+ ${thisSelector})`) ??
        document.querySelector(`.channel-header:has(+ .programme-list > ${thisSelector})`);
      break;
  }

  if (nextElement) {
    document.querySelectorAll('[tabindex="0"]').forEach(e => e.removeAttribute('tabindex'));
    nextElement.tabIndex = 0;
    nextElement.focus();
  }
}
