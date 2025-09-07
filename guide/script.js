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

  channels.channels.forEach((channel) => {
    const channelElement = document.createElement('li');
    channelElement.classList.add('channel');

    const channelHeader = document.createElement('div');
    channelHeader.classList.add('channel-header');
    const channelName = document.createElement('h2');
    channelName.textContent = channel.name;

    channelHeader.append(channelName);
    channelElement.append(channelHeader);

    const programmeList = document.createElement('ol');
    channel.programmes.forEach((programme) => {
      const programmeElement = document.createElement('li');
      programmeElement.classList.add('programme');
      programmeElement.textContent = programme.title;
      programmeElement.setAttribute('style', `width: ${millisToWidth(programme.stop - programme.start)}`);

      programmeList.append(programmeElement);
    });

    channelElement.append(programmeList);

    document.getElementById('guide').append(channelElement);
  });
}

function millisToWidth(millis) {
  // 30 mins = 20vw
  const ratio = 20 / (30 * 60000)
  return `${millis * ratio}vw`;
}
