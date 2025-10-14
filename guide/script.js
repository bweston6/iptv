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
let db;

async function init() {
  document.addEventListener('changechannel', ({ detail }) => changeChannel(detail));

  const database = await Database.init();
  db = database.db;
  channels = await Channels.init(settings, database);

  const timeList = document.querySelector('#time ol');

  let time = new Date();
  let nextTime = roundToNext30MinIncrement(time);
  const timeListItem = document.createElement('li');
  timeListItem.role = "columnheader"
  const duration = nextTime - time;
  timeListItem.setAttribute('style', `width: calc(${millisToWidth(duration)} - 1rem)`);
  if (duration >= 900000) {
    timeListItem.textContent = formatTime(time);
  }
  timeList.append(timeListItem);

  const observerOptions = {
    root: document.querySelector('#guide'),
    rootMargin: "64px",
  };
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
                programme.start <= new Date(currentTime).setHours(currentTime.getHours() + 12)
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
              timeListItem.setAttribute('style', `width: calc(${millisToWidth(nextTime - time)} - 1rem)`);
              timeListItem.textContent = formatTime(time);
              timeList.append(timeListItem);
            }

            const programmeElement = document.createElement('li');
            programmeElement.role = "gridcell";
            programmeElement.classList.add('programme');
            programmeElement.textContent = programme.title;
            programmeElement.setAttribute('style', `width: calc(${millisToWidth(programme.stop - programme.start)} - 1rem)`);
            programmeElement.dataset.id = programme.id;

            programmeElement.addEventListener('click', (e) => {
              if (programmeElement.tabIndex !== 0) {
                document.querySelectorAll('[tabindex="0"]').forEach(e => e.removeAttribute('tabindex'));
                programmeElement.tabIndex = 0;
              }

              if (
                programme.start <= currentTime &&
                programme.stop > currentTime
              ) {
                channels.channel = e.target.closest('.channel')?.dataset.number;
              } else {
                renderSelectedProgramme(programme.channelId, programme.id);
              }
            });

            programmeList.append(programmeElement);
          }
        }
    }
  }, observerOptions);

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
      const channel = e.target.closest('.channel')
      channels.channel = Number(channel.dataset.number);

      if (channelHeader.tabIndex !== 0) {
        document.querySelectorAll('[tabindex="0"]').forEach(e => e.removeAttribute('tabindex'));
        channelHeader.tabIndex = 0;
      }
    });
    const channelIcon = document.createElement('img');
    channelIcon.alt = "";
    channelIcon.classList.add('icon');
    channelIcon.loading = "lazy";
    channelIcon.src = channel.icon;
    const channelName = document.createElement('h2');
    channelName.textContent = `${channel.number} ${channel.name}`;

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

