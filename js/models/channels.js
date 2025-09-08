import { Channel } from "../objects/channel.js";
import { Programme } from "../objects/programme.js";

export class Channels {
  #channel;
  channels;

  constructor(settings, db) {
    this.db = db;
    this.settings = settings;
  }

  static async init(settings, db) {
    const channels = new Channels(settings, db);

    await channels.#initChannels();
    await channels.#initGuide();

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

  async #initChannels(cache = true) {
    if (!cache) {
      this.db.transaction(["channel"], "readwrite")
        .objectStore("channel")
        .clear();
    }

    const channelCount = await new Promise(res => {
      this.db.transaction(["channel"])
        .objectStore("channel")
        .count()
        .onsuccess = (request) => res(request.target.result);
    });

    if (channelCount) {
      this.channels = await new Promise(res => {
        this.db
          .transaction(["channel"])
          .objectStore("channel")
          .index("number")
          .getAll()
          .onsuccess = (request) => res(request.target.result);
      });

      return this.channels;
    }

    this.channels = await fetch(this.settings['m3u-url'])
      .then(response => response.text())
      .then(text => this.#parseM3U(text));

    const channelStore = this.db.transaction(["channel"], "readwrite")
      .objectStore("channel");

    for (const channel of this.channels) {
      await new Promise(res => {
        channelStore.add(channel)
          .onsuccess = res;
      });
    }

    return this.channels;
  }

  async #initGuide(cache = true) {
    if (!cache) {
      this.db.transaction(["programme"], "readwrite")
        .objectStore("programme")
        .clear();
    }

    const programmeCount = await new Promise(res => {
      this.db.transaction(["programme"])
        .objectStore("programme")
        .count()
        .onsuccess = (request) => res(request.target.result);
    });

    if (programmeCount) {
      for (const channel of this.channels) {
        channel.programmes = await new Promise(res => {
          this.db
            .transaction(["programme"])
            .objectStore("programme")
            .index("channelId")
            .getAll(channel.id)
            .onsuccess = (request) => res(request.target.result);
        });
      }

      return this.channels;
    }

    const xmltv = await fetch(this.settings['xmltv-url'])
      .then((response) => response.text())
      .then((text) => {
        const parser = new DOMParser();
        return parser.parseFromString(text, "text/xml");
      });

    const transaction = this.db.transaction(["channel", "programme"], "readwrite")
    const channelStore = transaction.objectStore("channel");
    const programmeStore = transaction.objectStore("programme");

    for (const channel of this.channels) {
      channel.icon = xmltv.querySelector(`channel[id='${channel.id}'] > icon`)?.getAttribute('src');
      await new Promise(res => {
        channelStore.put(channel)
          .onsuccess = res;
      });

      channel.programmes = Array.from(xmltv.querySelectorAll(`[channel='${channel.id}']`))
        .map(this.#parseXmlProgramme);
      for (const programme of channel.programmes) {
        await new Promise(res => {
          programmeStore.add(programme)
            .onsuccess = res;
        });
      }
    }

    return this.channels;
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
