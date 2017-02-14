/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

function FilterList (listName, listURL) {
	if (!Rules.list[listName])
		throw new Error(listName + ' is not a known FilterList.');
	
	FilterList.__updating++;

	this.name = listName;
	this.url = listURL;
	this.valid = true;

	this.download().done(this.process.bind(this));
}

FilterList.__cancel = 0;
FilterList.__updating = 0;
FilterList.__updateInterval = TIME.ONE.DAY * 4;
FilterList.__addQueue = {};

FilterList.executeQueue = function () {
	Utilities.Timer.timeout('addFilterListsRules', function () {
		for (var listName in FilterList.__addQueue)
			if (Rules.list[listName])
				Rules.list[listName].addMany(FilterList.__addQueue[listName]);
		
		FilterList.__addQueue = {};
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
			new FilterList(list, lists[list].value[0]);
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

	FilterList.__addQueue[this.name] = rules;

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

	var filterListWorker = new Worker('../js/global/filterlist-worker.js');

	filterListWorker.addEventListener('message', function (message) {
		if (message.data.error) {
			FilterList.__updating--;

			LogError(Error('invalid Filter List - ' + message.data.message.name + ' - ' + message.data.message.url));

			self.valid = false;

			Settings.removeItem('filterLists', message.data.message.name);

			Rules.__FilterRules.remove(message.data.message.name);
		} else
			self.doneWithRules(message.data.message);
	});

	filterListWorker.postMessage(listInfo);
};

FilterList.updateCheck();

Utilities.Timer.interval('FilterListUpdateCheck', FilterList.updateCheck, FilterList.__updateInterval);
