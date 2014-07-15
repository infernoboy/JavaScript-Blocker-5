#!/bin/bash
cd "/Users/Travis/Documents/Extensions/JS Blocker/JavaScript Blocker 5.git.safariextension/js/"

/bin/cat safari.js promise.js utilities.js event.js store.js injected/commands.js injected/blocker.js injected/deepInject.js injected/special.js injected/specials.js injected/userScript.js > injected/compiled.js
