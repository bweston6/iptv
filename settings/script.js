import { settings } from '../models/settings.js';

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

function init() {
  for (const [key, value] of settings.settings) {
    const input = document.querySelector(`[name=${key}]`);
    if (input) {
      input.value = value;
    }
  }

  const form = document.getElementById('settings-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    localStorage.clear();

    const formData = new FormData(e.target, e.submitter);
    for (const [key, value] of formData) {
      localStorage.setItem(key, value);
    }

    window.location.href = "../";
  });
}
