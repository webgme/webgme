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
		this.rows = {};
	};

	Column.prototype.getRows = function() {
		ASSERT(this.table);
		
		return this.rows;
	};
	
	Column.prototype.setData = function (row, value) {
		ASSERT(this.table);
		ASSERT(typeof id === "string" || typeof id === "number");

		this.rows[row] = value;
	};

	Column.prototype.getData = function (row) {
		ASSERT(this.table);
		ASSERT(typeof id === "string" || typeof id === "number");
		
		return this.rows[row];
	};

	// ----------------- table -----------------

	var Table = function () {
	};

	Table.getRow = function (id) {
		ASSERT(typeof id === "string" || typeof id === "number");

		return id;
	};

	Table.createColumn = function () {
		return new Column(this);
	};

	Table.deleteColumn = function (column) {
		ASSERT(column instanceof Column);
		ASSERT(column.table === this);

		column.table = null;
		delete column.rows;
	};

	// ----------------- interface -----------------

	return Table;
});
