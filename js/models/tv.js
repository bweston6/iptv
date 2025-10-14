import { Channels } from "./channels.js";

export class TV {
  channelString = "";
  channelTimeoutId = null;

  constructor(channels) {
    this.channels = channels;
  }

  static async init() {
    const channels = await Channels.init();
    return new TV(channels);
  }

  channelUp() {
    this.channels.channelUp();
  }
  channelDown() {
    this.channels.channelDown();
  }

  typeChannel(character) {
    this.channelString += character;
    document.dispatchEvent(new CustomEvent('typechannel', { detail: { number: this.channelString } }));

    if (this.channelTimeoutId) {
      clearTimeout(this.channelTimeoutId);
    }
    this.channelTimeoutId = setTimeout(() => {
      const currentChannel = this.channels.channel;
      this.channels.channel = Number(this.channelString)

      if (currentChannel === this.channels.channel) {
        document.dispatchEvent(new CustomEvent(
          'changechannel',
          { detail: { currentChannel, programme: this.channels.getCurrentProgramme(currentChannel) } }
        ));
      }

      this.channelTimeoutId = undefined;
      this.channelString = ""
    }, 1000);
  }
}
