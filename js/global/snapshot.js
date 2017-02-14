/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

var Snapshots = new Store('Snapshots', {
	save: true
});

function Snapshot (store, props) {
	if (!(store instanceof Store))
		throw new TypeError(store + ' is not an instance of Store');

	if (!(props instanceof Object))
		props = {};
	
	this.store = store;
	this.maxUnkept = props.maxUnkept ? parseInt(props.maxUnkept, 10) || 15 : 15;

	this.snapshots = Snapshots.getStore(this.store.name);

	this.kept = this.snapshots.getStore('kept');
	this.unkept = this.snapshots.getStore('unkept');
	this.comparisons = this.snapshots.getStore('comparisons', {
		maxLife: TIME.ONE.SECOND * 3,
		ignoreSave: true
	});

	this.latestKept = this.__outerMost.bind(this, true, true);
	this.latestUnkept = this.__outerMost.bind(this, true, false);

	this.firstKept = this.__outerMost.bind(this, false, true);
	this.firstUnkept = this.__outerMost.bind(this, false, false);

	this.__checkForChanges = function () {
		Utilities.Timer.timeout('CheckForChanges' + this.snapshots.name, function (snapshot) {
			snapshot.checkForChanges();
		}, TIME.ONE.SECOND * 30, [this]);
	}.bind(this);
}

Snapshot.storageInfo = function () {
	var count = 0;

	Snapshots.forEach(function (name, snapshotStore) {
		count += snapshotStore.getStore('kept').keys().length;
		count += snapshotStore.getStore('unkept').keys().length;
	});

	return {
		count: count,
		size: JSON.stringify(Snapshots).length
	};
};

Snapshot.prototype.__outerMost = function (latest, kept, returnID) {
	var store = kept ? this.kept : this.unkept,
		ids = store.keys().sort();

	if (latest)
		ids.reverse();

	var snapshot = returnID ? ids[0] : store.get(ids[0]);

	if (!returnID && snapshot && !(snapshot.snapshot instanceof Store))
		snapshot.snapshot = Store.promote(snapshot.snapshot);

	return snapshot;
};

Snapshot.prototype.autoSnapshots = function (value) {
	this.store.removeCustomEventListener('storeDidSave', this.__checkForChanges);

	if (value)
		this.store.addCustomEventListener('storeDidSave', this.__checkForChanges);
};

Snapshot.prototype.latest = function (returnID) {
	var latestKept = this.latestKept(true) || 0,
		latestUnkept = this.latestUnkept(true) || 0;
	
	if (returnID)
		return Math.max(latestKept, latestUnkept);

	var snapshot = latestKept > latestUnkept ? this.kept.get(latestKept) : this.unkept.get(latestUnkept);

	if (snapshot && !(snapshot.snapshot instanceof Store))
		snapshot.snapshot = Store.promote(snapshot.snapshot);

	return snapshot;
};

Snapshot.prototype.first = function (returnID) {
	var firstKept = this.firstKept(true) || Date.now(),
		firstUnkept = this.firstUnkept(true) || Date.now();
	
	if (returnID)
		return Math.min(firstKept, firstUnkept);
	
	var snapshot = firstKept < firstUnkept ? this.kept.get(firstKept) : this.unkept.get(firstUnkept);

	if (snapshot && !(snapshot.snapshot instanceof Store))
		snapshot.snapshot = Store.promote(snapshot.snapshot);

	return snapshot;
};

Snapshot.prototype.cleanStore = function () {
	return Store.promote(this.store.readyJSON());
};

Snapshot.prototype.checkForChanges = function () {
	if (this.kept.isEmpty() && this.unkept.isEmpty())
		return this.add();

	var cleanStore = this.cleanStore();

	if (cleanStore.isEmpty())
		return;

	var comparison = Store.compare(cleanStore, this.latest().snapshot);

	if (!comparison.equal)
		this.add();

	comparison.store.destroy(true);
};

Snapshot.prototype.keep = function (id) {
	var unkeptSnapshot = this.unkept.get(id),
		keptSnapshot = this.kept.get(id);

	if (!unkeptSnapshot || keptSnapshot)
		return null;

	this.kept.set(id, unkeptSnapshot);
	this.unkept.remove(id);
};

Snapshot.prototype.unkeep = function (id) {
	var unkeptSnapshot = this.unkept.get(id),
		keptSnapshot = this.kept.get(id);

	if (unkeptSnapshot || !keptSnapshot)
		return null;

	this.unkept.set(id, keptSnapshot);
	this.kept.remove(id);
};

Snapshot.prototype.setName = function (id, name) {
	if (typeof name !== 'string')
		return false;

	name = $.trim(name);

	var snapshot = this.unkept.get(id) || this.kept.get(id);

	if (!snapshot)
		return false;

	if (!name.length)
		snapshot.name = undefined;

	snapshot.name = name;

	this.kept.set(id, snapshot);

	this.unkept.remove(id);

	return true;
};

Snapshot.prototype.add = function (keep, name, comparisonData) {
	if (typeof name !== 'string')
		name = null;

	var id = Date.now(),
		store = comparisonData ? this.comparisons : (keep ? this.kept : this.unkept);

	var cloned;

	if (comparisonData)
		cloned = comparisonData;
	else
		cloned = this.store.clone(null, {
			lock: true
		}).readyJSON();

	if (!comparisonData && cloned.STORE._isEmpty())
		return;

	LogDebug('New snapshot: ' + id + '-' + name);

	store.set(id, {
		name: name,
		snapshot: cloned
	});

	while (this.unkept.keys().length > this.maxUnkept)
		this.unkept.remove(this.firstUnkept(true));

	return id;
};
