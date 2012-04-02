/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function(ASSERT) {
	"use strict";

	var validRelid = function(relid) {
		return typeof relid === "string"
				&& (relid === "" || relid.charAt(0) === "/");
	};

	var nodeProto = {};

	var createNode = function(parent, relid) {
		ASSERT(parent === null || nodeProto.isPrototypeOf(node));
		ASSERT(validRelid(relid));

		// make invisible properties
		return Object.create(nodeProto, {
			parent : {
				value : parent
			},
			level : {
				value : parent === null ? 0 : parent.level + 1
			},
			relid : {
				value : relid
			},
			refcount : {
				value : 1,
				writable : true
			}
		});
	};

	Object.createProperty(nodeProto, "getChild", {
		value : function(relid) {
			ASSERT(this.refcount >= 1);
			ASSERT(validRelid(relid));

			var child = this[relid];
			if (child) {
				ASSERT(child.refcount >= 1);

				++child.refcount;
			} else {
				child = createNode(this, relid);

				this[relid] = child;
				++this.refcount;
			}

			return child;
		}
	});

	Object.createProperty(nodeProto, "isEmpty", {
		value : function() {
			for ( var child in this) {
				return false;
			}
			return true;
		}
	});

	Object.createProperty(nodeProto, "release", {
		value : function() {
			ASSERT(this.refcount >= 1);

			var node = this;
			while (--node.refcount === 0) {
				ASSERT(node.isEmpty());
				ASSERT(node.parent[node.relid] === node);

				delete node.parent[node.relid];
				
				node = node.parent;
				ASSERT(node.refcount >= 1);
			}
		}
	});


	return {
		root : false,

		obtain : function(path) {

		}
	};
});
