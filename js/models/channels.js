import { Programme } from "../objects/programme.js";

export class Channels {
  #channel = undefined;

  constructor(settings, db) {
    this.channels = JSON.parse(localStorage.getItem('channels'));
    this.db = db;
    this.settings = settings;
  }

  static async init(settings, db) {
    const channels = new Channels(settings, db);

    if (!channels.channels || !channels.channels.length) {
      channels.channels = await channels.#getChannelsFromSettings()
      localStorage.setItem('channels', JSON.stringify(channels.channels));
    }
    channels.channels = await channels.#getGuideFromSettings();
    channels.#channel = channels.channels[channels.#channelIndex];

    return channels;
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

  async #getChannelsFromSettings() {
    return fetch(this.settings['m3u-url'])
      .then(response => response.text())
      .then(text => this.#parseM3U(text));
  }

  #parseM3U(m3u) {
    const regex = new RegExp('#EXTINF:(?<duration>-?\\d+).*?(?: tvg-id="(?<id>[a-z0-9]+)" tvg-chno="(?<number>\\d+)")?,(?<name>.*)\\n(?<stream>.*)', 'gm')
    const tracks = Array.from(m3u.matchAll(regex)).map((track) => track.groups);
    return tracks;
  }

  async #getGuideFromSettings() {
    const xmltv = await fetch(this.settings['xmltv-url'])
      .then((response) => response.text())
      .then((text) => {
        const parser = new DOMParser();
        return parser.parseFromString(text, "text/xml");
      });

    // const transaction = this.db.transaction(["programme"], "readwrite");
    // const programmeStore = transaction.objectStore("programme")
    //
    // const request = programmeStore.clear();
    // request.onsuccess = () => {
      this.channels.forEach((channel) => {
        channel.icon = xmltv.querySelector(`channel[id='${channel.id}'] > icon`)?.getAttribute('src');
        channel.programmes = Array.from(xmltv.querySelectorAll(`[channel='${channel.id}']`))
          .map(this.#parseXmlProgramme);

        // channel.programmes.forEach((programme) => {
        //   programmeStore.add(programme);
        // });
      });
    // };

    return this.channels;

    // this.db
    //   .transaction(["programme"])
    //   .objectStore("programme")
    //   .index("channelId")
    //   .getAll("0ce34d2af6bed804dd608fd3cb8a37cf")
    //   .onsuccess = (e) => {
    //     console.log(e.target.result);
    //   };
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
