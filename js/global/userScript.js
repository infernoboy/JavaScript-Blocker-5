"use strict";

var UserScript = {
	__updateInterval: TIME.ONE.DAY * 5,

	scripts: new Store('UserScripts', {
		save: true
	}),

	__fetch: function (store, resources) {
		store.clear();

		for (var resourceName in resources)
			if (resources.hasOwnProperty(resourceName))
				Utilities.setImmediateTimeout(function (self, store, resources, resourceName) {
					var xhr = new XMLHttpRequest(),
							bypassCache = (resources[resourceName]._contains('?') ? '&' : '?') + Date.now();

					xhr.open('GET', resources[resourceName] + bypassCache, true);

					xhr.responseType = 'arraybuffer';

					xhr.onload = function () {
						if (this.status !== 200)
							return LogError(['resource not found', store.name, resourceName]);

						var data = '',
								array = new Uint8Array(this.response);

						for (var i = 0, b = array.length; i < b; i++)
							data += String.fromCharCode(array[i]);

						store.set(resourceName, {
							data: btoa(data),
							type: this.getResponseHeader('Content-Type')
						});
					};

					xhr.onerror = function () {
						LogError(['resource load error', store.name, resourceName]);
					};

					xhr.send(null);
				}, [this, store, resources, resourceName]);
	},

	onContextMenu: function (event) {
		if (!event.userInfo)
			return;

		for (var caption in event.userInfo.menuCommand)
			event.contextMenu.appendContextMenuItem(
				'contextMenu:' +
				event.userInfo.pageID + ':' +
				event.userInfo.menuCommand[caption].sourceID + ':' +
				event.userInfo.menuCommand[caption].callbackID + ':' +
				event.userInfo.contextMenuTarget,
			caption);

	},

	onExecuteMenuCommand: function (event) {
		if (event.command._startsWith('contextMenu:')) {
			var split = event.command.split(':');

			Tabs.messageAll('executeMenuCommand', {
				pageID: split[1],
				sourceID: split[2],
				callbackID: split[3],
				contextMenuTarget: split[4]
			});
		}
	},

	forLocation: function (location, isFrame) {
		var script,
				attributes;

		var scripts = Special.__forLocation(this.scripts.data, 'user_script', location, isFrame);

		for (var namespace in scripts) {
			if (!scripts[namespace])
				continue;	

			script = this.scripts.get(namespace);
			attributes = script.getStore('attributes').all();

			if (!attributes.enabled)
				continue;

			this.update(namespace);

			scripts[namespace] = {
				attributes: script.getStore('attributes').all(),
				requirements: script.getStore('requirements').all(),
			}
		}

		return scripts;
	},

	removeRules: function (namespace, includeUserDefined) {
		var domain;

		var removeAction = [ACTION.AUTO_BLOCK_USER_SCRIPT, ACTION.AUTO_ALLOW_USER_SCRIPT],
				types = Rules.list.active.kind('user_script'),
				allTypes = types.all();

		if (includeUserDefined)
			removeAction.push(ACTION.ALLOW, ACTION.BLOCK);

		for (var ruleType in allTypes)
			for (domain in allTypes[ruleType])
				if (allTypes[ruleType][domain][namespace] && removeAction._contains(allTypes[ruleType][domain][namespace].action))
					types[ruleType](domain).remove(namespace);
	},

	canBeUpdated: function (meta) {
		return !!(meta.updateURL && meta.updateURL.length && meta.version.length && ((meta.downloadURL && meta.downloadURL.length || meta.installURL && meta.installURL.length)));
	},

	update: function (namespace) {
		var currentMeta,
				updateMeta;

		var self = this,
				now = Date.now(),
				userScript = this.scripts.get(namespace),
				attributes = userScript.get('attributes'),
				isDeveloperMode = !!attributes.get('developerMode');

		if (isDeveloperMode || (attributes.get('autoUpdate') && (now - attributes.get('lastUpdate', 0) > this.__updateInterval))) {
			if (!isDeveloperMode)
				attributes.set('lastUpdate', now);

			currentMeta = attributes.get('meta');

			this.download(attributes.get('updateURL'), !isDeveloperMode).done(function (update) {
				updateMeta = self.parse(update).parsed;

				if (currentMeta.trueNamespace === updateMeta.trueNamespace) {
					if (isDeveloperMode || (Utilities.isNewerVersion(currentMeta.version, updateMeta.version) && this.canBeUpdated(updateMeta))) {
						self.download(attributes.get('downloadURL'), !isDeveloperMode).done(function (script) {
							self.add(script, true);

							if (!isDeveloperMode)
								Tabs.messageActive('notification', {
									title: _('user_script.updated'),
									subTitle: currentMeta.name
								});
						});
					}
				} else
					LogError(['attempted to update user script, but updated name is not equal to current name.', currentMeta.trueNamespace, updateMeta.trueNamespace]);
			});
		}
	},

	download: function (url, async) {
		if (!Utilities.URL.isURL(url))
			throw new TypeError(url + ' is not a url.');

		return $.ajax({
			cache: false,
			dataType: 'text',
			async: async,
			url: url,
			timeout: 3000,
			headers: {
				'Accept': 'text/x-userscript-meta'
			}
		}).fail(function (error) {
			LogError(error);
		});
	},

	parse: function (script) {
		if (typeof script !== 'string')
			return null;

		var localKey,
				localValue;

		var lines = script.split(/\n/g),
				lineMatch = /\/\/\s@([a-z:0-9-]+)\s+([^\n]+)/i,
				parseLine = false,
				resource = null,
				metaStr = '';

		var parsed = {
			name: null,
			namespace: null,
			trueNamespace: null,
			description: '',
			exclude: [],
			excludeJSB: [],
			grant: [],
			icon: '',
			include: [],
			includeJSB: [],
			match: [],
			matchJSB: [],
			domain: [],
			require: {},
			resource: {},
			'run-at': '',
			version: ''
		};

		for (var line = 0; line < lines.length; line++) {
			if (!parseLine && /\/\/\s==UserScript==/.test(lines[line]))
				parseLine = true;
			else if (parseLine && /\/\/\s==\/UserScript==/.test(lines[line]))
				parseLine = false;
			else if (parseLine) {
				lines[line].replace(lineMatch, function (fullLine, key, value) {
					value = $.trim(value);

					if (!value.length)
						return;

					metaStr += fullLine + "\n";

					if (parsed.hasOwnProperty(key) && value.length) {
						if (typeof parsed[key] === 'string' || parsed[key] === null)
							parsed[key] = value;
						else if (key === 'resource') {
							resource = value.split(' ');

							parsed[key][resource[0]] = resource[1];
						} else if (key === 'require') {
							parsed[key][value] = value;
						} else {
							if (['exclude', 'include', 'match']._contains(key)) {
								localKey = key + 'JSB';
								localValue = '^' + value.replace(/\*\./g, '_SUBDOMAINS_').replace(/\*/g, '_ANY_')._escapeRegExp().replace(/_SUBDOMAINS_/g, '([^\\/]+\\.)?').replace(/_ANY_/g, '.*') + '$';

								if (localValue === '^.*$' && key !== 'exclude')
									parsed.domain._pushMissing('*');
								else
									parsed[localKey]._pushMissing(localValue);
							}

							parsed[key]._pushMissing(value);
						}
					} else if (value.length)
						parsed[key] = value;
				});
			}
		}

		parsed.trueNamespace = parsed.name + ':' + parsed.namespace;

		return {
			parsed: parsed,
			metaStr: metaStr
		};
	},

	exist: function (namespace) {
		return !!this.scripts.get(namespace, false);
	},

	remove: function (namespace) {
		this.removeRules(namespace, true);

		this.scripts.remove(namespace);
	},

	add: function (script, isAutoUpdate) {
		var parsed = this.parse(script),
				detail = parsed.parsed;

		if (detail.name === null || detail.namespace === null) {
			LogError('unable to add user script because it does not have a name or namespace');

			return -1;
		}

		var canBeUpdated = this.canBeUpdated(detail);

		if (isAutoUpdate && !canBeUpdated) {
			LogError('attempted to update a script, but the new version will no longer be able to auto update.');

			return -2;
		}

		var namespace = detail.trueNamespace,
				userScript = this.scripts.getStore(namespace),
				attributes = userScript.getStore('attributes');

		var newAttributes = {
			enabled: attributes.get('enabled', true),
			metaStr: parsed.metaStr,
			meta: detail,
			script: script,
			updateURL: detail.updateURL,
			downloadURL: detail.updateURL ? (detail.downloadURL || detail.installURL) : null,
			autoUpdate: canBeUpdated,
			developerMode: attributes.get('developerMode', false),
			runAtStart: (detail['run-at'] && detail['run-at'].toLowerCase()) === 'document-start',
			lastUpdate: Date.now()
		};

		var allowPages = detail.matchJSB.concat(detail.includeJSB),
				allowDomains = detail.domain;

		this.removeRules(namespace);

		for (var i = 0; i < allowPages.length; i++)
			Rules.list.active.addPage('user_script', allowPages[i], {
				rule: namespace,
				action: ACTION.AUTO_ALLOW_USER_SCRIPT
			});

		for (var i = 0; i < allowDomains.length; i++)
			Rules.list.active.addDomain('user_script', allowDomains[i], {
				rule: namespace,
				action: ACTION.AUTO_ALLOW_USER_SCRIPT
			});

		for (var i = 0; i < detail.excludeJSB.length; i++)
			Rules.list.active.addPage('user_script', detail.excludeJSB[i], {
				rule: namespace,
				action: ACTION.AUTO_BLOCK_USER_SCRIPT
			});

		setTimeout(function (self, userScript, detail) {
			// If a script was just updated, the resources and
			// requirements will always be empty if this is not delayed.

			self.__fetch(userScript.getStore('resources'), detail.resource);
			self.__fetch(userScript.getStore('requirements'), detail.require);
		}, 100, this, userScript, detail);

		attributes.clear().setMany(newAttributes);

		return true;
	}
};

Events.addApplicationListener('contextmenu', UserScript.onContextMenu);
Events.addApplicationListener('command', UserScript.onExecuteMenuCommand);
