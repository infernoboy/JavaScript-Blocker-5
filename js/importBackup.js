/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

var ImportBackup = {
	init: function () {
		ImportBackup.data = JSON.parse(Utilities.decode(window.location.hash.substr(1)));

		ImportBackup.localize();

		$('#import-backup-file').change(function (event) {
			setTimeout(function (event) {
				var file = event.target.files[0];

				if (file) {
					var reader = new FileReader;

					reader.addEventListener('load', function (fileEvent) {
						if (fileEvent.target.result) {
							GlobalPage.message('importBackup', {
								backup: Utilities.encode(fileEvent.target.result),
								clearExisting: $('#import-backup-clear').is(':checked')
							});

							window.close();
						}
					});

					reader.readAsText(file);
				}
			}, 0, event);
		});
	},

	localize: function () {
		document.title = ImportBackup.data.title;

		$('#import-backup-title').text(ImportBackup.data.title);
		$('#import-backup-instructions').text(ImportBackup.data.instructions);
		$('#import-backup-clear + label').text(ImportBackup.data.clearBeforeImport).prev().prop('checked', ImportBackup.data.shouldClearSettings);
	}
};

document.addEventListener('DOMContentLoaded', ImportBackup.init, true);
