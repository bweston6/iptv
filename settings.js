export default class Settings {
  constructor(settings) {
    this['m3u-url'] = settings['m3u-url'];
  }

  get settings() {
    return Object.entries(this);
  }
}
