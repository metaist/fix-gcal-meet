/**
 * @file Injected into the top-level Google Calendar context.
 * @copyright 2022 Metaist LLC
 * @license MIT
 */

"use strict";

/** Return a function that will be delayed when it runs. */
const delayed =
  (time, fn) =>
  (...args) =>
    setTimeout(() => fn(...args), time);

/**
 * Return a function that will only be called once per `time` period.
 * @see https://webdesign.tutsplus.com/tutorials/javascript-debounce-and-throttle--cms-36783
 */
const throttled = (time, fn) => {
  let paused = false;
  return (...args) => {
    if (paused) return;
    paused = true;

    setTimeout(() => {
      paused = false;
      fn(...args);
    }, time);
  };
};

let app = {
  debug: true,
  name: "fix-gcal-meet",
  lookup: {},

  /** Log a debug message to the console. */
  log: (...msg) => app.debug && console.debug(`${app.name}:`, ...msg),

  /** Initialize the app. */
  init: () => {
    const main = document.body;
    app.log("init", main);

    // We listen for the account information coming back from the `iframe`.
    window.addEventListener("message", app.onMessage);
    app.loadAccounts();

    const throttledUpdate = throttled(500, app.update);

    // Many parts of the DOM change, but the `click` event if fairly reliable.
    main.addEventListener("click", throttledUpdate);

    // Notifications can cause parts of the DOM to change when there isn't a click event.
    // @see https://github.com/adelespinasse/gcalcolor/blob/master/content.js
    const observer = new MutationObserver(throttledUpdate);
    observer.observe(main, {
      childList: true,
      attributes: false,
      subtree: true,
    });
  },

  /** Ask for the account numbers and email addresses. */
  loadAccounts: () => {
    // We need to click on the accounts button to cause the accounts `iframe` to load.
    const sel = `[aria-label^="Google Account"]`; // WARNING: brittle
    const btn = document.querySelector(sel);
    if (btn) btn.click(); // open panel

    // We need to wait a sec to close the panel.
    delayed(1000, () => {
      const btn = document.querySelector(sel);
      if (btn) btn.click(); // close panel
    })();
  },

  /** Receive account numbers and email addresses. */
  onMessage: (event) => {
    // app.log("message", event);
    if (event.data && event.data.type === "accounts") {
      app.lookup = event.data.data;
      app.log("updated lookup table", app.lookup);
      return;
    }
  },

  /** Update the button. */
  update: () => {
    // First, there must be a "Join" button. Note that this is a brittle approach because
    // the label can change (it has before) and it isn't internationalized.
    const btn = document.querySelector(`[aria-label^="Join with Google Meet"]`); // WARNING: brittle
    if (!btn) return;
    if (btn.dataset._fixed) return; // already fixed

    // Second, we need some way of getting the email address associated with the event.
    let email = app.emailFromDialog() || app.emailFromButtons();
    if (!email) return;

    // Next, we convert that to the account id number.
    const uid = app.lookup[email];
    if (!uid) return;

    // Finally, we update the button link.
    let url = btn.getAttribute("href").replace(/authuser=\d+/, `authuser=${uid}`);
    btn.setAttribute("href", url);

    btn.dataset._fixed = true; // don't fix the same button again
    app.log("button updated");
  },

  /** Return the email address in a `jslog` attribute. */
  jslogEmail: (blob) => {
    if (!blob) return;

    // We assume that the only string with an `@` in the json blob is an email address.
    let email = blob.match(/"([^"]+@[^"]+)"/)[1]; // WARNING: brittle
    if (!email) email = JSON.parse(blob.split(";")[1].split(":")[1])[1]; // WARNING: brittle
    return email;
  },

  /** Return the email address stored in the popup dialog. */
  emailFromDialog: () => {
    const dialog = document.querySelector("#xDetDlg"); // WARNING: brittle
    if (!dialog) return;

    const email = app.jslogEmail(dialog.getAttribute("jslog"));
    // if (email) app.log("email from dialog", email);
    return email;
  },

  /** Return the email associated with the RSVP buttons. */
  emailFromButtons: () => {
    // The "No" and "Maybe" buttons have the email address encoded in an opaque blob.
    let btn = document.querySelector(`[aria-label^="Respond No"]`); // WARNING: brittle
    if (!btn) document.querySelector(`[aria-label^="Respond Maybe"]`); // WARNING: brittle
    if (!btn) return; // no rsvp button

    const email = app.jslogEmail(btn.getAttribute("jslog"));
    // if (email) app.log("email from buttons", email);
    return email;
  },
};

window.onload = app.init;
