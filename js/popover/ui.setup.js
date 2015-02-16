"use strict";

UI.Setup = {
	init: function () {
		UI.event.addCustomEventListener('popoverOpened', UI.Setup.popoverOpened);

		if (Settings.getItem('setupComplete'))
			return;

		if (!Settings.getItem('installID'))
			Settings.setItem('installID', Utilities.Token.generate() + '-' + Version.display + '-' + Version.bundle);

		UI.Setup.view = $('#main-views-setup', UI.view.views);

		Template.load('setup');

		UI.Setup.view.append(Template.create('setup', 'setup-container'));

		UI.view.switchTo('#main-views-setup');

		UI.event.addCustomEventListener('viewWillSwitch', UI.Setup.preventViewSwitch);

		UI.Setup.view
			.on('click', '#mark-setup-complete', UI.Setup.complete);
	},

	complete: function () {
		Settings.setItem('setupComplete', true);

		UI.view.switchTo('#main-views-page');

		UI.Setup.view.empty();

		Template.unload('setup');
	},

	preventViewSwitch: function (event) {
		if (event.detail.to.id._startsWith('#main-views')) {
			if (!Settings.getItem('setupComplete'))
				event.preventDefault();
			else
				event.unbind();
		}
	},

	popoverOpened: function () {
		if (!Settings.passwordIsSet() && !Poppy.poppyWithScriptNameExist('set-lock-password'))		
			Settings.map.setLockPassword.props.onClick(null, true);
	}
};

document.addEventListener('DOMContentLoaded', UI.Setup.init, true);
