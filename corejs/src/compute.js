/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	var createRefCount = function (table) {

		var callbacks = [];
		var storage = table.createColumn();
		var changes = table.createColumn();

		var update = function(row) {
			var prev = (storage.get(row) || 0) >= 1;
			var curr = changes.get(row) >= 1;
			
			if(prev !== curr) {
				for(var i = 0; i < callbacks.length; ++i) {
					callbacks[i](prev, curr);
				}
			}
		};
		
		return {
			/**
			 * Returns true if the committed refcount is at least one, and false
			 * otherwise. This value is computed from the committed counters
			 * only, and you cannot view the uncommitted changes.
			 */
			get: function (row) {
				var refcount = storage.get(row);
				ASSERT(refcount === undefined || refcount >= 1);

				return !!refcount;
			},

			/**
			 * Returns true if there are uncommitted changes (where the refcount
			 * would change from false to true or vice versa).
			 */
			dirty: function () {
				return !changes.empty();
			},

			/**
			 * Commits all changes so get will reflect the new values. This will call
			 * the registered listeners with all changes.
			 */
			commit: function () {
				changes.foreach(update);
			},
			
			/**
			 * Increases the working copy of the counter and makes this object
			 * dirty.
			 */
			increase: function (row) {
				var refcount = changes.get(row);
				if( refcount === undefined ) {
					refcount = storage.get(row) || 0;
				}
				
				ASSERT(refcount >= 0);
				changes.set(refcount + 1);
			},

			/**
			 * Decreases the working copy of the counter and makes this object
			 * dirty.
			 */
			decrease: function (row) {
				var refcount = changes.get(row);
				if( refcount === undefined ) {
					refcount = storage.get(row);
				}

				ASSERT(refcount >= 1);
				changes.set(refcount - 1);
			},
			
			register: function(callback) {
				ASSERT(typeof callback === "function");

				callbacks.push(callback);
			},

			unregister: function (callback) {
				var index = callbacks.indexOf(callback);
				ASSERT(index >= 0);

				callbacks.splice(index, 1);
			},

			destroy: function () {
				ASSERT(callbacks.length === 0);
				callbacks = null;
				
				changes.destroy();
				changes = null;

				storage.destroy();
				storage = null;
			}
		};
	};

	var stagedValue = function (table, getter) {
		ASSERT(table && table.createColumn);

		var callbacks = [];
		var backup = table.createColumn();

		var notify = function (row) {
			var previous = backup.get(row);
			var current = getter(row);
			for( var i = 0; i < callbacks.length; ++i ) {
				callbacks[i](row, previous, current);
			}
		};

		return {
			table: table,

			dirty: function () {
				return !backup.empty();
			},

			update: function () {
				backup.foreach(notify);
			},

			register: function (callback) {
				ASSERT(typeof callback === "function");

				callbacks.push(callback);
			},

			unregister: function (callback) {
				var index = callbacks.indexOf(callback);
				ASSERT(index >= 0);

				callbacks.splice(index, 1);
			},

			destroy: function () {
				ASSERT(callbacks.length === 0);
				callbacks = null;
			}
		};
	};

	var storedValue = function (table) {

		var stage = stagedValue(table);
		var backup = stage.backup;

		return {
			get: function (row) {
			},

			set: function (row) {
				backup(row);
			},

			dirty: stage.dirty,
			update: stage.update,
			register: stage.register,
			unregister: stage.unregister

		};
	};

	var createValue = function (table) {
		return {
			get: function (row) {
			},

			dirty: function () {
			},

			update: function () {
			},

			register: function (callback) {
			},

			unregister: function (callback) {
			},

			destroy: function () {
			},

			table: null
		};
	};

	var unaryOp = function (calculator, argument) {
		var backup = argument.table.createColumn();

		return {

			table: argument.table
		};
	};
});
