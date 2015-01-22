"use strict";

Object._extend(Poppy.scripts, {
	'disable-menu': function (poppy) {
		poppy.content
			.on('change', '#disable-menu-for', function () {
				Settings.setItem('disableTime', parseInt(this.value, 10));
			})

			.on('click', '#disable-menu-for-disable', function () {
				globalPage.Command.toggleDisabled(true);

				globalPage.Utilities.Timer.timeout('autoEnableJSB', function () {
					globalPage.Command.toggleDisabled(false, true);
				}, Settings.getItem('disableTime'));

				poppy.close();
			});
	},

	'main-menu': function (poppy) {
		poppy.content
			.on('click', '#main-menu-about', function () {
				poppy.close();

				UI.view.switchTo('#main-views-about');
			})

			.on('click', '#main-menu-submit-feedback', function () {
				Tabs.create('mailto:JSB5Feedback@toggleable.com?subject=JSB5 Feedback');
			})

			.on('click', '#main-menu-console', function (event) {
				Poppy.closeLinksTo(poppy);

				var consolePoppy = new Poppy(event.pageX, event.pageY, false, 'console');

				consolePoppy
					.setContent(Template.create('poppy', 'console'))
					.linkTo(poppy)
					.stayOpenOnScroll()
					.show();
			});
	},

	'page-menu': function (poppy) {
		poppy.content
			.on('change', 'input[type="checkbox"]', function () {
				UI.event.addCustomEventListener('poppyDidClose', function () {
					UI.view.switchTo('#main-views-page');

					globalPage.Page.requestPageFromActive();
				}, true);
			})
	},

	'rule-menu': function (poppy) {
		poppy.content
			.on('click', '#rule-menu-open-snapshots', function () {
				Poppy.closeAll();
				
				UI.view.switchTo('#main-views-snapshot');
			})

			.on('click', '#rule-menu-import-rules-from-four', function () {
				var rules = prompt('Paste the exported rule backup below. This is obtained by clicking Rules > Backup > Export from JSB 4. You must have made a donation or unlocked features without contributing.');

				globalPage.Upgrade.importRulesFromJSB4(rules);
			})

			.on('click', '#rule-menu-delete-temporary', function () {
				globalPage.Rules.list.temporary.clear();

				Poppy.closeAll();

				Tabs.messageAll('reload');
			});
	},

	'setting-menu': function (poppy) {
		poppy.content
			.on('click', '#setting-menu-backup-export', function (event) {
				Tabs.create(Utilities.URL.createFromContent(Settings.export(), 'application/zip', true));
			})

			.on('drop', '#setting-menu-backup-import', function (event) {
				setTimeout(function (event) {
					var file = event.target.files[0];

					if (file) {
						var reader = new FileReader;

						reader.addEventListener('load', function (fileEvent) {
							if (fileEvent.target.result) {
								Settings.import(fileEvent.target.result);

								poppy.close();
							}
						});

						reader.readAsText(file);
					}
				}, 0, event);
			})

			.on('click', '#setting-menu-restore-defaults', function (event) {
				Settings.import({});

				poppy.close();
			});
	},

	'temporary-rules-menu': function (poppy) {
		poppy.content
			.on('click', '#temporary-menu-clear', function (event) {
				globalPage.Rules.list.temporary.clear();
			})

			.on('click', '#temporary-menu-make-always', function (event) {
				globalPage.Rules.list.user.rules.merge(globalPage.Rules.list.temporary.rules, true);

				globalPage.Rules.list.temporary.clear();
			})

			.on('click', '#temporary-menu-clear, #temporary-menu-make-always', function (event) {
				poppy.close();

				UI.view.switchTo('#rule-views-temporary', true);
			})
	},

	'active-rules-menu': function (poppy) {
		poppy.content
			.on('click', '#active-menu-clear', function (event) {
				globalPage.Rules.list.active.clear();
			})

			.on('click', '#active-menu-clear', function (event) {
				poppy.close();

				UI.view.switchTo('#rule-views-active', true);
			})
	},

	'easy-rules-menu': function (poppy) {
		poppy.content
			.on('click', 'a', function (event) {
				var easyList = this.parentNode.getAttribute('data-easyList');

				poppy.close();

				UI.Rules.setEasyRulesList(easyList);
			});
	},

	'user-script-storage-add': function (poppy) {
		var key = $('.user-script-storage-add-key', poppy.content).focus(),
				value = $('.user-script-storage-add-value', poppy.content);

		poppy.content
			.on('click', '.user-script-storage-add-add', function () {
				var keyValue = $.trim(key.val()),
						valueValue = $.trim(value.val());

				if (!keyValue.length || !valueValue.length)
					return keyValue.length ? value.focus() : key.focus();

				try {
					valueValue = JSON.parse(valueValue);
				} catch (e) {
					return value.focus();
				}

				var userScriptNS = UI.Settings.userScriptEdit.attr('data-userScriptNS');

				try {
					var storage = globalPage.UserScript.getStorageItem(userScriptNS);
				} catch (error) {
					return;
				}

				var result = UI.Settings.saveUserScriptEdit(this, true);

				if (result) {
					storage.set(keyValue, valueValue);

					UI.Settings.editUserScript(userScriptNS);

					poppy.close();
				}
			});
	},

	'user-script-confirm-view-switch': function (poppy) {
		poppy.content
			.on('click', 'input', function () {
				if (this.className._contains('switch-switch')) {
					$('.user-script-content', UI.Settings.userScriptEdit).removeAttr('data-blockViewSwitch');

					UI.view.switchTo(this.getAttribute('data-viewID'));
				}

				poppy.close();
			});
	},

	console: function (poppy) {
		poppy.content
			.on('change', '#console-debug-mode', function () {
				window.globalSetting.debugMode = this.checked;
			})

			.on('click', '#console-clear', function () {
				LogError.history = [];
				LogDebug.history = [];

				globalPage.LogError.history = [];
				globalPage.LogDebug.history = [];

				if (poppy.linkedTo)
					poppy.linkedTo.setContent(Template.create('poppy', 'main-menu'));

				poppy.close();
			})
			
			.on('click', '#console-report', function () {
				var messageHistory = Utilities.messageHistory();
				
				var errors = messageHistory.error.map(function (value, i) {
					return value.message + (value.stack ? "\nStack:" + value.stack : '');
				});

				var messages = ['Error Messages', '', errors.join("\n"), "\n", 'Debug Messages', '', messageHistory.debug.join("\n")];

				var tab = Tabs.create('mailto:jsbconsole@toggleable.com?subject=JSB5 Console&body=' + encodeURIComponent(messages.join("\n")));

				setTimeout(function (tab) {
					tab.close();
				}, 200, tab);
			});
	}
});
