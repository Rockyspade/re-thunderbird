/*
 * Copyright Adam Pritchard 2012
 * MIT License : http://adampritchard.mit-license.org/
 */

"use strict";
/*global chrome:false, OptionsStore:false, markdownRender:false,
  htmlToText:false, marked:false, hljs:false*/
/*jshint devel:true*/

/*
 * Chrome background script.
 */

// On each load, check if we should show the options/changelist page.
window.addEventListener('load', function() {
    OptionsStore.get(function(options) {
      var appDetails = chrome.app.getDetails();

      // Have we been updated?
      if (options['last-version'] !== appDetails.version) {
        var optionsUrl = appDetails.options_page;

        // If this is an upgrade, open the options page in changelist mode
        if (options['last-version']) {
          optionsUrl += '?prevVer=' + options['last-version'];
        }

        // Open our options page
        chrome.tabs.create({ url: optionsUrl });

        // Update out last version
        OptionsStore.set({ 'last-version': appDetails.version });
      }
    });
  }, false);

// Create the context menu that will signal our main code.
chrome.contextMenus.create({
  contexts: ['editable'],
  title: 'Empfangsbestätigung',
  onclick: function(info, tab) {
    chrome.tabs.sendRequest(tab.id, {action: 'context-click'});
  }
});

// Handle rendering requests from the content script.
// See the comment in markdown-render.js for why we do this.
chrome.extension.onRequest.addListener(function(request, sender, responseCallback) {
  // The content script can load in a not-real tab (like the search box), which
  // has a tab.id of -1. We should just ignore these pages.
  if (sender.tab.id < 0) {
    return;
  }

  if (request.action === 'render') {
    OptionsStore.get(function(prefs) {
      responseCallback({
        html: markdownRender(
          prefs,
          htmlToText,
          marked,
          hljs,
          request.html,
          document,
          sender.tab.url),
        css: (prefs['main-css'] + prefs['syntax-css'])
      });
    });
  }
  else if (request.action === 'get-options') {
    OptionsStore.get(function(prefs) { responseCallback(prefs); });
  }
  else if (request.action === 'show-toggle-button') {
    if (request.show) {
      chrome.browserAction.enable(sender.tab.id);
    }
    else {
      chrome.browserAction.disable(sender.tab.id);
    }
  }
  else {
    console.log('unmatched request action');
    console.log(request.action);
    throw 'unmatched request action: ' + request.action;
  }
});

// Add the browserAction (the button in the browser toolbar) listener.
chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.sendRequest(tab.id, {action: 'button-click'});
});
