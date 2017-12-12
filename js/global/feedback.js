/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

var Feedback = {
	__feedbackURL: 'https://hero.toggleable.com/jsblocker/feedback.php',
	__lastSubmissionTime: 0,

	getSubmittableSettings: function () {
		return CustomPromise(function (resolve) {
			Settings.export({ exportSettings: true }, ['Storage-StoreSettings'], true).then(function (settings) {
				resolve(Utilities.encode(settings));
			});
		});
	},

	useSubmittedSettings: function (settings) {
		Settings.import(Utilities.decode(settings), true);
	},

	getConsoleMessages: function () {
		var messageHistory = Utilities.messageHistory();

		/* eslint-disable */
		
		var errors = messageHistory.error.map(function (value) {
			return value.message.join(' ').replace(/<br>/g, "\n") + (value.stack ? "\n\t\tStack:" + value.stack : '');
		});

		var messages = ['Error Messages', '', errors.join("\n----------\n").replace(/<br>/g, "\n"), "\n", 'Debug Messages', '', messageHistory.debug.join("\n----------\n").replace(/<br>/g, "\n")];

		return messages.join("\n");

		/* eslint-enable */
	},

	createFeedbackData: function (message, email) {
		return CustomPromise(function (resolve) {
			Feedback.getSubmittableSettings().then(function (settings) {
				resolve({
					email: email.substr(0, 200),
					message: message.substr(0, 5000),
					displayVersion: Version.display,
					bundleID: Version.bundle,
					userAgent: window.navigator.userAgent,
					console: Feedback.getConsoleMessages(),
					installID: Settings.getItem('installID'),		
					settings: settings
				});
			});
		});
	},

	submitFeedback: function (message, email) {
		if (Date.now() < Feedback.__lastSubmissionTime + (TIME.ONE.MINUTE * 5))
			return CustomPromise.reject(false);

		Feedback.__lastSubmissionTime = Date.now();

		Settings.setItem('feedbackEmail', email);

		return CustomPromise(function (resolve, reject) {
			Feedback.createFeedbackData(message, email).then(function (feedbackData) {
				$.post(Feedback.__feedbackURL, feedbackData).then(function (result) {
					if (result !== '1')
						reject(result);
					else
						resolve();
				}, function (error) {
					reject(error);
				});
			});
		});
	}
};
