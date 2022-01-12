"use strict";

let app = {
  debug: true,
  name: "fix-gcal-meet",
  lookup: {},

  log: (...msg) => app.debug && console.log(...msg),

  init: () => {
    // The accounts panel has all the accounts you're currently logged into.
    let account = document.querySelector(`[aria-label="Account Information"]`);
    let links = [].slice.call(account.querySelectorAll("a")).filter((a) => a.text.indexOf("@") > 0);

    links.forEach((link) => {
      // The link itself has the `authuser` query parameter, but the corresponding email address
      // is a bit further down in one of the grandchildren DOM nodes.
      let uid = link.getAttribute("href").split("authuser=")[1];
      let email = link.querySelector("div + div:last-child").innerText; // WARNING: maybe brittle
      app.lookup[email] = uid;
      app.log(`${app.name}: ${uid}: ${email}`);
    });

    // We listen for all click events on the body because other parts of this app (e.g., `main`)
    // are reloaded under conditions we can't reliably detect. We also insert a small delay after
    // the click to give the meeting information panel to pop up.
    let main = document.body;
    main.addEventListener("click", () => setTimeout(app.click, 500));
    app.log(`${app.name}: init`, main);
  },

  click: () => {
    app.log(`${app.name}: click`);

    // You can respond "Yes", "No", or "Maybe" to an event.
    // The choices you **didn't select** have the account email address encoded
    // in an opaque JSON blob. Since this event is on your calendar, you probably
    // didn't respond "No", so we look there.
    let nobtn = document.querySelector(`[aria-label="Respond No"]`);
    if (!nobtn) return;

    // We assume that the only email address will be encoded as a JSON string with quotes.
    let blob = nobtn.getAttribute("jslog");
    let email = blob.match(/"([^"]+@[^"]+)"/)[1];
    // let email = JSON.parse(blob.split(";")[1].split(":")[1])[1]; // Alternative parsing.
    let uid = app.lookup[email];

    let btn = document.querySelector(`[aria-label^="Join with Google Meet"]`);
    if (!btn || uid === undefined) return;

    let url = btn.getAttribute("href").replace(/authuser=\d+/, `authuser=${uid}`);
    btn.setAttribute("href", url);
    app.log(`${app.name}: updated`);
  },
};

window.onload = app.init;
