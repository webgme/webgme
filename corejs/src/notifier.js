/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	// ----------------- notifier -----------------

	var Notifier = function(table, callback) {
		ASSERT(table && callback);

		this.lists = table.createColumn();

		// public
		this.backup = table.createColumn();
		
		this.callback = callback;
	};

	Notifier.prototype.notify = function(row) {
		ASSERT(this.lists);
		
		var list = this.lists.get(row);
		if( list ) {
			for(var i = 0; i !== list.length; ++i) {
				this.callback(row, list[i]);
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
			
			var old = this.backup.get(row);
			if( old === undefined ) {
				this.backup.set(row, false);
			} else if( old === true ) {
				this.backup.del(row);
			}
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
			
			var old = this.backup.get(row);
			if( old === undefined ) {
				this.backup.set(row, true);
			} else if( old === false ) {
				this.backup.del(row);
			}
		}
	};

	// ----------------- interface -----------------

	return Notifier;
});
