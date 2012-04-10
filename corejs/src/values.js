/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	// ----------------- StoredValue -----------------

	var StoredValue = function (table) {
		ASSERT(table && table.createColumn);

		this.table = table;
		this.listeners = [];
		this.storage = table.createColumn();
		this.changes = table.createColumn();
		this.ready = true;
	};

	/**
	 * Returns the committed value for the given row. (Uncommitted changed
	 * cannot be viewed to force proper usage.)
	 */
	StoredValue.prototype.getData = function (row) {
		ASSERT(this.ready);
		return this.storage.get(row);
	};

	/**
	 * Updates the current value for the given row and sets the dirty flag.
	 */
	StoredValue.prorotype.setData = function (row, value) {
		ASSERT(this.ready);
		this.changes.set(row, value);
	};

	/**
	 * Retrieves the latest value (uncommitted changes), calls the updater
	 * function, and sets the new value to the return value.
	 */
	StoredValue.prototype.updateData = function (row, updater) {
		ASSERT(this.ready);

		var value = this.changes.has(row) ? this.changes.get(row) : this.storage.get(row);
		this.changes.set(updater(value));
	};

	/**
	 * Returns true if there are uncommitted changes.
	 */
	StoredValue.prorotype.isDirty = function () {
		ASSERT(this.ready);

		return !this.changes.isEmpty();
	};

	StoredValue.prorotype.addListener = function (callback) {
		ASSERT(this.ready);
		ASSERT(typeof callback === "function");

		this.listeners.push(callback);
	};

	StoredValue.prorotype.removeListener = function (callback) {
		ASSERT(this.ready);

		var index = this.listeners.indexOf(callback);
		ASSERT(index >= 0);
		this.listeners.splice(index, 1);
	};

	StoredValue.prototype.commit = function () {
		ASSERT(this.ready);

		this.ready = false;
		
		var storage = this.storage;
		var changes = this.changes;
		var listeners = this.listeners;

		changes.removeEach(function (row) {
			var oldData = storage.get(row);
			var newData = changes.get(row);

			for( var i = 0; i < listeners.length; ++i ) {
				listeners[i](row, oldData, newData);
			}
		});
		
		this.ready = true;
	};

	StoredValue.prototype.abort = function () {
		ASSERT(this.ready);

		this.changes.removeAll();
	};

	// ----------------- ComputedValue -----------------
	
	var ComputedValue = function (map, args) {
		ASSERT(typeof map === "function");
		ASSERT( args.length >= 1 );
		
		this.table = args[0].table;
		this.map = map;
		
		for(var i = 0; i < args.length; ++i) {
		}
	};

	// ----------------- interface -----------------

	return false;
});
