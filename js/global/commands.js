"use strict";

var Command = function (command, data, event) {
	var InternalCommand = function () {
		if (!Commands.hasOwnProperty(command))
			throw new Error('command not found - ' + command);

		if (command._startsWith('__'))
			throw new Error('cannot call commands that begin with __');

		this.event = event;

		this.isEvent = !!(event.name && event.message);
		this.data = Array.isArray(data) ? data : [data];

		Commands[command].apply(this, this.data);
	};

	Object.defineProperty(InternalCommand.prototype, 'message', {
		get: function () {
			if (this.isEvent)
				return this.event.message;

			return null;
		},
		set: function (message) {
			if (this.isEvent)
				this.event.message = message;
			else if (Utilities.Type.isFunction(this.event))
				this.event(message);
		}
	});

	var Commands = {
		__storage: function (isSet, detail) {
			if (!UserScript.exist(detail.namespace))
				throw new Error(detail.namespace + ' does not exist.');

			if (typeof detail.key !== 'string' || !detail.key.length)
				throw new TypeError(detail.key + ' is not a string.');

			var storage = UserScript.scripts.getStore(detail.namespace).getStore('storage');

			if (isSet)
				storage.set(detail.key, detail.value, true);
			else
				storage.remove(detail.key);
		},

		logError: function (error) {
			if (typeof error.message === 'string') {
				if (this.event.target.url !== error.source)
					LogError([error.source, 'via', event.target.url]);
				else
					LogError(event.target.url);

				LogError(error.message, '--------------');
			}
		},

		bounce: function () {
			MessageTarget(this.event, this.event.message.command, this.event.message.detail);
		},

		canLoadResource: function (resource) {
			var resource = new Resource(resource.kind, resource.pageLocation, resource.source, resource.isFrame, resource.unblockable);

			this.message = resource.canLoad();
		},

		globalInfo: function () {
			this.message = {
				disabled: {
					cache: true,
					value: false,
				},

				debugMode: {
					cache: true,
					value: false
				},

				topPageURL: {
					cache: true,
					value: this.event.target.url
				}
			};
		},

		getSetting: function (setting, getJSON, defaultValue) {
			if (getJSON)
				this.message = Settings.getJSON(setting, defaultValue);
			else
				this.message = Settings.getItem(setting, defaultValue);
		},

		enabledSpecials: function (detail) {
			this.message = Special.forLocation(detail.location, detail.isFrame);
		},

		enabledUserScripts: function (detail) {
			this.message = UserScript.forLocation(detail.location, detail.isFrame);
		},

		receivePage: function (thePage) {
			var page = new Page(thePage, this.event.target);

			if (thePage.isFrame) {
				var tab = this.event.target,
						self = this;
				
				var pageParent = Page.pages.findLast(function (pageID, parent, store) {
					if (parent.top && parent.tab === tab) {
						parent.addFrame(page);

						return true;
					}
				});

				if (!pageParent)
					if (page.retries < 5)
						return Utilities.Timer.timeout('WaitForParent-' + page.info.id, function (page) {
							page.retries++;

							MessageTarget({
								target: tab
							}, 'sendPage');
						}, 250, [page]);
					else
						return LogError(['frame does not seem to have a parent', page.info.id]);

				Page.active(function (activePage) {
					activePage.badge('blocked');

					UI.renderPopover(activePage);
				});
			} else {
				page.badge('blocked');

				UI.renderPopover(page);
			}
		},

		storageSetItem: function (detail) {
			return this.__storage(true, detail);
		},

		storageRemoveItem: function (detail) {
			return this.__storage(false, detail);
		},

		verifyScriptSafety: function (script) {
			try {
				var fn = (new Function("return function () {\n" + script + "\n}"))();

				fn = undefined;

				this.message = true;
			} catch (error) {
				this.message = false;
			}
		}
	};

	new InternalCommand();

	InternalCommand = Commands = command = data = event = undefined;
};

Command.messageReceived = function (event) {
	if (!event.name)
		throw new Error('invalid message');

	var command = (event.name === 'canLoad') ? event.message.command : event.name;

	Command(command, event.message ? (event.message.data || event.message) : null, event);
};

Events.addApplicationListener('message', Command.messageReceived);