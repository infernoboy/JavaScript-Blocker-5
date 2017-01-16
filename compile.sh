#!/bin/bash

MAIN_DIR="$PWD"

cd "$MAIN_DIR/js/"

echo -n > injected/compiled.js

echo "if (!window.JSB_INJECTED) { window.JSB_INJECTED = true;" > injected/compiled.js
echo >> injected/compiled.js

/bin/cat safari.js promise.js utilities.js event.js store.js injected/commands.js injected/blocker.js injected/deepInject.js injected/notification.js injected/special.js injected/specials.js injected/userScript.js >> injected/compiled.js

echo "} else { console.warn('Attempt to inject JSB more than once blocked.'); }" >> injected/compiled.js

cd "$MAIN_DIR/css"

/usr/local/bin/lessc injected.less injected.css
