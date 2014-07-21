if(false) {
Handler.globalMessageReceived = function (event) {
	if (event.message)
		try {
			event.message = JSON.parse(event.message);
		} catch (e) {}

	switch (event.name) {
		case 'setting':
			settings[event.message[0]] = event.message[1];
		break;

		case 'notification':
			if (Utilities.Page.isTop) {
				if (event.message[1] === 'JavaScript Blocker Update') {
					if (window.showedUpdateNotification)
						break;
					else
						window.showedUpdateNotification = 1;
				}

				Special.executeAction('alert_dialogs', {
					strings: { 'Alert': _('Alert'), 'Close': _('Close'), 'via frame': _('via frame') },
					data: [event.message[0], event.message[1], 1, event.message[2]]
				});
			}
		break;

		case 'topHandler':
			if (Utilities.Page.isTop) {				
				document.dispatchEvent(new CustomEvent(TOKEN.TOP + TOKEN.EVENT, {
					detail: {
						token: TOKEN.injectedScript.genericSpecial,
						topHandler: event.message
					}
				}));
			}
		break;

		case 'commanderCallback':
			sendCallback(event.message.key, event.message.callback, event.message.result);
		break;

		case 'executeMenuCommand':
			if (event.message.pageToken === TOKEN.PAGE)
				sendCallback(event.message.scriptToken, event.message.callback, {});
		break;

		case 'loadElementsOnce':
			var pls = document.querySelectorAll('.jsblocker-placeholder');
	
			for (var i = 0; pls[i]; i++) {
				var ev = document.createEvent('MouseEvents');
				
				ev.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);

				pls[i].dispatchEvent(ev);
			}
		break;
	}
};
}