function renderSelectedProgramme(channelId, programmeId) {
  db.transaction('channel')
    .objectStore('channel')
    .get(channelId)
    .onsuccess = request => {
      const channel = request.target.result;
      document.querySelector('#channel-name h1').textContent = `${channel.number} ${channel.name}`;
      document.querySelector('#channel-name img').src = channel.icon;
    }

  const selectedProgrammeElement = document.getElementById('selected-programme');
  if (!programmeId) {
    selectedProgrammeElement.style.display = "none";
    return;
  }
  selectedProgrammeElement.style.removeProperty('display');

  db.transaction('programme')
    .objectStore('programme')
    .get(Number(programmeId))
    .onsuccess = request => {
      const programme = request.target.result;
      document.getElementById('programme-name').textContent = programme.title;
      document.getElementById('programme-description').textContent = programme.description;
      document.getElementById('programme-start').textContent = programme.start.toLocaleTimeString(navigator.language, { timeStyle: "short" })
      document.getElementById('programme-stop').textContent = programme.stop.toLocaleTimeString(navigator.language, { timeStyle: "short" })
    }
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

async function changeChannel({ channel, programme }) {
  const streamElement = document.getElementById('stream');
  Array.from(streamElement.children).forEach(child => child.remove());

  const videoElement = document.createElement('video');
  videoElement.src = channel.stream;
  streamElement.append(videoElement);
  videoElement.play();
  videoElement.addEventListener('click', _ => history.back());

  renderSelectedProgramme(channel.id, (await programme).id);

  if (document.querySelector('[tabindex="0"]')?.closest('.channel')?.dataset.id !== channel.id) {
    const channelHeader = document.querySelector(`.channel[data-id="${channel.id}"] .channel-header`)
    if (channelHeader && channelHeader.tabIndex !== 0) {
      document.querySelectorAll('[tabindex="0"]').forEach(element => element.removeAttribute('tabindex'));
      channelHeader.tabIndex = 0;
      channelHeader.focus();
    }
  }
}

function processInput(event) {
  event.preventDefault();

  const thisSelector = ':is(.channel-header,.programme)[tabindex="0"]';
  let nextElement;

  switch (event.key) {
    case "ArrowUp":
    case "ArrowDown":
    case "ArrowRight":
    case "ArrowLeft":
    case "Enter":
      document.querySelector('[tabindex="0"]').focus();
      break;
  }

  switch (event.key) {
    case "Enter":
      document.activeElement.click();
      break;
    case "PageUp":
      channels.channelUp();
      break;
    case "PageDown":
      channels.channelDown();
      break;
    case "ArrowUp":
      if (document.activeElement.classList.contains('channel-header')) {
        nextElement = document.activeElement.closest('.channel')?.previousElementSibling.querySelector('.channel-header');
      } else if (document.activeElement === document.activeElement.closest('.programme-list')?.firstElementChild) {
        nextElement = document.activeElement.closest('.channel')?.previousElementSibling.querySelector('.programme-list')?.firstElementChild;
      } else {
        const depth = getDepth(document.activeElement);
        const nextParent = document.activeElement.closest('.channel')?.previousElementSibling.querySelector('.programme-list');
        nextElement = getElementByDepth(depth, nextParent);
      }
      break;
    case "ArrowDown":
      if (document.activeElement.classList.contains('channel-header')) {
        nextElement = document.activeElement.closest('.channel')?.nextElementSibling.querySelector('.channel-header');
      } else if (document.activeElement === document.activeElement.closest('.programme-list')?.firstElementChild) {
        nextElement = document.activeElement.closest('.channel')?.nextElementSibling.querySelector('.programme-list')?.firstElementChild;
      } else {
        const depth = getDepth(document.activeElement);
        const nextParent = document.activeElement.closest('.channel')?.nextElementSibling.querySelector('.programme-list');
        nextElement = getElementByDepth(depth, nextParent);
      }
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
    renderSelectedProgramme(
      nextElement.closest('.channel')?.dataset.id,
      nextElement.closest('.programme')?.dataset.id ??
      nextElement.closest('.channel')?.querySelector('.programme')?.dataset.id
    );
    nextElement.focus();
  }
}

/** Return half the element's width plus the width of all previous siblings 
 */
function getDepth(element) {
  let depth = element.offsetWidth / 2;
  while (element = element.previousElementSibling) {
    depth += element.offsetWidth;
  }
  return depth;
}

/** Return the element whose centre lies "depth" pixels into the parent
 *
 * Will return early if there are not enough children to satisfy the depth.
 */
function getElementByDepth(depth, parent) {
  let element = parent.firstElementChild;
  let lastElementCentre = 0;
  let lastElementEnd = 0;

  for (const child of parent.children) {
    const elementCentre = lastElementEnd + child.offsetWidth / 2;
    const elementEnd = lastElementEnd + child.offsetWidth;

    if (Math.abs(depth - elementCentre) > Math.abs(depth - lastElementCentre)) {
      break;
    }

    element = child;
    lastElementCentre = elementCentre
    lastElementEnd = elementEnd;
  }
  return element;
}
