export class Settings {
  constructor(settings) {
    this['m3u-url'] = settings['m3u-url'];
  }

  get settings() {
    return Object.entries(this);
  }
}

export const settings = new Settings({
  'm3u-url': localStorage.getItem('m3u-url')
});
