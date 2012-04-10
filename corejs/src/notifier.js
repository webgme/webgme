/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";
	
	// ----------------- Notifier -----------------

	var Notifier = function (table, onnotify, onmodified) {
		ASSERT(table && onnotify);

		this.lists = table.createColumn();
		this.onnotify = onnotify;
		this.onmodified = onmodified || function () {
		};
	};

	Notifier.prototype.notify = function (row) {
		ASSERT(this.lists);

		var list = this.lists.get(row);
		if( list ) {
			for( var i = 0; i !== list.length; ++i ) {
				this.onnotify(row, list[i]);
			}
		}
	};

	Notifier.prototype.watched = function (row) {
		ASSERT(this.lists);

		var list = this.lists.get(row);
		ASSERT(list === undefined || list.length >= 1);

		return !!list;
	};

	Notifier.prototype.add = function (row, data) {
		ASSERT(this.lists);

		var list = this.lists.get(row);
		if( list ) {
			ASSERT(list.length >= 1);

			list.push(data);
		}
		else {
			this.lists.set(row, [ data ]);
			this.onmodified(row, false, true);
		}
	};

	Notifier.prototype.remove = function (row, data) {
		ASSERT(this.lists);

		var list = this.lists.get(row);
		ASSERT(list && list.length >= 1);

		if( list.length >= 2 ) {
			var index = list.indexOf(data);
			ASSERT(index >= 0);

			list.splice(index, 1);
		}
		else {
			ASSERT(list[0] === data);

			this.lists.del(row);
			this.onmodified(row, true, false);
		}
	};

	// ----------------- WatchedColumn -----------------

	var WatchedColumn = function () {
		this.watchers = [];
	};

	WatchedColumn.prototype.addWatcher = function (callback) {
		ASSERT(callback);
		ASSERT(this.watchers.indexOf(callback) === -1);

		this.watchers.push(callback);
	};

	WatchedColumn.prototype.removeWatcher = function (callback) {
		ASSERT(callback);

		var index = this.watchers.indexOf(callback);
		ASSERT(index >= 0);

		this.watchers.splice(index, 1);
	};

	WatchedColumn.prototype.notifyWatchers = function (row) {
		for( var i = 0; i < this.watchers; ++i ) {
			this.watchers[i](row);
		}
	};

	// ----------------- Territory -----------------

	var Territory = function (table) {
		this.counters = table.createColumn();
		this.backups = table.createColumn();
	};

	Territory.prototype.contains = function (row) {
		var refcount = this.counters.get(row);
		ASSERT(refcount === undefined || refcount >= 1);

		return !!refcount;
	};

	Territory.prototype.isDirty = function (row) {
		var old = this.backups.get(row);
		ASSERT(old !== this.contains(row));

		return old !== undefined;
	};

	Territory.prototype.increase = function (row) {
		var refcount = this.counters.get(row);
		ASSERT(refcount === undefined || refcount >= 1);

		if( refcount ) {
			this.counters.set(row, refcount + 1);
		}
		else {
			this.counters.set(row, 1);

			var old = this.backups.get(row);
			if( old === undefined ) {
				this.backups.set(row, false);
			}
			else if( old === true ) {
				this.backups.del(row);
			}
		}
	};

	Territory.prototype.decrease = function (row) {
		var refcount = this.counters.get(row);
		ASSERT(refcount !== undefined && refcount >= 1);

		if( refcount >= 2 ) {
			this.counters.set(row, refcount - 1);
		}
		else {
			this.counters.del(row);

			var old = this.backups.get(row);
			if( old === undefined ) {
				this.backups.set(row, true);
			}
			else if( old === false ) {
				this.backups.del(row);
			}
		}
	};

	// ----------------- Query -----------------

	var Query = function (table, data, subquery) {
		this.table = table;
		this.subquery = subquery;

		this.refcount = table.createColumn();
		this.loaded = table.createColumn();
	};

	Query.prototype.isDirty = function (row) {
	};

	Query.prototype.dataChanged = function (row) {
		var refcount = this.refcount.get(row);
		ASSERT(refcount === undefined || refcount >= 1);

		if( refcount ) {
			this.dirty.set(row);
		}
	};

	Query.prototype.increase = function (row) {
		var refcount = this.refcount.get(row);
		ASSERT(refcount === undefined || refcount >= 1);

		if( refcount ) {
			this.refcount.set(refcount + 1);
		}
		else {
			this.refcount.set(1);
			this.dirty.set(true);
		}
	};

	Query.prototype.decrease = function (row) {
		var refcount = this.refcount.get(row);
		ASSERT(refcount !== undefined && refcount >= 1);

		if( refcount >= 2 ) {
			this.refcount.set(refcount - 1);
		}
		else {
			this.refcount.del(row);
			this.dirty.set(true);
		}
	};

	Query.prototype.isDirty = function () {
		return this.dirty.isEmpty();
	};

	// ----------------- interface -----------------

	return Notifier;
});
