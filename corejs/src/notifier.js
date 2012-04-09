/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	// ----------------- Notifier -----------------

	var Notifier = function(table, onnotify, onmodified) {
		ASSERT(table && onnotify);

		this.lists = table.createColumn();
		this.onnotify = onnotify;
		this.onmodified = onmodified || function() {};
	};

	Notifier.prototype.notify = function(row) {
		ASSERT(this.lists);
		
		var list = this.lists.get(row);
		if( list ) {
			for(var i = 0; i !== list.length; ++i) {
				this.onnotify(row, list[i]);
			}
		}
	};

	Notifier.prototype.watched = function(row) {
		ASSERT(this.lists);
		
		var list = this.lists.get(row);
		ASSERT(list === undefined || list.length >= 1);
		
		return !!list;
	};
	
	Notifier.prototype.add = function(row, data) {
		ASSERT(this.lists);
		
		var list = this.lists.get(row);
		if(list) {
			ASSERT(list.length >= 1);

			list.push(data);
		}
		else {
			this.lists.set(row, [data]);
			this.onmodified(row, false, true);
		};
	};

	Notifier.prototype.remove = function(row, data) {
		ASSERT(this.lists);

		var list = this.lists.get(row);
		ASSERT(list && list.length >= 1);

		if(list.length >= 2) {
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

	// ----------------- Combiner -----------------

	var Combiner = function(table, onmodified) {
		
	};
	
	// ----------------- interface -----------------

	return Notifier;
});
