/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define(
[ "core/assert", "core/lib/sha1", "core/util" ],
function (ASSERT, SHA1, UTIL) {
	"use strict";

	// ----------------- PersistentTree -----------------

	var keyregexp = new RegExp("#[0-9a-f]{40}");

	var isKey = function (key) {
		return typeof key === "string" && key.length === 41 && keyregexp.test(key);
	};

	var isRelid = function (relid) {
		return typeof relid === "string" || typeof relid === "number";
	};

	var EMPTY_STRING = "";

	var joinStringPaths = function (first, second) {
		ASSERT(typeof first === "string");
		ASSERT(typeof second === "string");

		return second === EMPTY_STRING ? first : (first === EMPTY_STRING ? second : first + "/"
		+ second);
	};

	var PersistentTree = function (storage) {
		ASSERT(storage);

		var KEYNAME = storage.KEYNAME;

		var isValid = function (node) {
			var valid = node && node.data && typeof node.data === "object";
			valid = valid
			&& (node.parent === null || (node.parent.data && typeof node.parent.data === "object"));

			valid = valid && (node.data._mutable === undefined || node.data._mutable === true);
			valid = valid
			&& (node.parent === null || node.data._mutable === undefined || node.parent.data._mutable === true);

			valid = valid && (node.relid === undefined || isRelid(node.relid));

			if( valid ) {
				var key = node.data[KEYNAME];
				valid = valid && (key === undefined || key === false || isKey(key));

				valid = valid
				&& (node.parent === null || !key || node.parent.data[node.relid] === key);
				valid = valid
				&& (node.parent === null || key || node.parent.data[node.relid] === node.data);
				valid = valid && (!node.data._mutable || typeof key !== "string");
			}

			if( !valid ) {
				console.log("Wrong node: " + JSON.stringify(node));
			}

			return valid;
		};

		var getKey = function (node) {
			ASSERT(isValid(node));
			return node.data[KEYNAME];
		};

		var addKey = function (node) {
			ASSERT(isValid(node));
			ASSERT(isMutable(node));

			return node.data[KEYNAME] = false;
		};

		var delKey = function (node) {
			ASSERT(isValid(node));
			ASSERT(isMutable(node));

			delete node.data[KEYNAME];
		};

		var createRoot = function () {
			var data = {
				_mutable: true
			};
			data[KEYNAME] = false;

			return {
				data: data,
				parent: null,
				relid: undefined
			};
		};

		var getChildrenRelids = function (node) {
			ASSERT(isValid(node));
			
			return Object.keys(node.data);
		};
		
		var createChild = function (node, relid) {
			ASSERT(isValid(node) && isRelid(relid));

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

		var getChild = function (node, relid) {
			ASSERT(isValid(node) && isRelid(relid));

			var child = node.data[relid];
			if( !child ) {
				return null;
			}

			ASSERT(typeof child === "object");
			return {
				data: child,
				parent: node,
				relid: relid
			};
		};

		var deleteChild = function (node, relid) {
			ASSERT(isValid(node) && isMutable(node) && isRelid(relid));

			delete node.data[relid];
		};

		var loadRoot = function (key, callback) {
			ASSERT(typeof key === "string");
			ASSERT(callback);

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
			ASSERT(isValid(node) && isRelid(relid));

			var child = node.data[relid];
			ASSERT(child && (typeof child === "object" || isKey(child)));

			if( typeof child === "string" ) {
				storage.load(child, function (err, data) {
					ASSERT(err || data[KEYNAME] === child);
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

		var loadByPath = function (node, path, callback) {
			ASSERT(isValid(node));
			ASSERT(typeof path === "string" || path.constructor === Array);
			ASSERT(callback);

			if( typeof path === "string" ) {
				path = parseStringPath(path);
			}

			var index = path.length;
			var relid;

			var done = function (err, data) {
				if( err ) {
					callback(err);
					return;
				}

				ASSERT(data[KEYNAME] === node.data[relid]);
				node = {
					data: data,
					parent: node,
					relid: relid
				};

				next();
			};

			var next = function () {
				while( index !== 0 ) {
					ASSERT(isValid(node));

					relid = path[--index];
					ASSERT(isRelid(relid));

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

		var getParent = function (node) {
			ASSERT(isValid(node));
			return node.parent;
		};

		var delParent = function (node) {
			ASSERT(isValid(node));
			ASSERT(isValid(node.parent));

			mutate(node.parent);
			delete node.parent.data[node.relid];

			node.parent = null;
			node.relid = undefined;
		};

		var setParent = function (node, parent, relid) {
			ASSERT(isValid(node));
			ASSERT(node.parent === null && !node.relid);
			ASSERT(isRelid(relid));

			mutate(parent);
			parent.data[relid] = node.data;

			node.parent = parent;
			node.relid = relid;
		};

		var getPath = function (node, base) {
			ASSERT(isValid(node));
			ASSERT(base === undefined || isValid(base));

			var path = [];
			while( node.parent && node !== base ) {
				path.push(node.relid);
				node = node.parent;
			}

			return path;
		};

		var getLevel = function (node, base) {
			ASSERT(isValid(node));
			ASSERT(base === undefined || isValid(base));

			var level = 0;
			while( node.parent && node !== base ) {
				++level;
				node = node.parent;
			}

			return level;
		};

		var getStringPath = function (node, base) {
			ASSERT(isValid(node));
			ASSERT(base === undefined || isValid(base));

			var path = EMPTY_STRING;
			while( node.parent && node !== base ) {
				if( path === EMPTY_STRING ) {
					path = node.relid;
				}
				else {
					path = node.relid + "/" + path;
				}
				node = node.parent;
			}

			return path;
		};

		var parseStringPath = function (path) {
			ASSERT(path && typeof path === "string");

			return path.length === 0 ? [] : path.split("/").reverse();
		};

		var getRelid = function (node) {
			ASSERT(isValid(node));
			return node.relid;
		};

		var getRoot = function (node) {
			ASSERT(isValid(node));

			while( node.parent ) {
				node = node.parent;
			}

			return node;
		};

		var getCommonAncestor = function (first, second) {
			ASSERT(isValid(first));
			ASSERT(isValid(second));

			var a = [];
			do {
				a.push(first);
				first = first.parent;
			} while( first );

			var b = [];
			do {
				b.push(second);
				second = second.parent;
			} while( second );

			var i = a.length - 1;
			var j = b.length - 1;
			while( i >= 1 && j >= 1 && a[i - 1].relid === b[j - 1].relid ) {
				--i;
				--j;
			}

			return [ a[i], b[j] ];
		};

		var isAncestorOf = function (first, second) {
			ASSERT(isValid(first));
			ASSERT(isValid(second));

			var a = [];
			while( (first = first.parent) !== undefined ) {
				a.push(first);
			}

			var b = [];
			while( (second = second.parent) !== undefined ) {
				b.push(second);
			}

			if( a.length > b.length ) {
				return false;
			}

			for( var i = 0; i < a.length; ++i ) {
				if( a[i].relid !== b[i].relid ) {
					return false;
				}
			}

			return true;
		};

		var isMutable = function (node) {
			ASSERT(isValid(node));
			return node.data._mutable;
		};

		var mutate = function (node) {
			ASSERT(isValid(node));

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
			ASSERT(isValid(node));
			ASSERT(isMutable(node));
			ASSERT(getKey(node) !== undefined);

			var saver = new Saver(callback);
			var key = saver.save(node.data);
			saver.done(null);

			if( node.parent ) {
				node.parent.data[node.relid] = key;
			}

			return key;
		};

		var getProperty = function (node, name) {
			ASSERT(isValid(node) && isRelid(name));

			return node.data[name];
		};

		var setProperty = function (node, name, value) {
			ASSERT(isValid(node) && isRelid(name));

			mutate(node);
			node.data[name] = value;
		};

		var delProperty = function (node, name) {
			ASSERT(isValid(node) && isRelid(name));

			mutate(node);
			delete node.data[name];
		};

		var isEmpty = function (node) {
			ASSERT(isValid(node));

			var s;
			for( s in node.data ) {
				return false;
			}

			return true;
		};

		var getProperty2 = function (node, name1, name2) {
			ASSERT(isValid(node) && isRelid(name1) && isRelid(name2));

			var a = node.data[name1];
			return a === undefined ? a : a[name2];
		};

		var setProperty2 = function (node, name1, name2, value) {
			ASSERT(isValid(node) && isRelid(name1) && isRelid(name2));

			node = getChild(node, name1);
			mutate(node);
			node.data[name2] = value;
		};

		var delProperty2 = function (node, name1, name2) {
			ASSERT(isValid(node) && isRelid(name1) && isRelid(name2));

			node = getChild(node, name1);
			mutate(node);
			delete node.data[name2];
		};

		var dumpTree = function (key, callback) {
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
				ASSERT(data && typeof data === "object" && isRelid(relid));

				var key = data[relid];
				ASSERT(isKey(key));

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

					if( relid !== KEYNAME && isKey(child) ) {
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
			isKey: isKey,
			isValid: isValid,
			getKey: getKey,
			addKey: addKey,
			delKey: delKey,
			createRoot: createRoot,
			loadRoot: loadRoot,
			createChild: createChild,
			getChild: getChild,
			loadChild: loadChild,
			deleteChild: deleteChild,
			loadByPath: loadByPath,
			getParent: getParent,
			setParent: setParent,
			delParent: delParent,
			getPath: getPath,
			getLevel: getLevel,
			getStringPath: getStringPath,
			joinStringPaths: joinStringPaths,
			parseStringPath: parseStringPath,
			getRoot: getRoot,
			getRelid: getRelid,
			getCommonAncestor: getCommonAncestor,
			isAncestorOf: isAncestorOf,
			isMutable: isMutable,
			mutate: mutate,
			persist: persist,
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

	return PersistentTree;
});
