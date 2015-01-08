"use strict";

var Update = {
	wasJustUpdated: false,

	__keepDisabled: function (event) {
		if (event.detail)
			event.preventDefault();
	},

	get installedBundle() {
		return parseInt(Settings.getItem('installedBundle'), 10);
	},

	set installedBundle(version) {
		Settings.setItem('installedBundle', parseInt(version, 10));
	},

	versions: {},

	init: function () {
		if (this.isNewInstall())
			this.installedBundle = Version.bundle;
		else
			this.performUpdate();
	},

	showRequiredPopover: function () {
		if (!BrowserWindows.all().length)
			Tabs.create('about:blank');

		ToolbarItems.showPopover();
	},

	allUpdatesCompleted: function () {
		if (!BrowserWindows.all().length)
			Tabs.create('about:blank');

		UI.event.addCustomEventListener('popoverOpened', function () {
			var poppy = new Popover.window.Poppy(0.5, 0);

			Update
				.fetchChangeLog(Version.display)
				.then(function (changeLog) {
					poppy
						.setContent(Template.create('poppy', 'change-log', {
							changeLog: changeLog,
							version: Version.display
						}))
						.show();
				});
		}, true, true);

		this.showRequiredPopover();
	},

	performUpdate: function () {
		Command.event.addCustomEventListener('UIReady', function () {
			var update;

			var didReEnable = false,
					isDisabled = window.globalSetting.disabled,
					availableUpdates = Update.versionUpdatesAvailable();

			if (!availableUpdates.length && Update.wasJustUpdated) {
				Update.wasJustUpdated = false;

				Update.allUpdatesCompleted();

				return;
			}

			for (var i = 0; i < availableUpdates.length; i++) {
				if (Update.versions[availableUpdates[i]].blocking) {
					Command.toggleDisabled(true, true);

					Command.event.addMissingCustomEventListener('willDisable', Update.__keepDisabled);
				}
			}

			for (var i = 0; i < availableUpdates.length; i++) {
				update = Update.versions[availableUpdates[i]];

				if (update.poppy) {
					Popover.window.Poppy.scripts[availableUpdates[i]] = update.poppy;

					UI.event.addCustomEventListener('popoverOpened', function (updateVersion) {
						var poppy = new Popover.window.Poppy(0.5, 0, null, updateVersion);

						poppy.updateVersion = updateVersion;

						poppy.modal().setContent(Template.create('poppy', 'update-' + updateVersion));

						poppy.show();
					}.bind(null, availableUpdates[i]), true, true);

					if (Settings.getItem('updateNotify') || Popover.visible() || update.blocking)
						Update.showRequiredPopover();

					break;
				}

				if (update.update(availableUpdates[i]) === true)
					Update.updatedToVersion(availableUpdates[i]);
				else
					break;

				if (!didReEnable) {
					didReEnable = true;
					
					Command.event.removeCustomEventListener('willDisable', Update.__keepDisabled);

					Command.toggleDisabled(isDisabled, true);
				}
			}
		}, true);
	},

	isNewInstall: function () {
		return this.installedBundle === 0;
	},

	versionUpdatesAvailable: function () {
		if (this.isNewInstall())
			return [];

		var versions =
			Object.keys(Update.versions)
				.map(function (version) {
					return parseInt(version, 10);
				})
				.filter(function (version) {
					return Update.installedBundle < version && version <= Version.bundle;
				})
				.sort();

		return versions;
	},

	updatedToVersion: function (version) {
 		version = parseInt(version, 10);

 		if (version <= this.installedBundle)
 			throw new Error('cannot update to less or same version');

 		this.wasJustUpdated = true;

		this.installedBundle = version;

		this.performUpdate();
	},

	fetchChangeLog: function (displayVersion) {
		return new Promise(function (resolve, reject) {
			$.get('http://javascript-blocker.toggleable.com/change-log/' + displayVersion.replace(/\./g, ''))
				.done(function (responseText, textStatus, request) {
					if (textStatus === 'success')
						resolve($('#sites-canvas-main-content', responseText))
					else
						reject(request.status);
				})
				.fail(function (request) {
					reject(request.status);
				});
		});
	}
};

var OKPoppyUpdate = function (poppy) {
	poppy.content
		.on('click', 'input', function () {
			poppy.close();

			Update.updatedToVersion(poppy.updateVersion);
		});
};



// Alpha 3
Update.versions[150106] = {
	blocking: false,

	poppy: OKPoppyUpdate
};

// Alpha 4
Update.versions[150107] = {
	blocking: false,

	poppy: OKPoppyUpdate
};

// Alpha 5
Update.versions[150108] = {
	blocking: false,

	update: function () {
		SettingStore.removeItem('Storage-EasyRules-$list');
		SettingStore.removeItem('Storage-EasyRules-$malware');
		SettingStore.removeItem('Storage-EasyRules-$privacy');

		return true;
	}
};



Update.init();
