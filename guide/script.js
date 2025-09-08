import { Channels } from "../js/models/channels.js";
import { Database } from "../js/models/database.js";
import { settings } from "../js/models/settings.js";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init());
} else {
  init();
}

async function init() {
  const db = await new Database();
  const channels = await Channels.init(settings, db);

  const timeList = document.querySelector('#time ol');

  let time = new Date();
  console.log(time)
  let nextTime = roundToNext30MinIncrement(time);
  const timeListItem = document.createElement('li');
  timeListItem.setAttribute('style', `width: ${millisToWidth(nextTime - time)}`);
  timeListItem.textContent = formatTime(time);
  timeList.append(timeListItem);

  channels.channels.forEach((channel) => {
    const channelElement = document.createElement('li');
    channelElement.classList.add('channel');

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
    const currentTime = new Date();
    for (const programme of channel.programmes) {
      if (programme.stop < currentTime) {
        continue;
      }

      if (programme.start < currentTime) {
        programme.start = currentTime;
      }

      if (programme.stop > nextTime) {
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

      programmeList.append(programmeElement);
    }

    channelElement.append(programmeList);
    document.getElementById('guide').append(channelElement);
  });
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
  nextTime.setMinutes(Math.round(nextTime.getMinutes() / 30) * 30);
  return nextTime;
}
