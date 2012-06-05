/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert", "lib/sha1" ], function (ASSERT, SHA1) {
	"use strict";

	// ----------------- deepclone -----------------

	var deepclone = function (o) {
		var c, k;
		if( o && typeof o === "object" ) {
			if( o.constructor !== Array ) {
				c = {};
				for( k in o ) {
					c[k] = deepclone(o[k]);
				}
			}
			else {
				c = [];
				for( k = 0; k < o.length; ++k ) {
					c.push(deepclone(o[k]));
				}
			}
			return c;
		}
		return o;
	};

	// ----------------- PersistentTree -----------------

	var keyregexp = new RegExp("id:[0-9a-f]{40}");

	var isKey = function (key) {
		return typeof key === "string" && key.length === 43 && keyregexp.test(key);
	};
	
	var PersistentTree = function (storage) {
		ASSERT(storage);

		var ASSERT_NODE = function (node) {
			// console.log(node);

			ASSERT(node && node.data && typeof node.data === "object");
			ASSERT(node.parent === null
			|| (node.parent.data && typeof node.parent.data === "object"));

			ASSERT(node.data._mutable === undefined || node.data._mutable === true);
			ASSERT(node.parent === null || node.data._mutable === undefined
			|| node.parent.data._mutable === true);

			var key = storage.getKey(node.data);
			ASSERT(key === undefined || key === false
			|| isKey(key));

			ASSERT(node.parent === null || !key || node.parent.data[node.relid] === key);
			ASSERT(node.parent === null || key || node.parent.data[node.relid] === node.data);
			ASSERT(!node.data._mutable || typeof key !== "string");
		};

		this.getKey = function (node) {
			ASSERT_NODE(node);
			return storage.getKey(node.data);
		};

		this.addKey = function (node) {
			ASSERT_NODE(node);
			ASSERT(this.isMutable(node));

			return storage.setKey(node.data, false);
		};

		this.delKey = function (node) {
			ASSERT_NODE(node);
			ASSERT(this.isMutable(node));

			return storage.delKey(node.data);
		};

		this.isKey = isKey;
		
		this.createRoot = function () {
			var data = {
				_mutable: true
			};
			storage.setKey(data, false);

			return {
				data: data,
				parent: null,
				relid: undefined
			};
		};

		this.createChild = function (node, relid) {
			ASSERT_NODE(node);
			ASSERT(typeof relid === "string");

			this.mutate(node);

			var data = {
				_mutable: true
			};
			node.data[relid] = data;

			return {
				data: data,
				parent: node,
				relid: relid
			};
		};

		this.getChild = function (node, relid) {
			ASSERT_NODE(node);
			ASSERT(typeof relid === "string");

			var child = node.data[relid];
			ASSERT(child && typeof child === "object");

			return {
				data: child,
				parent: node,
				relid: relid
			};
		};

		this.deleteChild = function (node, relid) {
			ASSERT_NODE(node);
			ASSERT(this.isMutable(node));
			ASSERT(typeof relid === "string");

			delete node.data[relid];
		};

		this.loadRoot = function (key, callback) {
			ASSERT(typeof key === "string");
			ASSERT(callback);

			storage.load(key, function (err, data) {
				ASSERT(err || storage.getKey(data) === key);
				callback(err, err ? undefined : {
					data: data,
					parent: null,
					relid: undefined
				});
			});
		};

		this.loadChild = function (node, relid, callback) {
			ASSERT_NODE(node);
			ASSERT(typeof relid === "string");

			var child = node.data[relid];
			ASSERT(child && typeof child === "obejct" || typeof child === "string");
			ASSERT(isKey(child));

			if( typeof child === "string" ) {
				storage.load(child, function (err, data) {
					ASSERT(err || storage.getKey(data) === child);
					callback(err, err ? undefined : {
						data: data,
						parent: node,
						relid: relid
					});
				});
			}
			else {
				callback(null, {
					data: child,
					parent: node,
					relid: relid
				});
			}
		};

		this.loadByPath = function (node, path, callback) {
			ASSERT_NODE(node);
			ASSERT(typeof path === "string" || path.constructor === Array);
			ASSERT(callback);

			if( typeof path === "string" ) {
				path = this.parseStringPath(path);
			}

			var index = path.length;
			var relid;

			var done = function (err, data) {
				if( err ) {
					callback(err);
					return;
				}

				ASSERT(storage.getKey(data) === node.data[relid]);
				node = {
					data: data,
					parent: node,
					relid: relid
				};

				next();
			};

			var next = function () {
				while( index !== 0 ) {
					ASSERT_NODE(node);

					relid = path[--index];
					ASSERT(typeof relid === "string");

					var child = node.data[relid];
					ASSERT(child && (typeof child === "object" || typeof child === "string"));

					if( typeof child === "string" ) {
						storage.load(child, done);
						return;
					}

					node = {
						data: child,
						parent: node,
						relid: relid
					};
				}
				callback(null, node);
			};

			next();
		};

		this.getParent = function (node) {
			ASSERT_NODE(node);
			return node.parent;
		};

		this.delParent = function (node) {
			ASSERT_NODE(node);
			ASSERT_NODE(node.parent);

			this.mutate(node.parent);
			delete node.parent.data[node.relid];

			node.parent = null;
			node.relid = undefined;
		};

		this.setParent = function (node, parent, relid) {
			ASSERT_NODE(node);
			ASSERT(node.parent === null && !node.relid);
			ASSERT(relid && typeof relid === "string");

			this.mutate(parent);
			parent.data[relid] = node.data;

			node.parent = parent;
			node.relid = relid;
		};

		this.getPath = function (node) {
			ASSERT_NODE(node);

			var path = [];
			while( node.parent ) {
				path.push(node.relid);
				node = node.parent;
			}

			return path;
		};

		this.getStringPath = function (node) {
			ASSERT_NODE(node);

			var empty = "";
			var path = empty;
			while( node.parent ) {
				if( path === empty ) {
					path = node.relid;
				}
				else {
					path = path + "/" + node.relid;
				}
				node = node.parent;
			}

			return path;
		};

		this.parseStringPath = function (path) {
			ASSERT(path && typeof path === "string");

			return path.length === 0 ? [] : path.split("/");
		};

		this.getRelid = function (node) {
			ASSERT_NODE(node);
			return node.relid;
		};

		this.getRoot = function (node) {
			ASSERT_NODE(node);

			while( node.parent ) {
				node = node.parent;
			}

			return node;
		};

		this.isMutable = function (node) {
			ASSERT_NODE(node);
			return node.data._mutable;
		};

		this.mutate = function (node) {
			ASSERT_NODE(node);

			var data = node.data;
			if( !data._mutable ) {
				var copy = {
					_mutable: true
				};

				for( var key in data ) {
					copy[key] = data[key];
				}

				if( storage.getKey(data) !== undefined ) {
					storage.setKey(copy, false);
				}

				ASSERT(copy._mutable === true);

				node.data = copy;

				if( node.parent ) {
					this.mutate(node.parent);

					node.parent.data[node.relid] = copy;
				}
			}
		};

		var Saver = function (callback) {
			ASSERT(callback);

			var counter = 1;
			var error = null;

			this.start = function () {
				ASSERT(callback && counter >= 1);

				++counter;
			};

			this.done = function (err) {
				ASSERT(callback && counter >= 1);

				error = error || err;

				if( --counter === 0 ) {
					callback(error);
					callback = null;
				}
			};
		};

		Saver.prototype.save = function (data) {
			ASSERT(data && typeof data === "object" && data._mutable === true);

			var relid, key, child;

			delete data._mutable;

			for( relid in data ) {
				child = data[relid];
				if( typeof child === "object" && child._mutable ) {
					key = this.save(child);
					ASSERT(key === undefined || typeof key === "string");

					if( key ) {
						data[relid] = key;
					}
				}
			}

			key = storage.getKey(data);
			ASSERT(key === false || key === undefined);

			if( key === false ) {
				key = "id:" + SHA1(JSON.stringify(data));
				storage.setKey(data, key);

				this.start();
				storage.save(data, this.done);
			}

			return key;
		};

		this.persist = function (node, callback) {
			ASSERT_NODE(node);
			ASSERT(this.isMutable(node));

			var saver = new Saver(callback);
			var key = saver.save(node.data);
			saver.done(null);

			if( node.parent ) {
				node.parent.data[node.relid] = key;
			}

			return key;
		};

		this.getProperty = function (node, name) {
			ASSERT_NODE(node);
			ASSERT(typeof name === "string");

			return node.data[name];
		};

		this.setProperty = function (node, name, value) {
			ASSERT_NODE(node);
			ASSERT(typeof name === "string");

			this.mutate(node);
			node.data[name] = value;
		};

		this.delProperty = function (node, name) {
			ASSERT_NODE(node);
			ASSERT(typeof name === "string");

			this.mutate(node);
			delete node.data[name];
		};

		this.getProperty2 = function (node, name1, name2) {
			ASSERT_NODE(node);
			ASSERT(typeof name1 === "string");
			ASSERT(typeof name2 === "string");

			return node.data[name1][name2];
		};

		this.setProperty2 = function (node, name1, name2, value) {
			ASSERT_NODE(node);
			ASSERT(typeof name1 === "string");
			ASSERT(typeof name2 === "string");

			node = this.getChild(node, name1);
			this.mutate(node);
			node.data[name2] = value;
		};

		this.delProperty2 = function (node, name1, name2) {
			ASSERT_NODE(node);
			ASSERT(typeof name1 === "string");
			ASSERT(typeof name2 === "string");

			node = this.getChild(node, name1);
			this.mutate(node);
			delete node.data[name2];
		};

		this.dumpTree = function (key, callback) {
			ASSERT(key && typeof key === "string");
			ASSERT(callback);

			var root = null;
			var error = null;
			var counter = 1;

			var decrease = function () {
				if( --counter === 0 ) {
					console.log(JSON.stringify(root, null, '\t'));

					callback(error, root);
					callback = null;
				}
			};

			var load = function (data, relid) {
				ASSERT(data && typeof data === "object");
				ASSERT(typeof relid === "string");

				var key = data[relid];
				ASSERT(isKey(key));

				++counter;
				storage.load(key, function (err, child) {
					ASSERT(err || child);

					if( !err ) {
						var copy = deepclone(child);

						data[relid] = copy;
						scan(copy);

						// copy.id = storage.getKey(child);
						decrease();
					}
					else {
						error = error || err;
					}
				});
			};

			var scan = function (data) {
				ASSERT(data && typeof data === "object");

				for( var relid in data ) {
					var child = data[relid];

					if( isKey(child) ) {
						load(data, relid);
					}
					else if( child && typeof child === "object" ) {
						scan(child);
					}
				}
			};

			storage.load(key, function (err, data) {
				ASSERT(err || storage.getKey(data) === key);

				root = deepclone(data);
				scan(root);

				decrease();
			});
		};
	};

	return PersistentTree;
});
