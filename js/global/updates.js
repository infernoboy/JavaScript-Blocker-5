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

	update: function () {
		// Settings.import(SettingStore.export(), true, true);

		return true;
	}
};

// === 5.0.15 ===
Update.versions[151212] = {
	blocking: false,

	update: function () {
		Settings.import(SettingStore.export(), true, true);

		return true;
	}
};

// === 5.0.17 ===
Update.versions[160219] = {
	blocking: false,

	update: function () {
		var userScripts = UserScript.scripts.all();

		for (var userScriptNS in userScripts)
			UserScript.add(userScripts[userScriptNS].attributes.script);

		return true;
	}
};

// === 5.0.18 ===
Update.versions[160315] = {
	blocking: false,

	update: function () {
		return true;
	}
};

// === 5.0.19 ===
Update.versions[160320] = {
	blocking: false,

	update: function () {		
		return true;
	}
};

// === 5.0.20 ===
Update.versions[160410] = {
	blocking: false,

	update: function () {		
		Predefined();

		UI.event.addCustomEventListener(Popover.visible() ? 'UIReady' : 'popoverOpened', function () {
			UI.Feedback.showIntroPoppy();
		}, true);

		return true;
	}
};

// === 5.0.20.1 ===
Update.versions[160411] = {
	blocking: false,
	doNotBeg: true
};

// === 5.1.0 ===
Update.versions[160419] = {
	blocking: false,

	poppy: function (poppy) {
		poppy
			.modal()
			.showCloseButton();
		
		Poppy.event.addCustomEventListener('poppyDidClose', function (event) {
			if (event.detail === poppy) {
				event.unbind();

				Update.updatedToVersion(poppy.updateVersion);
			}
		});
	}
};

// === 5.1.3 ===
Update.versions[160827] = {
	blocking: false,

	update: function () {
		var privacy = Settings.map.filterLists.props.default.$privacy._clone();

		privacy.enabled = !Settings.getItem('filterLists', '$fanboyUltimate').enabled;

		Settings.setItem('filterLists', privacy, '$privacy');

		return true;
	}
};

// === 5.1.5 ===
Update.versions[161206] = {
	blocking: false,

	update: function () {
		var peterLowe = Settings.getItem('filterLists', '$_peterLowe');

		peterLowe.value = Utilities.makeArray(Settings.map.filterLists.props.default.$_peterLowe.value);

		Settings.setItem('filterLists', peterLowe, '$_peterLowe');

		return true;
	}
};

// === 5.1.7 ===
Update.versions[170206] = {
	blocking: false,

	update: function () {
		var alwaysBlocks = Settings.getItem('alwaysBlock');

		for (var key in alwaysBlocks)
			if (alwaysBlocks[key] === 'host')
				Settings.setItem('alwaysBlock', 'domain', key);
			else if (alwaysBlocks[key] === 'domain')
				Settings.setItem('alwaysBlock', 'host', key);

		return true;
	}
};

// === 5.2.0 ===
Update.versions[170305] = {
	blocking: false,

	update: function () {
		var currentStorage;

		var userScripts = UserScript.scripts.keys();

		for (var i = userScripts.length; i--;) {
			currentStorage = UserScript.scripts.get(userScripts[i]).get('storage');

			if (currentStorage) {
				UserScript.storage.getStore(userScripts[i]).replaceWith(currentStorage);
				UserScript.scripts.get(userScripts[i]).remove('storage');
			}
		}

		return true;
	}
};

// === 5.3.0 ===
Update.versions[180103] = {
	blocking: false,

	update: function() {
		FilterList.fetch();
	}
};

// === 5.3.2 ===
Update.versions[180526] = {
	blocking: false,

	poppy: function (poppy) {
		poppy
			.modal()
			.showCloseButton();

		$('#go-to-privacy', poppy.content).click(function (event) {
			event.preventDefault();

			UI.view.switchTo('#help-views-privacy');
			UI.view.switchTo('#main-views-help');

			poppy.close();
		});

		Poppy.event.addCustomEventListener('poppyDidClose', function (event) {
			if (event.detail === poppy) {
				event.unbind();

				Update.updatedToVersion(poppy.updateVersion);
			}
		});
	}
};
