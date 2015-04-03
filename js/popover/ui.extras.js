"use strict";

UI.Extras = {
	showUnlockPrompt: function () {
		var poppy = new Poppy(0.5, 0, true, 'extras-unlock-prompt');

		poppy
			.modal()
			.showCloseButton()
			.setContent(Template.create('poppy', 'extras-unlock-prompt', {
				trialExpired: !Extras.isActive() && !Extras.Trial.isActive(),
				trialRemaining: Extras.Trial.isActive() ? Extras.Trial.remainingTime() : false
			}))
			.show();
	},

	checkTrialEndedNotification: function () {
		if (Extras.Trial.endedNotificationRequired() && !Poppy.poppyWithScriptNameExist('extras-unlock-prompt')) {
			Extras.Trial.ended();

			UI.Extras.showUnlockPrompt();
		}
	}
};

UI.event.addCustomEventListener('popoverOpened', UI.Extras.checkTrialEndedNotification);
