/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

function FilterList (listName, listURL, humanName) {
	if (!Rules.list[listName])
		throw new Error(listName + ' is not a known FilterList.');
	
	FilterList.__updating++;

	this.name = listName;
	this.humanName = humanName;
	this.url = listURL;
	this.valid = true;

	this.download().done(this.process.bind(this));
}

FilterList.__cancel = 0;
FilterList.__updating = 0;
FilterList.__updateInterval = TIME.ONE.DAY;
FilterList.__addQueue = {};

FilterList.promiseWorker = new PromiseWorker('../js/global/filterlist-worker.js');

FilterList.executeQueue = function () {
	Utilities.Timer.timeout('addFilterListsRules', function () {
		var promise = Promise.resolve();

		for (var listName in FilterList.__addQueue)
			if (Rules.list[listName])
				promise = promise.then(function (listName) {
					Rules.list[listName].clear();
					
					return Rules.list[listName].addMany(FilterList.__addQueue[listName].rules);
				}.bind(null, listName), function (err) {
					LogError(err);
				});
		
		promise.then(function () {
			FilterList.__addQueue = {};
		});
	}, 5000);
};

FilterList.cancelUpdate = function () {
	FilterList.__cancel = parseInt(FilterList.__updating, 10);
};

FilterList.updateCheck = function () {
	if (Settings.getItem('setupComplete') && Date.now() - Settings.getItem('FilterListLastUpdate') > FilterList.__updateInterval)
		FilterList.fetch();
};

FilterList.fetch = function () {
	Predefined();

	var lists = Settings.getItem('filterLists');

	for (var list in lists)
		if (lists[list].enabled)
			new FilterList(list, lists[list].value[0], lists[list].value[1]);
		else if (Rules.__FilterRules.keyExist(list))
			Rules.__FilterRules.remove(list);
};

FilterList.prototype.doneWithRules = function (rules) {
	if (FilterList.__cancel) {
		FilterList.__cancel--;
		FilterList.__updating--;

		return;
	}

	FilterList.__updating--;

	if (FilterList.__updating === 0)
		Settings.setItem('FilterListLastUpdate', Date.now());

	FilterList.__addQueue[this.name] = {
		humanName: this.humanName,
		rules: rules
	};

	FilterList.executeQueue();
};

FilterList.prototype.download = function () {
	var self = this;

	return $.ajax({
		url: this.url,
		timeout: 15000
	}).fail(function (error) {
		FilterList.__updating--;

		LogError(Error('failed to download filter list ' + self.name + '/' + self.url), error.statusText);
	});
};

FilterList.prototype.process = function (list) {
	var self = this;

	var listInfo = {
		name: this.name,
		url: this.url,
		list: list
	};

	FilterList.promiseWorker.postMessage(listInfo).then(this.doneWithRules.bind(this), function (err) {
		FilterList.__updating--;

		LogError(Error('invalid Filter List - ' + err.meta.name + ' - ' + err.meta.url));

		self.valid = false;

		Settings.removeItem('filterLists', err.meta.name);

		Rules.__FilterRules.remove(err.meta.name);
	});
};

FilterList.updateCheck();

Utilities.Timer.interval('FilterListUpdateCheck', FilterList.updateCheck, FilterList.__updateInterval);
