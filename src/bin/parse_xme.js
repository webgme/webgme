/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */
//TODO this is an outdated file, will be updated and maintained in the future.
if (typeof define !== "function") {
	var requirejs = require("requirejs");

	requirejs.config({
		nodeRequire: require,
		baseUrl: __dirname + "/.."
	});

	requirejs([ "util/common", "util/assert", "core/tasync", "bin/parse_xme" ], function (COMMON, ASSERT, TASYNC, parser) {
		"use strict";

        console.log('we are in',typeof define);
		TASYNC.trycatch(main, function (error) {
			console.log(error.trace || error.stack);

			COMMON.setProgress(null);
			COMMON.closeProject();
			COMMON.closeDatabase();
		});

		function main () {
			var args = COMMON.getParameters(null);

			if (args.length < 1 || COMMON.getParameters("help") !== null) {
				console.log("Usage: node parse_xme.js <xmlfile> [options]");
				console.log("");
				console.log("Parses a GME xme file and stores it int a WEBGME database. Possible options:");
				console.log("");
				console.log("  -mongo [database [host [port]]]\topens a mongo database");
				console.log("  -proj <project>\t\t\tselects the given project");
				console.log("  -branch <branch>\t\t\tselects the branch to be overwritten");
				console.log("  -help\t\t\t\t\tprints out this help message");
				console.log("");
				return;
			}

			var xmlfile = args[0];

			var branch = COMMON.getParameters("branch");
			if (branch) {
				branch = branch[0] || "parsed";
			}

			var done = TASYNC.call(COMMON.openDatabase);
			done = TASYNC.call(COMMON.openProject, done);
			var core = TASYNC.call(COMMON.getCore, done);
			var hash = TASYNC.call(parser, xmlfile, core);
			done = TASYNC.call(writeBranch, branch, hash);
			done = TASYNC.call(COMMON.closeProject, done);
			done = TASYNC.call(COMMON.closeDatabase, done);

			return done;
		}

		function writeBranch (branch, hash) {
			if (typeof branch === "string") {
				var project = COMMON.getProject();
				var oldhash = project.getBranchHash(branch, null);
				var done = TASYNC.call(project.setBranchHash, branch, oldhash, hash);
				return TASYNC.call(function () {
					console.log("Commit " + hash + " written to branch " + branch);
				}, done);
			} else {
				console.log("Created commit " + hash);
			}
		}
	});
} else {
    define([ "util/assert", "core/tasync", "util/common" ], function (ASSERT, TASYNC, COMMON) {
        function parser (xmlfile, core) {
            var root = core.createNode(), stack = [], objects = 1;
            var global = {
                ids: {},
                cps: [],
                refs: [],
                typs: []
            };

            function opentag (tag) {
                var name = tag.name;

                if (name === "project") {
                    ASSERT(stack.length === 0);
                    tag.node = root;
                    var guid = tag.attributes['guid'];
                    // TODO: somehow it needs to adapted better to our guid storage needs
                    guid = guid.replace(/[{,},-]/g,"");
                    core.setAttribute(root,"_relguid",guid);
                } else if (name === "folder" || name === "model" || name === "atom" || name === "connection" || name === "reference" || name === "set") {
                    ASSERT(stack.length >= 1);
                    //**********
                    var relid = Number(tag.attributes['relid'])+"";
                    if(relid === "NaN"){
                        relid = undefined;
                    }
                    var guid = tag.attributes['guid'];
                    guid = guid.replace(/[{,}]/g,"");
                    tag.node = core.createNode({parent:stack[stack.length - 1].node,relid:relid,guid:guid});
                    core.setRegistry(tag.node,'refPortCount',0);
                    //**********
                    objects += 1;
                }

                tag.parent = stack.length === 0 ? null : stack[stack.length - 1];
                tag.text = "";
                stack.push(tag);
            }

            function addtext (text) {
                if (stack.length !== 0) {
                    var tag = stack[stack.length - 1];
                    tag.text += text;
                }
            }

            function getstat () {
                return objects + " gme objects";
            }

            function closetag (name) {
                ASSERT(stack.length >= 1);

                var tag = stack.pop();
                ASSERT(tag.name === name);

                if (name === "project" || name === "folder" || name === "model" || name === "atom" || name === "connection" || name === "reference" || name === "set") {
                    parseObject(core, tag, global);
                } else if (name === "author" || name === "comment") {
                    parseComment(core, tag);
                } else if (name === "name") {
                    parseName(core, tag);
                } else if (name === "value") {
                    parseValue(core, tag);
                } else if (name === "connpoint") {
                    parseConnPoint(core, tag, global);
                } else {
                    ASSERT(name === "attribute" || name === "regnode" || name === "connpoint");
                }
            }

            var done = COMMON.saxParse(xmlfile, {
                opentag: opentag,
                closetag: closetag,
                text: addtext,
                getstat: getstat
            });

            done = TASYNC.call(resolveAll, core, root, global, done);
            var hash = TASYNC.call(persist, core, root, done);
            hash = TASYNC.call(makeCommit, xmlfile, hash);

            return hash;
        }

        function persist (core, root) {
            console.log("Waiting for objects to be saved ...");
            var done = core.persist(root);
            var hash = core.getHash(root);
            return TASYNC.join(hash, done);
        }

        function makeCommit (xmlfile, hash) {
            console.log('Making commit for root hash:',hash);
            var project = COMMON.getProject();
            hash = project.makeCommit([], hash, "parsed " + xmlfile);
            return hash;
        }

        var registry = {
            //guid: "guid",
            cdate: "created",
            mdate: "modified",
            version: "version",
            metaname: "metaname",
            metaguid: "metaguid",
            metaversion: "metaversion",
            id: "id",
            relid: "relid",
            kind: "kind",
            role: "role",
            isinstance: "isinstance",
            isprimary: "isprimary"
        };

        var POSITION_KEY_REGEXP = new RegExp("^PartRegs/.*/Position$");
        var POSITION_VAL_REGEXP = new RegExp("^([0-9]*),([0-9]*)$");

        function parseObject (core, tag, global) {
            var key = null;
            for (key in registry) {
                if (typeof tag.attributes[key] !== "undefined") {
                    core.setRegistry(tag.node, registry[key], tag.attributes[key]);
                }
            }

            if (typeof tag.attributes.id !== "undefined") {
                if (typeof global.ids[tag.attributes.id] === "undefined") {
                    global.ids[tag.attributes.id] = tag.node;
                } else {
                    console.log("Warning: multiple object with the same id: " + tag.attributes.id);
                }
            }

            core.setRegistry(tag.node, "metameta", tag.name);
            core.setRegistry(tag.node, "isPort", tag.name === "atom");

            //create empty decorator registry field if not present
            if (!core.getRegistry(tag.node, "decorator")) {
                core.setRegistry(tag.node, "decorator", "");
            }
            

            if (tag.name === "connection") {
                core.setRegistry(tag.node, "isConnection", true);
            } else {
                setPosition(core, tag.node);
            }

            if (tag.name === "reference" && tag.attributes.referred) {
                global.refs.push({
                    node: tag.node,
                    referred: tag.attributes.referred
                });
            }

            if (tag.attributes.derivedfrom && tag.attributes.isprimary === "yes") {
                global.typs.push({
                    node: tag.node,
                    base: tag.attributes.derivedfrom
                });
            }
        }

        function setPosition (core, node) {
            var pos = core.getRegistry(node, "PartRegs/All/Position");
            if (!pos) {
                var i, names = core.getRegistryNames(node);
                for (i = 0; i < names.length; ++i) {
                    var key = POSITION_KEY_REGEXP.exec(names[i]);
                    if (key) {
                        pos = core.getRegistry(node, names[i]);
                        break;
                    }
                }
            }

            if (pos) {
                pos = POSITION_VAL_REGEXP.exec(pos);
                if (pos) {
                    pos = {
                        x: parseInt(pos[1], 10),
                        y: parseInt(pos[2], 10)
                    };
                }
            }

            pos = pos || {
                x: 0,
                y: 0
            };

            core.setRegistry(node, "position", pos);
        }

        function parseConnPoint (core, tag, global) {
            ASSERT(tag.parent.node);

            var entry = tag.attributes;
            entry.node = tag.parent.node;

            global.cps.push(entry);
        }

        function parseComment (core, tag) {
            ASSERT(tag.parent);
            core.setRegistry(tag.parent.node, tag.name, tag.text);
        }

        function parseName (core, tag) {
            ASSERT(tag.parent);
            core.setAttribute(tag.parent.node, tag.name, tag.text);
        }

        function parseValue (core, tag) {
            ASSERT(tag.parent);

            if (tag.parent.name === "attribute") {
                ASSERT(tag.parent.parent.node);
                core.setAttribute(tag.parent.parent.node, tag.parent.attributes['kind'], tag.text);
            } else {
                ASSERT(tag.parent.name === "regnode");
                var status = tag.parent.attributes.status || "defined";
                if (status !== "undefined") {
                    var parent = tag.parent;
                    var path = parent.attributes.name;
                    parent = parent.parent;

                    while (parent.name === "regnode") {
                        path = parent.attributes.name + "/" + path;
                        parent = parent.parent;
                    }

                    ASSERT(parent.node);

                    // this actually happens
                    if (path !== "" && tag.text !== "") {
                        var val;
                        try {
                            val = JSON.parse(tag.text);
                        } catch (e) {
                            val = tag.text;
                        }
                        core.setRegistry(parent.node, path, val);
                    }
                }
            }
        }

        function resolveAll (core, root, global) {
            console.log("Resolving references ...");

            var done = true, i;
            for (i = 0; i < global.refs.length; ++i) {
                resolveReference(core, global.ids, global.refs[i]);
            }

            for (i = 0; i < global.typs.length; ++i) {
                resolveBasetype(core, global.ids, global.typs[i]);
            }

            for (i = 0; i < global.cps.length; ++i) {
                done = TASYNC.join(done, resolveConnPoint(core, global.ids, global.cps[i]));
            }

            return done;
        }

        function resolveReference (core, ids, ref) {
            var target = ids[ref.referred];
            if (target) {
                core.setPointer(ref.node, "target", target);
            } else {
                console.log("Warning: could not find id " + ref.referred);
            }
        }

        function resolveBasetype (core, ids, typ) {
            var target = ids[typ.base];
            if (target) {
                core.setPointer(typ.node, "proto", target);
            } else {
                console.log("Warning: could not find id " + typ.based);
            }
        }

        function resolveConnPoint (core, ids, cp) {
            var role = cp.role;
            if (role === "src") {
                role = "source";
            } else if (role === "dst") {
                role = "target";
            } else {
                console.log("Unknown connection point role: " + role);
                return;
            }

            var target = ids[cp.target];
            if (!target) {
                console.log("Warning: could not find id " + cp.target);
                return;
            }

            if (cp.refs) {
                var ref = ids[cp.refs.split(" ")[0]];
                if (!ref) {
                    console.log("Warning: unknown refport references " + cp.refs);
                    return;
                }

                var children = core.loadChildren(ref);
                return TASYNC.call(resolveRefPort, core, cp.node, role, ref, target, cp.target, children);
            } else {
                core.setPointer(cp.node, role, target);
            }
        }

        function resolveRefPort (core, source, role, reference, target, targetid, children) {
            ASSERT(children instanceof Array);

            var i, refport = null;
            for (i = 0; i < children.length; ++i) {
                var id = core.getRegistry(children[i], "id");
                if (id === targetid) {
                    refport = children[i];
                    break;
                }
            }

            if (!refport) {
                refport = core.createNode({parent:reference,relid:""+core.getRegistry(reference,"refPortCount")});
                core.setRegistry(reference,'refPortCount',core.getRegistry(reference,"refPortCount")+1);
                core.setAttribute(refport, "name", core.getAttribute(target, "name"));
                core.setRegistry(refport, "position", core.getRegistry(target, "position"));
                core.setRegistry(refport, "id", targetid);
                core.setRegistry(refport, "metameta", "refport");
                core.setRegistry(refport, "isPort", true);
            }

            core.setPointer(source, role, refport);
        }

        return parser;
    });
}


