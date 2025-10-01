import { Channel } from "../objects/channel.js";
import { Programme } from "../objects/programme.js";

export class Channels {
  #_channel;
  channels;

  constructor(settings, database) {
    this.db = database.db;
    this.settings = settings;
  }

  static async init(settings, database) {
    const channels = new Channels(settings, database);

    await channels.#cacheSources();
    await channels.#initChannels();

    channels.#channel = channels.channels[channels.#channelIndex];

    return channels;
  }

  set #channel(channel) {
    if (channel.id !== this.#channel?.id) {
      document.dispatchEvent(new CustomEvent('changechannel', { detail: channel }));
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

  async #cacheSources(cache = true) {
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
    if (channelCount !== 0 || programmeCount !== 0) {
      return;
    }

    await this.#writeM3U();
    await this.#writeXML();
  }

  async #writeM3U() {
    // get m3u
    const channels = await fetch(this.settings['m3u-url'])
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
    if (!this.settings['xmltv-url']) {
      return;
    }

    // get xmltv
    const xmltv = await fetch(this.settings['xmltv-url'])
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

  async #initChannels() {
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
