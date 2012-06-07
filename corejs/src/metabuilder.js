/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define(
[ "assert", "branch", "util", "config" ],
function (ASSERT, Branch, UTIL, CONFIG) {
	"use strict";

	var comparePaths = function (a, b) {
		ASSERT(a.constructor === Array);
		ASSERT(b.constructor === Array);

		var c = a.length;
		var d = b.length;

		while( --c >= 0 && --d >= 0 ) {
			var t = a[c] - b[d];
			if( t !== 0 ) {
				return t;
			}
		}

		return a.length - b.length;
	};

	var builder = function (storage, key, callback) {
		var branch = new Branch(storage);

		var metaroot = branch.createNode();
		var paradigm = branch.createNode();
		branch.attach(paradigm, metaroot);

		var copyAttributes = function (xmlNode, metaNode, attrs) {
			if( !attrs ) {
				attrs = Object.keys(branch.getAttributes(xmlNode));
			}

			for( var i = 0; i < attrs.length; ++i ) {
				var attr = attrs[i];
				ASSERT(typeof attr === "string");
				var value = branch.getAttribute(xmlNode, attr);
				if( value ) {
					branch.setAttribute(metaNode, attr, value);
				}
			}
		};

		var getDefinedNode = function (startNode, name) {
			ASSERT(startNode && name);
		};
		
		var metaAttributes = {};
		var parseMetaAttribute = function (xmlnode) {
			ASSERT(xmlnode && callback);

			var path = branch.getStringPath(xmlnode);
			var meta = metaAttributes[path];
			if( !meta ) {
				meta = branch.createNode();
				branch.attach(meta, paradigm);

				copyAttributes(xmlnode, meta);
				metaAttributes[path] = meta;
			}
			return meta;
		};

		var getMetaAttribute = function (xmlnode, name, callback) {
			
		};
		
		
		var enqueue = UTIL.priorityEnqueue(CONFIG.reader.concurrentReads, comparePaths, function (
		err) {
			if( err ) {
				console.log("Building error: " + JSON.stringify(err));
				callback(err);
			}
			else {
				console.log("Building done");
				branch.persist(metaroot, function (err2) {
					console.log("Saving meta " + (err2 ? " error:" + err2 : "done"));
					branch.dumpTree(branch.getKey(metaroot), function (err3) {
						callback(err2);
					});
				});
			}
		});

		var getChildByTag = function (node, name, callback2) {
			branch.loadChildren(node, function (err, children) {
				if( err ) {
					callback2(err);
				}
				else {
					for( var i = 0; i < children.length; ++i ) {
						if( branch.getAttribute(children[i], "#tag") === name ) {
							callback2(null, children[i]);
							return;
						}
					}
					callback2(null, null);
				}
			});
		};

		var process = function (path, done, node) {
			var errorHandler = UTIL.errorHandler(done);

			var tag = branch.getAttribute(node, "#tag");

			if( branch.getLevel(node) === 1 && tag !== "paradigm" ) {
				errorHandler("Not a meta paradigm");
				return;
			}

			if( tag === "attrdef" ) {
				var metaobj = branch.createNode();
				branch.attach(metaobj, paradigm);

				copyAttributes(node, metaobj);
			}

			if( tag === "paradigm" ) {

				copyAttributes(node, paradigm);

				getChildByTag(node, "comment", errorHandler(function (node2) {
					if( node2 ) {
						branch
						.setAttribute(paradigm, "comment", branch.getAttribute(node2, "text"));
					}
				}));

				getChildByTag(
				node,
				"author",
				errorHandler(function (node2) {
					if( node2 ) {
						branch.setAttribute(paradigm, "author", branch.getAttribute(node2, "text"));
					}
				}));

				getChildByTag(node, "dispname", errorHandler(function (node2) {
					if( node2 ) {
						branch.setAttribute(paradigm, "dispname", branch
						.getAttribute(node2, "text"));
					}
				}));
			}

			branch.loadChildren(node, errorHandler(function (children) {
				for( var i = 0; i < children.length; ++i ) {
					var child = children[i];
					enqueue(branch.getPath(child), process, child);
				}
			}));

			errorHandler(null);
		};

		branch.loadRoot(key, function (err, node) {
			if( err ) {
				callback(err);
			}
			else {
				console.log("Building meta objects ...");
				enqueue(branch.getPath(node), process, node);
			}
		});
	};

	return builder;
});
