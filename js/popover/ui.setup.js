"use strict";

UI.Setup = {
	init: function () {
		if (Settings.getItem('setupComplete'))
			return;

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
	}
};

document.addEventListener('DOMContentLoaded', UI.Setup.init, true);
