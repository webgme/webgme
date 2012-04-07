/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	// ----------------- column -----------------

	var Column = function (table) {
		ASSERT(table instanceof Table);

		this.table = table;

		this.values = {};
	};

	Column.prototype.foreach = function(callback) {
		ASSERT(this.table);

		for(var row in this.values) {
			callback(row);
		}
	};
	
	Column.prototype.set = function (row, value) {
		ASSERT(this.table);
		ASSERT(typeof row === "string" || typeof row === "number");

		this.values[row] = value;
	};

	Column.prototype.get = function (row) {
		ASSERT(this.table);
		ASSERT(typeof row === "string" || typeof row === "number");
		
		return this.values[row];
	};

	Column.prototype.del = function (row) {
		ASSERT(this.table);
		ASSERT(typeof row === "string" || typeof row === "number");

		delete this.values[row];
	};

	// ----------------- table -----------------

	var Table = function () {
	};

	Table.prototype.getRow = function (id) {
		ASSERT(typeof id === "string" || typeof id === "number");

		return id;
	};

	Table.prototype.getId = function (row) {
		ASSERT(typeof row === "string" || typeof row === "number");

		return row;
	};
	
	Table.prototype.createColumn = function () {
		return new Column(this);
	};

	Table.prototype.deleteColumn = function (column) {
		ASSERT(column instanceof Column);
		ASSERT(column.table === this);

		delete column.values;
		delete column.table;
	};

	// ----------------- interface -----------------

	return Table;
});
