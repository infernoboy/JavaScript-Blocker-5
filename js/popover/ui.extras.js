/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

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

	checkTrialEndedNotification: function (event) {
		UI.onReady(function () {
			if (Extras.Trial.endedNotificationRequired() && !Poppy.poppyWithScriptNameExist('extras-unlock-prompt')) {
				globalPage.Update.showRequiredPopover();

				Extras.Trial.ended();

				UI.Extras.showUnlockPrompt();

				if (event.type === 'pageDidBadge')
					event.unbind();
			}
		});
	}
};

UI.event.addCustomEventListener('popoverOpened', UI.Extras.checkTrialEndedNotification);
UI.event.addCustomEventListener('pageDidBadge', UI.Extras.checkTrialEndedNotification);
