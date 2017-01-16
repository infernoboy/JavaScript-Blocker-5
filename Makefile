INJECTED=js/safari.js js/promise.js js/utilities.js js/event.js js/store.js js/injected/commands.js js/injected/blocker.js js/injected/deepInject.js js/injected/notification.js js/injected/special.js js/injected/specials.js js/injected/userScript.js

LESSC="/usr/local/bin/lessc"
CAT="/bin/cat"
RM="/bin/rm"

all: clean javascript less
	@printf "JSB is ready to be built using Safari's Extension Builder.\n"

javascript:
	@printf "if (!window.JSB_INJECTED) { window.JSB_INJECTED = true;\n" > js/injected/compiled.js
	@$(CAT) $(INJECTED) >> js/injected/compiled.js
	@printf "} else { console.warn('Attempt to inject JSB more than once blocked.'); }" >> js/injected/compiled.js

	@printf "Compiled injected start script.\n"

less:
	@$(LESSC) css/injected.less css/injected.css	

	@printf "Compiled injected CSS.\n"

clean:
	@$(RM) -f js/injected/compiled.js
	@$(RM) -f css/injected.css

	@printf "Removed old compiled files.\n"
