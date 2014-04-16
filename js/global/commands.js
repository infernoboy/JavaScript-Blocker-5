"use strict";

var Command = function (command, data, event) {
	var InternalCommand = function () {
		if (!this.commands.hasOwnProperty(command))
			throw new Error('command not found - ' + command);

		if (command._startsWith('__'))
			throw new Error('cannot call commands that begin with __');

		this.event = event;

		this.isEvent = !!(event.name && event.message);

		this.commands[command].apply(this, Array.isArray(data) ? data : [data]);
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

	InternalCommand.prototype.storage = function (isSet, detail) {
		if (!UserScript.exist(detail.namespace))
			throw new Error(detail.namespace + ' does not exist.');

		if (typeof detail.key !== 'string' || !detail.key.length)
			throw new TypeError(detail.key + ' is not a string.');

		var storage = UserScript.scripts.getStore(detail.namespace).getStore('storage');

		if (isSet)
			storage.set(detail.key, detail.value);
		else
			storage.remove(detail.key);
	};

	InternalCommand.prototype.sendCallback = function (sourceID, callbackID, result) {		
		MessageTarget(this.event, 'executeCommanderCallback', {
			sourceID: sourceID,
			callbackID: callbackID,
			result: result
		});
	},

	InternalCommand.prototype.commands = {
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
			var resource = new Resource(resource.kind, resource.pageLocation, resource.source, resource.isFrame, resource.unblockable, resource.meta);

			this.message = resource.canLoad();
		},

		globalSetting: function (setting) {
			Log('OK', Settings.getJSON('enabledKinds'));

			var settings = {
				disabled: {
					cache: true,
					value: false,
				},

				debugMode: {
					cache: true,
					value: true
				},

				enabledKinds: {
					cache: true,
					value: Settings.getJSON('enabledKinds')
				}
			};

			this.message = setting ? settings[setting] : settings;
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
				var self = this,
						tab = this.event.target;
				
				var pageParent = Page.pages.findLast(function (pageID, parent, store) {
					if (parent.isTop && parent.tab === tab) {
						parent.addFrame(page);

						return true;
					}
				});

				if (!pageParent)
					if (page.retries < 2)
						return Utilities.Timer.timeout('WaitForParent' + page.info.id, function (page) {
							page.retries++;

							Page.requestPage({
								target: tab
							});
						}, 500, [page]);
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
			return this.storage(true, detail);
		},

		storageRemoveItem: function (detail) {
			return this.storage(false, detail);
		},

		verifyScriptSafety: function (script) {
			try {
				var fn = (new Function("return function () {\n" + script + "\n}"))();

				fn = undefined;

				this.message = true;
			} catch (error) {
				this.message = false;
			}
		},

		XMLHttpRequest: function (detail) {
			var self = this,
					meta = detail.meta;

			var done = function (action, response, status, request) {
				var result = {
					callbackID: detail.callbackID,
					action: action,

					response: {
						readyState: request.readyState,
						responseHeaders: (function (headers) {
							var line;

							var lines = headers.split(/\n/),
									headerList = {};

							for (var i = 0; i < lines.length; i++) {
								line = lines[i].split(': ');
								
								if (line[0].length)
									headerList[line.shift()] = line.join(': ');
							}

							return headerList;
						})(request.getAllResponseHeaders ? request.getAllResponseHeaders() : ''),

						responseText: response,
						status: request.status,
						statusText: status,
						lengthComputable: request.lengthComputable,
						loaded: request.loaded,
						total: request.total
					}
				};

				if (meta.async || action === 'onprogress' || action === 'XHRComplete')
					self.sendCallback(detail.sourceID, detail.callbackID, result);
				else
					self.message = result;
			};

			meta.async = !meta.synchronous;

			if (meta.async)
				this.message = false;

			meta.xhr = function () {
				var xhr = new XMLHttpRequest();

				xhr.upload.addEventListener('progress', function (event) {
					xhr.lengthComputable = event.lengthComputable;
					xhr.loaded = event.loaded;
					xhr.total = event.total;

					done('onprogress', '', '', xhr);
				});

				xhr.addEventListener('progress', function (event) {
					xhr.lengthComputable = event.lengthComputable;
					xhr.loaded = event.loaded;
					xhr.total = event.total;

					done('onprogress', '', '', xhr);
				});

				xhr.addEventListener('loadend', function (event) {
					done('XHRComplete', '', '', xhr);
				});

				return xhr;
			};

			meta.beforeSend = (function (headers) {
				return function (req) {
					for (var header in headers)
						req.setRequestHeader(header, headers[header]);
				};
			})(meta.headers ? meta.headers : {});

			meta.cache = !meta.ignoreCache;

			meta.success = function (response, status, request) {
				done('onload', response, status, request);
			};

			meta.type = meta.method || meta.type || 'GET';

			meta.error = function (request, status, response) {
				if (response === 'timeout')
					done('ontimeout', response, status, request);
				else if (response === 'abort')
					done('onabort', response, status, request);
				else
					done('onerror', res.message ? res.message : response, status, request);
			};

			meta.dataType = 'text';

			$.ajax(meta);
		}
	};

	new InternalCommand();

	InternalCommand = command = data = event = undefined;
};

Command.messageReceived = function (event) {
	if (!event.name)
		throw new Error('invalid message');

	var command = (event.name === 'canLoad') ? event.message.command : event.name;

	Command(command, event.message ? (event.message.data || event.message) : null, event);
};

Events.addApplicationListener('message', Command.messageReceived);