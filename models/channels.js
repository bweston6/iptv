export class Channels {
  #channel = undefined;

  constructor() {
    this.channels = JSON.parse(localStorage.getItem('channels'));
  }

  static async init(settings) {
    const channels = new Channels();

    if (!channels.channels || !channels.channels.length) {
      channels.channels = await channels.#getChannelsFromSettings(settings)
      localStorage.setItem('channels', JSON.stringify(channels.channels));
    }
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

  async #getChannelsFromSettings(settings) {
    return fetch(settings['m3u-url'])
      .then(response => response.text())
      .then(text => this.#parseM3U(text));
  }

  #parseM3U(m3u) {
    const regex = new RegExp('^#EXTINF:.*?(?:tvg-chno="(?<number>\\d+)")?,(?<name>.*)\\n(?<stream>.*)', 'gm')
    const tracks = Array.from(m3u.matchAll(regex)).map((track) => track.groups);
    return tracks;
  }
}
