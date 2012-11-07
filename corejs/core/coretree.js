/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/lib/sha1", "core/util", "core/corepath" ], function (ASSERT, SHA1,
UTIL, CorePath) {
	"use strict";

	// ----------------- PersistentTree -----------------

	var keyregexp = new RegExp("#[0-9a-f]{40}");

	var isValidKey = function (key) {
		return typeof key === "string" && key.length === 41 && keyregexp.test(key);
	};

	var MISSING = {};

	var CoreTree = function (storage, options) {
		ASSERT(storage);

		var isValidNode = function (node) {
			if( !corepath.isValid(node) ) {
				return false;
			}

			try {
				var verify = function (text, cond) {
					if( !cond ) {
						throw text;
					}
				};

				verify("data", typeof node.data === "object" && node.data !== null);

				verify("mutability 1", node.data._mutable === undefined
				|| node.data._mutable === true);

				verify("mutability 2", node.parent === null || node.data._mutable === undefined
				|| node.parent.data._mutable === true);

				var key = node.data[KEYNAME];
				verify("hashkey", typeof key === "string" && (key === "" || isValidKey(key)));

				verify("data match 1", node.parent === null || !key
				|| node.parent.data[node.relid] === key);

				verify("data match 2", node.parent === null || key
				|| node.parent.data[node.relid] === node.data);

				verify("mutable key", !node.data._mutable || typeof key !== "string");
			}
			catch(error) {
				console.log("WRONG NODE: " + error + "error", node);
				return false;
			}

			return true;
		};

		var isHashed = function (node) {
			ASSERT(isValidNode(node));

			return typeof node.data === "object" && node.data !== null
			&& typeof node.data[KEYNAME] === "string";
		};

		var getHash = function (node) {
			ASSERT(isValidNode(node));

			return node.data[KEYNAME];
		};

		var addHash = function (node) {
			ASSERT(isValidNode(node) && isMutable(node));

			return node.data[KEYNAME] = false;
		};

		// data === MISSING : non-existent but valid branch
		// data === undefined : something is wrong with the path
		var attacher = function (node) {
			ASSERT(isValidNode(node) && isValidNode(node.parent));

			if( node.parent.data !== null && typeof node.parent.data === "object" ) {
				var data = node.parent.data[node.relid];

				if( typeof data === "string" && data.length === 41 && typeof node.data === "object"
				&& node.data !== null && node.data[KEYNAME] === data ) {
					// do nothing
				}
				else if( typeof data === "undefined" ) {
					node.data = MISSING;
				}
				else {
					node.data = data;
				}
			}
			else {
				node.data = undefined;
			}
		};

		var detacher = function () {
		};

		var corepath = new CorePath(attacher, detacher, options);
		var KEYNAME = storage.KEYNAME;

		var isValidRelid = corepath.isValidRelid;

		var createRoot = function () {
			var root = corepath.createRoot();

			root.data = {
				_mutable: true
			};

			return root;
		};

		var getChildrenRelids = function (node) {
			ASSERT(isValidNode(node));

			var array = Object.keys(node.data);

			var index = array.indexOf("_mutable");
			if( index >= 0 ) {
				array.splice(index, 1);
			}

			return array;
		};

		var getChild = function (node, relid) {
			ASSERT(isValidNode(node) && isValidRelid(relid));

			var child = corepath.getChild(node, relid);

			var data = node.data[relid];
			ASSERT(typeof data === "undefined" || typeof data === "object");

			if( typeof data === "undefined" ) {
				child.data = null;
			}
			else {
				child.data = data;
			}

			return child;
		};

		var mutate = function (node) {
			ASSERT(isValidNode(node));

			node = corepath.attach(node);

			var data = node.data;
			if( !data._mutable ) {
				var copy = {
					_mutable: true
				};

				for( var key in data ) {
					copy[key] = data[key];
				}

				if( data[KEYNAME] !== undefined ) {
					copy[KEYNAME] = false;
				}

				ASSERT(copy._mutable === true);

				node.data = copy;

				if( node.parent ) {
					mutate(node.parent);
					node.parent.data[node.relid] = copy;
				}
			}
		};

		var createChild = function (node, relid) {
			ASSERT(isValidNode(node) && isValidRelid(relid));

			mutate(node);

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

		var deleteChild = function (node, relid) {
			ASSERT(isValidNode(node) && isMutable(node) && isValidRelid(relid));

			delete node.data[relid];
		};

		var loadRoot = function (key, callback) {
			ASSERT(typeof key === "string" && typeof callback === "function");

			storage.load(key, function (err, data) {
				ASSERT(err || data[KEYNAME] === key);
				callback(err, err ? undefined : {
					data: data,
					parent: null,
					relid: undefined
				});
			});
		};

		var loadChild = function (node, relid, callback) {
			ASSERT(isValidNode(node) && isValidRelid(relid) && typeof callback === "function");

			var child = node.data[relid];

			if( child === undefined ) {
				UTIL.immediateCallback(callback, null, undefined);
			}
			else if( typeof child === "string" ) {
				ASSERT(isValidKey(child));

				storage.load(child, function (err, data) {
					ASSERT(err || data === null || data[KEYNAME] === child);

					if( !err && !data ) {
						err = new Error("child hash not found: " + child);
					}

					callback(err, data ? {
						data: data,
						parent: node,
						relid: relid
					} : undefined);
				});
			}
			else {
				ASSERT(typeof child === "object");

				UTIL.immediateCallback(callback, null, {
					data: child,
					parent: node,
					relid: relid
				});
			}
		};

		var loadByPath = function (node, path, callback) {
			ASSERT(isValidNode(node) && typeof callback === "function");
			ASSERT(typeof path === "string");

			var loadNext = function (err, node) {
				if( err ) {
					callback(err);
				}
				else if( !node || path.length === 0 ) {
					UTIL.immediateCallback(callback, null, node);
				}
				else {
					var relid = path.pop();
					loadChild(node, relid, loadNext);
				}
			};

			loadNext(null, node);
		};

		var getParent = function (node) {
			ASSERT(isValidNode(node));
			return node.parent;
		};

		var delParent = function (node) {
			ASSERT(isValidNode(node));
			ASSERT(isValidNode(node.parent));

			mutate(node.parent);
			delete node.parent.data[node.relid];

			node.parent = null;
			node.relid = undefined;
		};

		var setParent = function (node, parent, relid) {
			ASSERT(isValidNode(node) && isValidRelid(relid));
			ASSERT(node.parent === null && !node.relid);
			ASSERT(parent.data[relid] === undefined);

			mutate(parent);
			parent.data[relid] = node.data[KEYNAME] || node.data;

			node.parent = parent;
			node.relid = relid;
		};

		var isMutable = function (node) {
			ASSERT(isValidNode(node));
			return node.data._mutable;
		};

		var copyData = function (data) {
			if( typeof data !== "object" || !data._mutable ) {
				return data;
			}

			var copy = {};

			for( var key in data ) {
				copy[key] = copyData(data[key]);
			}

			return copy;
		};

		var copyNode = function (node) {
			ASSERT(isValidNode(node));

			return {
				data: copyData(node.data),
				parent: null,
				relid: undefined
			};
		};

		var Saver = function (callback) {
			ASSERT(typeof callback === "function");

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
					storage.fsync(function (err) {
						callback(error || err);
						callback = null;
					});
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

			key = data[KEYNAME];
			ASSERT(key === false || key === undefined);

			if( key === false ) {
				key = "#" + SHA1(JSON.stringify(data));
				data[KEYNAME] = key;

				this.start();
				storage.save(data, this.done);
			}

			return key;
		};

		// TODO: rewrite it using UTIL.AsyncJoin
		var persist = function (node, callback) {
			ASSERT(isValidNode(node) && isHashed(node));

			var saver = new Saver(callback);
			var key = isMutable(node) ? saver.save(node.data) : getHash(node);
			saver.done(null);

			if( node.parent ) {
				node.parent.data[node.relid] = key;
			}

			return key;
		};

		var getProperty = function (node, name) {
			ASSERT(isValidNode(node) && isValidRelid(name));

			return node.data[name];
		};

		var setProperty = function (node, name, value) {
			ASSERT(isValidNode(node) && isValidRelid(name));

			mutate(node);
			node.data[name] = value;
		};

		var delProperty = function (node, name) {
			ASSERT(isValidNode(node) && isValidRelid(name));

			mutate(node);
			delete node.data[name];
		};

		var isEmpty = function (node) {
			ASSERT(isValidNode(node));

			var s;
			for( s in node.data ) {
				return false;
			}

			return true;
		};

		var getProperty2 = function (node, name1, name2) {
			ASSERT(isValidNode(node) && isValidRelid(name1) && isValidRelid(name2));

			var a = node.data[name1];
			return a === undefined ? a : a[name2];
		};

		var setProperty2 = function (node, name1, name2, value) {
			ASSERT(isValidNode(node) && isValidRelid(name1) && isValidRelid(name2));

			node = getChild(node, name1);
			mutate(node);
			node.data[name2] = value;
		};

		var delProperty2 = function (node, name1, name2) {
			ASSERT(isValidNode(node) && isValidRelid(name1) && isValidRelid(name2));

			node = getChild(node, name1);
			mutate(node);
			delete node.data[name2];
		};

		var dumpTree = function (key, callback) {
			ASSERT(typeof key === "string" && typeof callback === "function");

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
				ASSERT(data && typeof data === "object" && isValidRelid(relid));

				var key = data[relid];
				ASSERT(isValidKey(key));

				++counter;

				storage.load(key, function (err, child) {
					ASSERT(err || child);

					if( !err ) {
						var copy = UTIL.deepCopy(child);

						data[relid] = copy;
						scan(copy);

						// copy.id = child[KEYNAME];
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

					if( relid !== KEYNAME && isValidKey(child) ) {
						load(data, relid);
					}
					else if( child && typeof child === "object" ) {
						scan(child);
					}
				}
			};

			storage.load(key, function (err, data) {
				ASSERT(err || data[KEYNAME] === key);

				root = UTIL.deepCopy(data);
				scan(root);

				decrease();
			});
		};

		return {
			isValidKey: isValidKey,
			isValidNode: isValidNode,
			isHashed: isHashed,
			getHash: getHash,
			addHash: addHash,
			createRoot: createRoot,
			loadRoot: loadRoot,
			createChild: createChild,
			getChild: getChild,
			getChildrenRelids: getChildrenRelids,
			loadChild: loadChild,
			deleteChild: deleteChild,
			loadByPath: loadByPath,
			getParent: getParent,
			setParent: setParent,
			delParent: delParent,
			getPath: corepath.getPath,
			getLevel: corepath.getLevel,
			getAncestor: corepath.getAncestor,
			getRoot: corepath.getRoot,
			getRelid: corepath.getRelid,
			isAncestor: corepath.isAncestorOf,
			isMutable: isMutable,
			mutate: mutate,
			persist: persist,
			copyNode: copyNode,
			getProperty: getProperty,
			setProperty: setProperty,
			delProperty: delProperty,
			isEmpty: isEmpty,
			getProperty2: getProperty2,
			setProperty2: setProperty2,
			delProperty2: delProperty2,
			dumpTree: dumpTree
		};
	};

	return CoreTree;
});
