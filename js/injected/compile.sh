#!/bin/bash
cd "/Users/Travis/Documents/Extensions/JS Blocker/JavaScript Blocker 5.git.safariextension/js/"

echo -n > injected/compiled.js

# echo "console.time('JSB Injected');" > injected/compiled.js

/bin/cat safari.js promise.js utilities.js event.js store.js injected/commands.js injected/blocker.js injected/deepInject.js injected/special.js injected/specials.js injected/userScript.js >> injected/compiled.js

# echo "console.timeEnd('JSB Injected');" >> injected/compiled.js
