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
		
		Poppy.event.addCustomEventListener('poppyDidClose', function (event) {
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

// === 5.0.12 ===
Update.versions[151104] = {
	blocking: false,

	update: function (updateVersion) {
		if (!('onwebkitmouseforcewillbegin' in document.createElement('div')))
			return true;

		var didDetectForce = false;

		UI.event.addCustomEventListener('pageDidRender', function (event) {
			var kindHeader = $('.page-host-kind:first h4', UI.Page.view);

			if (kindHeader.length) {
				event.unbind();

				var forceClickDetectionPoppy = new Popover.window.Poppy(0.5, 0, true);

				forceClickDetectionPoppy
					.setContent('<h3 class="jsb-centered">Force Touch Trackpad Detection</h3><p class="jsb-info jsb-readable">Please click normally anywhere in the popover.</p>')
					.modal()
					.show();

				$(Popover.window.document.body).one('mousedown', function () {
					if (didDetectForce)
						return;

					didDetectForce = 0;

					forceClickDetectionPoppy.close();

					Update.updatedToVersion(updateVersion);
				});

				$(Popover.window.document.body).one('webkitmouseforcewillbegin', function () {
					if (didDetectForce || didDetectForce === 0)
						return;

					didDetectForce = true;

					forceClickDetectionPoppy.close();

					var kindHeaderPosition = kindHeader.offset(),
							poppy = new Popover.window.Poppy(Math.floor(kindHeaderPosition.left), Math.floor(kindHeaderPosition.top + 10), true);

					poppy
						.setContent(Template.create('poppy.update', 'update-151027-kind-headers'))
						.modal(true)
						.showCloseButton()
						.show();

					Poppy.event.addCustomEventListener('poppyWillClose', function (event) {
						if (event.detail === poppy) {
							event.preventDefault();
							event.unbind();

							var pageItemPosition = $('.page-host-item:first', UI.Page.view).offset();

							poppy
								.changePosition(Math.floor(pageItemPosition.left), Math.floor(pageItemPosition.top + 8))
								.setContent(Template.create('poppy.update', 'update-151027-page-items'));

							Poppy.event.addCustomEventListener('poppyWillClose', function (event) {
								if (event.detail === poppy) {
									event.preventDefault();
									event.unbind();

									var hostCountPosition = $('.page-host-host-count:first', UI.Page.view).offset();

									poppy
										.changePosition(Math.floor(hostCountPosition.left + 1), Math.floor(hostCountPosition.top + 5))
										.setContent(Template.create('poppy.update', 'update-151027-host-count'));

									Poppy.event.addCustomEventListener('poppyWillClose', function (event) {
										if (event.detail === poppy) {
											event.unbind();

											Update.updatedToVersion(updateVersion);
										}
									});
								}
							});
						}
					});
				});
			}
		});
	}
};

// === 5.0.12a ===
Update.versions[151104.1] = {
	blocking: false,
	doNotBeg: true
};

// === 5.0.13 ===
Update.versions[151105] = {
	blocking: false,

	update: function (updateVersion) {
		Settings.import(SettingStore.export(), true, true);

		return true;
	}
};

// === 5.0.15 ===
Update.versions[151212] = {
	blocking: false,

	update: function (updateVersion) {
		Settings.import(SettingStore.export(), true, true);

		return true;
	}
};

// === 5.0.17 ===
Update.versions[160219] = {
	blocking: false,

	update: function (updateVersion) {
		var userScripts = UserScript.scripts.all();

		for (var userScriptNS in userScripts)
			UserScript.add(userScripts[userScriptNS].attributes.script);

		return true;
	}
};

// === 5.0.18 ===
Update.versions[160315] = {
	blocking: false,

	update: function (updateVersion) {
		FilterList.fetch();

		return true;
	}
};


// === 5.0.19 ===
Update.versions[160320] = {
	blocking: false,

	update: function (updateVersion) {
		Resource.canLoadCache.clear();

		Predefined();
		
		FilterList.fetch();

		return true;
	}
};
