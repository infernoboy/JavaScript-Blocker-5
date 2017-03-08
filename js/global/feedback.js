/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

var Feedback = {
	__feedbackURL: 'https://imac.toggleable.com:8443/jsblocker/feedback.php',
	__lastSubmissionTime: 0,

	getSubmittableSettings: function () {
		return Utilities.encode(Settings.export({ exportSettings: true }, ['Storage-StoreSettings']));
	},

	useSubmittedSettings: function (settings) {
		Settings.import(Utilities.decode(settings), true);
	},

	getConsoleMessages: function () {
		var messageHistory = Utilities.messageHistory();
		
		var errors = messageHistory.error.map(function (value) {
			return value.message.join(' ').replace(/<br>/g, "\n") + (value.stack ? "\n\t\tStack:" + value.stack : '');
		});

		var messages = ['Error Messages', '', errors.join("\n----------\n").replace(/<br>/g, "\n"), "\n", 'Debug Messages', '', messageHistory.debug.join("\n----------\n").replace(/<br>/g, "\n")];

		return messages.join("\n");
	},

	createFeedbackData: function (message, email) {
		return {
			email: email.substr(0, 200),
			message: message.substr(0, 5000),
			displayVersion: Version.display,
			bundleID: Version.bundle,
			userAgent: window.navigator.userAgent,
			console: Feedback.getConsoleMessages(),
			installID: Settings.getItem('installID'),		
			settings: Feedback.getSubmittableSettings()
		};
	},

	submitFeedback: function (message, email) {
		if (Date.now() < Feedback.__lastSubmissionTime + (TIME.ONE.MINUTE * 5))
			return Promise.reject(false);

		Feedback.__lastSubmissionTime = Date.now();

		Settings.setItem('feedbackEmail', email);

		return CustomPromise(function (resolve, reject) {
			$.post(Feedback.__feedbackURL, Feedback.createFeedbackData(message, email)).then(function (result) {
				if (result !== '1')
					reject(result);
				else
					resolve();
			}, function (error) {
				reject(error);
			});
		});
	}
};
