import { Channels } from "../js/models/channels.js";
import { Database } from "../js/models/database.js";
import { settings } from "../js/models/settings.js";

const currentTime = new Date();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init());
} else {
  init();
}

async function init() {
  document.addEventListener('changechannel', changeChannel);
  const db = (await Database.init()).db;
  const channels = await Channels.init(settings, db);

  const timeList = document.querySelector('#time ol');

  let time = new Date();
  let nextTime = roundToNext30MinIncrement(time);
  const timeListItem = document.createElement('li');
  timeListItem.setAttribute('style', `width: ${millisToWidth(nextTime - time)}`);
  timeListItem.textContent = formatTime(time);
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
              timeListItem.setAttribute('style', `width: ${millisToWidth(nextTime - time)}`);
              timeListItem.textContent = formatTime(time);
              timeList.append(timeListItem);
            }

            const programmeElement = document.createElement('li');
            programmeElement.classList.add('programme');
            programmeElement.textContent = programme.title;
            programmeElement.setAttribute('style', `width: ${millisToWidth(programme.stop - programme.start)}`);

            programmeElement.addEventListener('click', () => renderSelectedProgramme(channels.channels.find(channel => channel.id === programme.channelId), programme));

            programmeList.append(programmeElement);
          }
        }
    }
  });

  channels.channels.forEach((channel) => {
    const channelElement = document.createElement('li');
    channelElement.classList.add('channel');
    channelElement.dataset.id = channel.id;
    channelElement.dataset.number = channel.number;
    channelElement.addEventListener('click', e => {
      console.log('click', e.target.dataset.number);

      channels.channel = Number(e.target.dataset.number);
    });

    const channelHeader = document.createElement('div');
    channelHeader.classList.add('channel-header');
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

function changeChannel({ detail: channel }) {
  const streamElement = document.getElementById('stream');
  Array.from(streamElement.children).forEach(child => child.remove());

  const videoElement = document.createElement('video');
  videoElement.src = channel.stream;
  streamElement.append(videoElement);
  videoElement.play();
}
