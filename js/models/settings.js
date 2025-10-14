export class Settings {
  constructor(settings) {
    this['m3u-url'] = settings['m3u-url'];
    this['xmltv-url'] = settings['xmltv-url'];
  }

  get settings() {
    return Object.entries(this);
  }
}

export const settings = new Settings({
  'm3u-url': localStorage.getItem('m3u-url'),
  'xmltv-url': localStorage.getItem('xmltv-url')
});

function checkSettings(settings) {
  if (window.location.pathname == '/settings/index.html') {
    // nothing to do already in settings
    return;
  }

  if (!settings['m3u-url']) {
    window.location.href = './settings/index.html';
    return;
  }

  if (settings['xmltv-url']) {
    document.querySelector('[aria-label="guide"]')?.classList.remove('hidden');
  }
}

checkSettings(settings);
