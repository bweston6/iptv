import { Database } from '../js/models/database.js';
import { nextInteractiveElement, previousInteractiveElement } from '../js/helpers/input.js';
import { settings } from '../js/models/settings.js';

let database;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

async function init() {
  database = await Database.init();
  initInput();
  initForm();
}

function initInput() {
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case "ArrowDown":
        nextInteractiveElement(document.activeElement).focus({ 'focusVisible': true });
        break;
      case "ArrowUp":
        previousInteractiveElement(document.activeElement).focus({ 'focusVisible': true });
        break;
    }
  });
}

function initForm() {
  for (const [key, value] of settings.settings) {
    const input = document.querySelector(`[name=${key}]`);
    if (input) {
      input.value = value;
    }
  }

  const form = document.getElementById('settings-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    localStorage.clear();
    await database.clearAll();

    const formData = new FormData(e.target, e.submitter);
    for (const [key, value] of formData) {
      if (value) {
        localStorage.setItem(key, value);
      }
    }

    history.back();
  });
}
