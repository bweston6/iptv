import { Channel } from "../objects/channel.js";
import { Database } from "./database.js";
import { Programme } from "../objects/programme.js";
import { settings } from "./settings.js";

export class Channels {
  #_channel;
  channels;

  constructor(db) {
    this.db = db
  }

  static async init(cache = true) {
    const database = await Database.init();
    const channels = new Channels(database.db);

    await channels.cacheSources(cache);
    channels.channels = await new Promise(res => {
      database.db
        .transaction(["channel"])
        .objectStore("channel")
        .index("number")
        .getAll()
        .onsuccess = (request) => res(request.target.result);
    });
    channels.#channel = channels.channels[channels.#channelIndex];

    return channels;
  }

  set #channel(channel) {
    if (channel.id !== this.#channel?.id) {
      document.dispatchEvent(new CustomEvent('changechannel',
        { detail: { channel, programme: this.getCurrentProgramme(channel) } }
      ));
    }

    this.#_channel = channel;
  }

  get #channel() {
    return this.#_channel;
  }

  get channel() {
    return this.#channel;
  }

  set channel(number) {
    const lowestChannelNumber = this.channels.reduce((acc, curr) => {
      return Number(curr.number) < acc ? Number(curr.number) : acc;
    }, Infinity)
    if (number < lowestChannelNumber) {
      number += lowestChannelNumber - 1;
    }

    for (let i = 0; i < this.channels.length; i++) {
      if (this.channels[i].number == number) {
        this.#channelIndex = i;
        this.#channel = this.channels[i];
        break;
      }
    }

    return this.#channel;
  }

  channelUp() {
    if (this.#channelIndex < this.channels.length - 1) {
      this.#channel = this.channels[++this.#channelIndex];
    }
    return this.channel;
  }

  channelDown() {
    if (this.#channelIndex > 0) {
      this.#channel = this.channels[--this.#channelIndex];
    }
    return this.channel;
  }

  get #channelIndex() {
    return JSON.parse(localStorage.getItem('channel-index')) ?? 0;
  }
  set #channelIndex(index) {
    localStorage.setItem('channel-index', JSON.stringify(index));
  }

  getCurrentProgramme(channel) {
    return new Promise(res =>
      this.db.transaction('programme')
        .objectStore('programme')
        .index('channelId')
        .getAll(channel.id)
        .onsuccess = request => {
          const currentTime = new Date();
          const programmes = request.target.result;
          for (const programme of programmes) {
            if (
              programme.start <= currentTime &&
              programme.stop > currentTime
            ) {
              res(programme);
              break;
            }
          }
        });
  }

  async cacheSources(cache = true) {
    const cacheDuration = 1; // day
    const cacheExpiry = new Date();
    cacheExpiry.setDate(cacheExpiry.getDate() - cacheDuration);

    let transaction = this.db.transaction(["channel", "programme"], "readwrite");
    let channelStore = transaction.objectStore("channel");
    let programmeStore = transaction.objectStore("programme");

    if (!cache) {
      channelStore.clear()
      programmeStore.clear();
    }

    // check if cache exists
    const channelCount = await new Promise(res => {
      channelStore.count().onsuccess = (request) => res(request.target.result);
    });
    const programmeCount = await new Promise(res => {
      programmeStore.count().onsuccess = (request) => res(request.target.result);
    });
    const lastFetch = JSON.parse(localStorage.getItem('last-fetch'));

    // only block if there is no data

    if (channelCount == 0 && programmeCount == 0) {
      await this.#writeM3U()
        .then(() => this.#writeXML())
        .then(() => localStorage.setItem('last-fetch', JSON.stringify(new Date())));
    } else if (cacheExpiry > lastFetch) {
      console.debug('cache expired');
      this.#writeM3U()
        .then(() => this.#writeXML())
        .then(() => localStorage.setItem('last-fetch', JSON.stringify(new Date())));
    }
  }

  async #writeM3U() {
    // get m3u
    const channels = await fetch(settings['m3u-url'])
      .catch(_ => {
        const searchParams = new URLSearchParams();
        searchParams.append('m3u-url', 'Failed to fetch URL');
        window.location.href = `${window.location.origin}/settings/index.html?${searchParams.toString()}`;
      })
      .then(response => response.text())
      .then(text => this.#parseM3U(text));

    const transaction = this.db.transaction(["channel", "programme"], "readwrite");
    const channelStore = transaction.objectStore("channel");

    // write channels to DB
    for (const channel of channels) {
      channelStore.add(channel);
    }

    transaction.commit();
    return new Promise(res => { transaction.oncomplete = res });
  }

  async #writeXML() {
    if (!settings['xmltv-url']) {
      return;
    }

    // get xmltv
    const xmltv = await fetch(settings['xmltv-url'])
      .then(response => response.text())
      .then(text => new DOMParser().parseFromString(text, "text/xml"));

    const transaction = this.db.transaction(["channel", "programme"], "readwrite");
    const channelStore = transaction.objectStore("channel");
    const programmeStore = transaction.objectStore("programme");

    // write channel icons to DB
    const channels = await new Promise(res => { channelStore.getAll().onsuccess = request => res(request.target.result) });
    for (const channel of channels) {
      channel.icon = xmltv.querySelector(`channel[id='${channel.id}'] > icon`)?.getAttribute('src');
      channelStore.put(channel);
    }

    // write programmes to DB
    const programmes = Array.from(xmltv.querySelectorAll("[channel]")).map(this.#parseXmlProgramme);
    for (const programme of programmes) {
      programmeStore.add(programme);
    }

    transaction.commit();
    return new Promise(res => { transaction.oncomplete = res });
  }

  #parseM3U(m3u) {
    const regex = new RegExp('#EXTINF:(?<duration>-?\\d+).*?(?: tvg-id="(?<id>[a-z0-9]+)" tvg-chno="(?<number>\\d+)")?,(?<name>.*)\\n(?<stream>.*)', 'gm')
    return Array.from(m3u.matchAll(regex))
      .map(track => new Channel(track.groups));
  }


  #parseXmlProgramme(xmlProgramme) {
    const data = {};

    Array.from(xmlProgramme.attributes).forEach((attribute) => {
      data[attribute.name] = attribute.value;
    });

    Array.from(xmlProgramme.children).forEach((child) => {
      const node = { 'text': child.textContent };

      Array.from(child.attributes).forEach((attribute) => {
        node[attribute.name] = attribute.value;
      });

      data[child.nodeName] = node;
    })

    return new Programme(data);
  }
}
