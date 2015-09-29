"use strict";

var Update = {
	wasJustUpdated: false,

	__keepDisabled: function (event) {
		if (event.detail)
			event.preventDefault();
	},

	get installedBundle() {
		return parseFloat(Settings.getItem('installedBundle'));
	},

	set installedBundle(version) {
		Settings.setItem('installedBundle', parseFloat(version));
	},

	versions: {},

	init: function () {
		if (Update.isNewInstall())
			Update.installedBundle = Version.bundle;
		else
			Command.event.addCustomEventListener('UIReady', function () {
				if (Update.installedBundle === NaN)
					Update.installedBundle = 1;
				
				Update.performUpdate();
			}, true);
	},

	showRequiredPopover: function () {
		if (!BrowserWindows.all().length)
			Tabs.create('about:blank');

		ToolbarItems.showPopover();
	},

	allUpdatesCompleted: function () {
		UI.event.addCustomEventListener('popoverOpened', function () {
			var poppy = new Popover.window.Poppy(0.5, 0, false, 'donation-beg');

			Update
				.fetchChangeLog(Version.display)
				.finally(function (changeLog) {
					if (!Extras.isUnlockedByDonating())
						poppy.modal();

					poppy
						.setContent(Template.create('poppy', 'donation-beg', {
							changeLog: changeLog,
							version: Version.display
						}))
						.show();
				});
		}, true, true);

		if (Popover.visible())
			Update.showRequiredPopover();
	},

	performUpdate: function () {
		var update;

		var didReEnable = false,
				isDisabled = window.globalSetting.disabled,
				availableUpdates = Update.versionUpdatesAvailable();

		if (!availableUpdates.length){
			if (Update.wasJustUpdated) {
				Update.wasJustUpdated = false;

				Update.allUpdatesCompleted();
			}

			return;
		}

		var updateToVersion = availableUpdates[0],
				hasBlockingUpdate = false,
				update = Update.versions[updateToVersion];

		for (var i = availableUpdates.length; i--;)
			if (hasBlockingUpdate = (availableUpdates[i] && availableUpdates[i].blocking))
				break;

		if (hasBlockingUpdate) {
			Update.showRequiredPopover();

			Command.toggleDisabled(true, true);

			Command.event.addMissingCustomEventListener('willDisable', Update.__keepDisabled);
		}

		if (update) {
			if (update.poppy) {
				Popover.window.Poppy.scripts[updateToVersion] = update.poppy;

				UI.event.addCustomEventListener('popoverOpened', function (updateVersion) {
					var poppy = new Popover.window.Poppy(0.5, 0, null, updateVersion);

					poppy.updateVersion = updateVersion;

					poppy.modal().setContent(Template.create('poppy.update', 'update-' + updateVersion));

					poppy.show();
				}.bind(null, updateToVersion), true, true);

				if (Settings.getItem('updateNotify') || !Extras.isUnlockedByDonating() || Popover.visible() || update.blocking)
					Update.showRequiredPopover();

				return;
			}

			if (update.update(updateToVersion) === true)
				Update.updatedToVersion(updateToVersion);
			else
				return;

			if (!didReEnable) {
				didReEnable = true;
				
				Command.event.removeCustomEventListener('willDisable', Update.__keepDisabled);

				Command.toggleDisabled(isDisabled, true);
			}
		} else
			Update.updatedToVersion(updateToVersion);
	},

	isNewInstall: function () {
		return Update.installedBundle === 0;
	},

	versionUpdatesAvailable: function () {
		if (Update.isNewInstall())
			return [];

		var versions =
			Object.keys(Update.versions)
				.map(function (version) {
					return parseFloat(version);
				})

				.filter(function (version) {
					return Update.installedBundle < version && version <= Version.bundle;
				})

				.sort();

		if (!versions._contains(Version.bundle) && Update.installedBundle < Version.bundle)
			versions.push(Version.bundle);

		return versions;
	},

	updatedToVersion: function (version) {
 		version = parseFloat(version);

 		if (version <= Update.installedBundle)
 			throw new Error('cannot update to less or same version - ' + (version + '<=' + Update.installedBundle));

 		Update.wasJustUpdated = true;

		Update.installedBundle = version;

		Update.performUpdate();
	},

	fetchChangeLog: function (displayVersion) {
		return new Promise(function (resolve, reject) {
			$.get('http://jsblocker.toggleable.com/change-log/' + displayVersion.replace(/\./g, ''))
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


Update.versions[150215] = {
	blocking: false,

	update: function () {
		SettingStore.removeItem('Storage-EasyRules');

		return true;
	}
};

Update.versions[150424] = {
	blocking: false,

	poppy: function (poppy) {
		poppy.showCloseButton();
		
		UI.event.addCustomEventListener('poppyDidClose', function (event) {
			if (event.detail === poppy) {
				event.unbind();

				Update.updatedToVersion(poppy.updateVersion);
			}
		});
	}
};

Update.versions[150502] = {
	blocking: false,

	update: function () {
		Settings.setItem('useLocker', true, null, true, true);

		return true;
	}
};

Update.versions[150927] = {
	blocking: false,

	update: function () {
		for (var list in Rules.list)
			Rules.list[list].rules.saveNow();

		Snapshots.saveNow();
		UserScript.scripts.saveNow();
		Settings.__stores.saveNow();
		Rules.__FilterRules.saveNow();

		return true;
	}
};

Update.init();
