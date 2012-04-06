/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	// ----------------- row -----------------

	var rowProto = {};

	// hidden empty property
	Object.defineProperties(rowProto, {
		empty: {
			get: function () {
				var columnid;
				for( columnid in this ) {
					return false;
				}
				return true;
			}
		}
	});

	// ----------------- column -----------------

	var Column = function (table, id) {
		ASSERT(table instanceof Table);
		ASSERT(typeof id === "string");

		this.table = table;
		this.rows = [];

		this.id = id;
	};

	Column.prototype.getRows = function() {
		return this.rows;
	};
	
	Column.prototype.setData = function (row, value) {
		ASSERT(row.table === this.table);

		if( !row.hasOwnData(this.id) ) {
			ASSERT(this.columns.indexOf(row) === -1);
			this.columns.push(row);
		}

		row[this.id] = value;
	};

	Column.prototype.getData = function (row) {
		ASSERT(row.table === this.table);

		return row[this.id];
	};

	// ----------------- table -----------------

	var Table = function () {
		// create row prototype with hidden table property
		this.rowProto = Object.create(rowProto, {
			table: {
				value: this
			}
		});

		this.rows = {};
		this.columns = [];
	};

	Table.getRow = function (id) {
		ASSERT(typeof id === "string" || typeof id === "number");

		var row = this.rows[id];
		if( !row ) {
			// create new row with hidden id property
			row = Object.create(this.rowProto, {
				id: {
					value: id
				}
			});

			this.rows[id] = row;
		}

		return row;
	};

	Table.createColumn = function () {
		var id = 0;
		while( this.columns[id] ) {
			++id;
		}
		ASSERT(id <= this.columns.length);

		var column = new Column(this, id);
		this.columns[id] = column;

		return column;
	};

	Table.deleteColumn = function (column) {
		ASSERT(column instanceof Column);
		ASSERT(column.table === this);

		var rows = column.rows;
		var id = column.id;

		for( var index in rows ) {
			ASSERT(rows[index].hasOwnProperty(id));

			delete rows[index][id];
		}

		delete column.rows;

		delete this.columns[id];
		column.table = null;
	};

	// ----------------- interface -----------------

	return Table;
});
