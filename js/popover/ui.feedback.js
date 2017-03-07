/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

UI.Feedback = {
	lastValue: '',

	showIntroPoppy: function () {
		var introPoppy = new Poppy(0.5, 0, true);

		introPoppy
			.modal()
			.setContent(Template.create('poppy.feedback', 'feedback-intro'))
			.showCloseButton()
			.show();
	},

	showFeedbackPoppy: function (message) {
		var feedbackPoppy = new Poppy(0.5, 0, true, 'feedback');

		feedbackPoppy
			.modal()
			.setContent(Template.create('poppy.feedback', 'feedback', {
				message: message || UI.Feedback.lastValue
			}))
			.showCloseButton()
			.show();
	}
};
