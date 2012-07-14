/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/lib/sax", "fs", "core/core2", "core/config" ], function (ASSERT, SAX,
FS, Core, CONFIG) {
	"use strict";

	return function (storage, filename, callback) {
		ASSERT(storage && filename && callback);

		var ids = {};
		var idCount = 0;

		var timerhandle = setInterval(function () {
			console.log("  at line " + parser._parser.line + " (" + total + " objects, " + idCount
			+ " ids)");
		}, CONFIG.parser.reportingTime);

		var core = new Core(storage);

		var exit = function (err, result) {
			if( timerhandle ) {
				clearInterval(timerhandle);
				timerhandle = undefined;
			}

			if( callback ) {
				callback(err, result);
				callback = undefined;
			}
		};

		var tags = [];

		var persisting = 1;
		var persist = function () {
			ASSERT(tags.length !== 0);
			ASSERT(persisting >= 1);

			core.persist(tags[0].node, function (err) {
				if( err ) {
					exit(err);
				}
				else if( --persisting === 0 ) {
					var key = core.getKey(tags[0].node);

					console.log("Parsing done (" + total + " objects, " + idCount + " ids)");
					console.log("Root key = " + key);

					tags = null;
					core = null;

					exit(null, key);
				}
			});
		};

		var total = 0;
		var counter = 0;

		var addTag = function (tag) {

			var node = core.createNode(tags.length === 0 ? null : tags[tags.length - 1].node);

			for( var key in tag.attributes ) {
				core.setAttribute(node, key, tag.attributes[key]);
			}

			core.setAttribute(node, "#tag", tag.name);

			if( tag.attributes.id ) {
				ASSERT(ids[tag.attributes.id] === undefined);

				ids[tag.attributes.id] = core.getStringPath(node);
				++idCount;
			}

			tag.text = "";
			tag.node = node;

			++total;
			if( ++counter >= CONFIG.parser.persistingLimit ) {
				++persisting;
				persist();
				counter = 0;
			}

			tags.push(tag);
		};

		addTag({
			name: "Root",
			attributes: {
				created: (new Date()).toString()
			}
		});

		var parser = SAX.createStream(true, {
			trim: true
		});

		parser.on("opentag", addTag);

		parser.on("closetag", function (name) {
			ASSERT(tags.length >= 2);

			var tag = tags.pop();
			ASSERT(tag.name === name);

			if( tag.text !== "" ) {
				core.setAttribute(tag.node, "#text", tag.text);
			}
		});

		parser.on("text", function (text) {
			if( tags.length !== 0 ) {
				var tag = tags[tags.length - 1];
				tag.text += text;
			}
		});

		parser.on("error", function (err) {
			exit("Unknown parser error: " + JSON.stringify(err));
		});

		parser.on("end", function () {
			ASSERT(tags.length === 1);
			core.setAttribute(tags[0].node, "#ids", ids);
			persist();
		});

		var stream = FS.createReadStream(filename);

		stream.on("error", function (err) {
			exit(err.code === "ENOENT" ? "File not found: " + filename : "Unknown file error: "
			+ JSON.stringify(err));
		});

		stream.on("open", function () {
			console.log("Parsing xml file ...");
			stream.pipe(parser);
		});
	};
});
