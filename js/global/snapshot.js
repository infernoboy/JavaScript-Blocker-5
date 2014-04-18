"use strict";

var Snapshots = new Store('Snapshots', {
	save: true
});

function Snapshot (store, props) {
	if (!(store instanceof Store))
		throw new TypeError(store + ' is not an instance of Store');

	if (!(props instanceof Object))
		props = {};
	
	this.store = store;
	this.maxUnkept = (typeof props.maxUnkept === 'number') ? props.maxUnkept : 15;

	this.snapshots = Snapshots.getStore(this.store.name, {
		private: true
	});

	this.kept = this.snapshots.getStore('kept');
	this.unkept = this.snapshots.getStore('unkept');

	this.latestKept = this.__outerMost.bind(this, true, true);
	this.latestUnkept = this.__outerMost.bind(this, true, false);

	this.firstKept = this.__outerMost.bind(this, false, true);
	this.firstUnkept = this.__outerMost.bind(this, false, false);

	store.addListener('save', function () {
		Utilities.Timer.timeout('CheckForChanges' + this.snapshots.name, function (snapshot) {
			snapshot.checkForChanges();
		}, TIME.ONE_SECOND * 30, [this]);
	}.bind(this));
};

Snapshot.prototype.__outerMost = function (latest, kept, returnID) {
	var store = kept ? this.kept : this.unkept,
			ids = store.keys().sort();

	if (latest)
		ids.reverse();

	return returnID ? ids[0] : store.get(ids[0]);
};

Snapshot.prototype.latest = function (returnID) {
	var latestKept = this.latestKept(true) || 0,
			latestUnkept = this.latestUnkept(true) || 0;
	
	if (returnID)
		return Math.max(latestKept, latestUnkept);
	
	return latestKept > latestUnkept ? this.kept.get(latestKept) : this.unkept.get(latestUnkept);
};

Snapshot.prototype.first = function (returnID) {
	var firstKept = this.firstKept(true) || Date.now(),
			firstUnkept = this.firstUnkept(true) || Date.now();
	
	if (returnID)
		return Math.min(firstKept, firstUnkept);
	
	return firstKept < firstUnkept ? this.kept.get(firstKept) : this.unkept.get(firstUnkept);
};

Snapshot.prototype.cleanStore = function () {
	return Store.promote(this.store.toJSON());
};

Snapshot.prototype.checkForChanges = function () {
	if (this.kept.isEmpty() && this.unkept.isEmpty())
		return this.add();

	var cleanStore = this.cleanStore();

	if (cleanStore.isEmpty())
		return;

	var comparison = Store.compare(cleanStore, this.latest());

	if (!comparison.equal)		
		this.add();

	comparison.store.destroy(true);
};

Snapshot.prototype.add = function (kept) {
	var id = Date.now(),
			store = kept ? this.kept : this.unkept;

	var cloned = this.store.clone([this.snapshots.name, id].join(), {
		lock: true
	}).toJSON();

	if (cloned.data._isEmpty())
		return;

	Log('New snapshot:', id)

	store.set(id, cloned);

	if (this.unkept.keys().length > this.maxUnkept)
		this.unkept.remove(this.firstUnkept(true));
};
