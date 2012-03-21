/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "gmeassert", "loader" ], function (ASSERT, loader) {
	"use strict";

	var nodeCount = 0;
	
	var Node = function (parent) {
		ASSERT(typeof relid === "string");
		ASSERT(parent === null || parent instanceof Node);

		Object.defineProperties(this, {
			parent: {
				value: parent,
				enumerable: false,	// to allow serialization
				writable: false
			},
			nodeid: {
				value: ++nodeCount,
				enumerable: true,
				writable: false
			}
		});
	};

	Object.defineProperties(Node.prototype, {
		path: {
			get: function () {
				return this.parent === null ? "" : this.parent.getPath() + "."
						+ this.relid;
			}
		},
		root: {
			get: function () {
				var node = this;
				while( node.parent !== null ) {
					node = node.parent;
				}
				return node;
			}
		},
		name: {
			get: function() {
				var data = this.data || {name: "unknown"};
				return data.name;
			}
		}
	});

	var updateNode = function(node, hash) {
		ASSERT(node.data);

		// we bail out early, so we do not traverse the whole tree 
		if( node.data.hash === hash ) {
			return;
		}
		
	};
	
	// ----------------- Public Interface -----------------

	return {
	};
});
