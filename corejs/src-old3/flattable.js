/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	// ----------------- row -----------------

	var Row = function(id) {
		this.id = id;
	};
	
	// ----------------- column -----------------

	var Column = function (table, id) {
		ASSERT(table instanceof Table);
		ASSERT(typeof id === "number");

		this.table = table;

		this.rows = [];
		this.id = id;
	};

	Column.prototype.forEach = function(callback) {
		ASSERT(this.table);
		
		var rows = this.rows;
		var length = rows.length;
		for(var i = 0; i < length; ++i) {
			callback(rows[i]);
		}
	};

	Column.prototype.deleteEach = function(callback) {
		ASSERT(this.table);
		
		var rows = this.rows;
		var length = rows.length;
		for(var i = 0; i < length; ++i) {
			var row = rows[i];
			ASSERT(row.hasOwnProperty(this.id));
			
			callback(row);
			delete row[this.id];
		}
		
		rows.splice(0, length);
	};
	
	Column.prototype.isEmpty = function() {
		return this.rows.length === 0;
	};
	
	Column.prototype.set = function (row, value) {
		ASSERT(this.table);
		ASSERT(row instanceof Row);
		ASSERT(this.table.rows[row.id] === row);

		if( !row.hasOwnProperty(this.id) ) {
			ASSERT(this.rows.indexOf(row) === -1);
			this.rows.push(row);
		}

		row[this.id] = value;
	};

	Column.prototype.get = function (row) {
		ASSERT(this.table);
		ASSERT(row instanceof Row);
		ASSERT(this.table.rows[row.id] === row);

		return row[this.id];
	};

	Column.prototype.has = function (row) {
		ASSERT(this.table);
		ASSERT(row instanceof Row);
		ASSERT(this.table.rows[row.id] === row);

		return row.hasOwnProperty(this.id);
	};
	
	Column.prototype.del = function (row) {
		ASSERT(this.table);
		ASSERT(row instanceof Row);
		ASSERT(this.table.rows[row.id] === row);
		
		if( row.hasOwnProperty(this.id) ) {
			row[this.id] = undefined;
		}
	};
	
	// ----------------- table -----------------

	var Table = function () {
		this.rows = {};
		this.columns = [];
	};

	Table.prototype.getRow = function (id) {
		ASSERT(typeof id === "string" || typeof id === "number");

		var row = this.rows[id];
		if( !row ) {
			row = new Row(id);
			this.rows[id] = row;
		}
		ASSERT(row.id === id);

		return row;
	};

	Table.prototype.getId = function (row) {
		ASSERT(row instanceof Row);
		ASSERT(this.rows[row.id] === row);

		return row.id;
	};
	
	Table.prototype.createColumn = function () {
		var id = 0;
		while( this.columns[id] ) {
			++id;
		}
		ASSERT(id <= this.columns.length);

		var column = new Column(this, id);
		this.columns[id] = column;

		return column;
	};

	Table.prototype.deleteColumn = function (column) {
		ASSERT(column instanceof Column);
		ASSERT(column.table === this);

		var rows = column.rows;
		var length = rows.length;
		var id = column.id;

		for(var i = 0; i !== length; ++i) {
			ASSERT(rows[i].hasOwnProperty(id));
			delete rows[i][id];
		}

		delete column.rows;
		delete column.table;
		delete this.columns[id];
	};

	// ----------------- interface -----------------

	return Table;
});
