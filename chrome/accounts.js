/**
 * @file Injected into the account switcher `iframe` to get account ids.
 * @copyright 2022 Metaist LLC
 * @license MIT
 */

"use strict";

const app = {
  debug: true,
  name: "fix-gcal-meet[accounts]",

  /** Log a debug message. */
  log: (...msg) => app.debug && console.log(`${app.name}:`, ...msg),

  /** Initialize the context. */
  init: () => {
    app.log("init");

    // Switch account links have `data-au` and `data-email` attributes (WARNING: may be brittle).
    const emails = {};
    const links = [].slice.call(document.querySelectorAll("a[data-email]"));
    links.forEach((link) => (emails[link.dataset.email] = link.dataset.au));

    if (links.length && window.parent) window.parent.postMessage({ type: "accounts", data: emails }, "*");
  },
};

window.onload = app.init;
