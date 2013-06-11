/*var mynumber = 0x2
console.log(Number(mynumber));
var othernumber = 1115;
console.log('0x'+othernumber.toString(16));
console.log(Number('0x'+othernumber.toString(16)));
console.log((new Date()));
var fs = require('fs');
var hugeString = "";
var item = "abcdefghijklmnopqrstuvwxyz";
for(var i=0;i<10000000;i++){
    hugeString+=item+"\n";
}
console.log((new Date()));
fs.appendFileSync('mytest.txt', hugeString);
console.log((new Date()));

console.log('big loading test');
console.log((new Date()));
var file1 = fs.readFileSync('IFV.xme','utf8');
console.log((new Date()));
var file2 = fs.readFileSync('IFV.xme','utf8');
console.log((new Date()));
var file3 = fs.readFileSync('IFV.xme','utf8');
console.log((new Date()));

var ASSERT = function(value){};*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

if (typeof define !== "function") {
    var requirejs = require("requirejs");

    requirejs.config({
        nodeRequire: require,
        baseUrl: __dirname + "/.."
    });

    requirejs([ "util/common", "util/assert", "core/tasync", "bin/serialize_to_xml" ], function (COMMON, ASSERT, TASYNC, serializer) {
        "use strict";

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
                console.log("  -branch <branch>\t\t\tthe branch to serialize");
                console.log("  -hash <hash>\t\t\tthe root hash to serialize");
                console.log("  -help\t\t\t\t\tprints out this help message");
                console.log("");
                return;
            }

            var xmlfile = args[0];

            var branch = COMMON.getParameters("branch");
            if (branch) {
                branch = branch[0] || "parsed";
            }
            var hash = COMMON.getParameters("hash");
            if(hash){
                hash = hash[0];
            }
            var project = COMMON.getParameters("proj");
            if(project){
                project = project[0];
            }

            var done = TASYNC.call(COMMON.openDatabase);
            done = TASYNC.call(COMMON.openProject, done);
            var core = TASYNC.call(COMMON.getCore, done);
            if(!hash){
                hash = TASYNC.call(getRootHash,branch,done);
            }
            done = TASYNC.call(serializer, core, hash, xmlfile, project);
            done = TASYNC.call(COMMON.closeProject, done);
            done = TASYNC.call(COMMON.closeDatabase, done);

            return done;
        }

        function getRootHash (branch){
            var project = COMMON.getProject();

            console.log(branch);
            var commitHash = project.getBranchHash(branch,null);
            var done = TASYNC.call(project.loadObject,commitHash);
            done = TASYNC.call(function(object){
                console.log(object)
                return object.root;
            },done);
            return done;
        }

    });

    return;
}

define([ "util/assert", "core/tasync", "util/common", 'fs', 'storage/commit', 'storage/cache', 'storage/mongo', 'core/core' ], function (ASSERT, TASYNC, COMMON,fs,Commit,Cache,Mongo,Core) {
// attributes reserved for easier JSON to XML conversion
// _type : show the type of the XML tag
// _attr : object which contain all the attributes of the XML node
// _empty : true/false show if the object has inner content or not (if not it will be written in <tag/> form
// _children : [] - ordered list of inner XML objects
// _string : if this tag exists then the inner part of the XML object will be this string
    var _core = null;
    var _nodes = [];
    var _prefix = "*&*";
    var _core = null;
    var _idCounter = {
        atom:0,
        model:0,
        connection:0,
        folder:0
    };
    //XML object attributes
    var registry = {
        guid: "guid",
        created: "cdate",
        modified: "mdate",
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
    var webOnly = ['position','isPort','isConnection','metameta','author','comment'];
    function nodeToJsonSync (node){
        //console.log('node',_core.getPath(node));
        //inner functions - for shallow children creation and other stuff
        var initJsonObject = function(gmeNode){
            var initJ = {};
            initJ._type = _core.getRegistry(gmeNode,'metameta');
            initJ._empty = false;
            initJ._children = [];
            initJ._attr = {};


            for(var i in registry){
                var value = _core.getRegistry(gmeNode,i);
                if(value !== undefined && value !== null){
                    initJ._attr[registry[i]] = value;
                }
            }

            //now we should add the children to the node
            //first come the name
            //then the registry nodes
            //then the attributes

            //name
            initJ._children.push({
                _type:"name",
                _empty:false,
                _string:_core.getAttribute(gmeNode,'name')
            });

            //comment and author
            if(initJ._type === 'project'){
                initJ._children.push({
                    _type:'comment',
                    _empty:false,
                    _string:_core.getRegistry(gmeNode,'comment') || ""
                });
                initJ._children.push({
                    _type:'author',
                    _empty:false,
                    _string:_core.getRegistry(gmeNode,'author') || ""
                });
            }

            //regnodes
            initJ._children = initJ._children.concat(createRegistryObject(gmeNode));

            //attributes
            var attrNames = _core.getAttributeNames(gmeNode);
            for(i=0;i<attrNames.length;i++){
                if(attrNames[i] !== 'name'){
                    initJ._children.push({
                        _type:"attribute",
                        _empty:false,
                        _attr:{
                            kind:attrNames[i]
                        },
                        _children:[
                            {
                                _type:"value",
                                _empty:false,
                                _string:_core.getAttribute(gmeNode,attrNames[i])
                            }
                        ]
                    });
                }
            }

            return initJ;
        };
        var registryToChildrenArray = function(registryObj){
            ASSERT(typeof registryObj === 'object' );
            var regJSON = [];
            for(var i in registryObj){
                regJSON.unshift({
                    _type:"regnode",
                    _empty:false,
                    _attr:{
                        name:i
                    },
                    _children:[]
                });
                if(typeof registryObj[i] !== 'object'){
                    regJSON[0]._children.push({
                        _type:"value",
                        _empty:false,
                        _string:""+registryObj[i]
                    });
                    regJSON[0]._attr.isopaque = 'yes';
                } else {
                    regJSON[0]._children = registryToChildrenArray(registryObj[i]);
                    regJSON[0]._children.unshift({
                        _type:"value",
                        _empty:false,
                        _string:""
                    });
                }
            }
            return regJSON;
        };
        var createRegistryObject = function(gmeNode){
            var regNames = _core.getRegistryNames(gmeNode);
            var regObject = {};
            for(i=0;i<regNames.length;i++){
                if((registry[regNames[i]] === undefined || registry[regNames[i]] === null)&& webOnly.indexOf(regNames[i]) === -1){
                    var nameArray = regNames[i].split('/');
                    var tObj = regObject;
                    for(var j=0;j<nameArray.length;j++){
                        if(tObj[nameArray[j]]){
                            tObj = tObj[nameArray[j]];
                        } else {
                            if(j === nameArray.length-1){
                                tObj[nameArray[j]] = _core.getRegistry(gmeNode,regNames[i]);
                            } else {
                                tObj[nameArray[j]] = {};
                                tObj = tObj[nameArray[j]];
                            }
                        }
                    }
                }
            }

            //no we should convert into the correct JSON form
            return registryToChildrenArray(regObject);
        };
        var createConnectionChild = function(connNode){
            //console.log('connection',_core.getPath(connNode));
            if(_core.getPath(connNode) === '/-1/-2/-2382/-2383/-2403'){
                console.log('ehune');
            }
            var jsonConnection = initJsonObject(connNode);
            //now we should add the two connection point tag
            jsonConnection._children.push({
                _type:'connpoint',
                _empty:true,
                _attr:{
                    role:"src",
                    target:_core.getRegistry(_nodes[_prefix+_core.getPointerPath(connNode,'source')],'id')
                }
            });
            jsonConnection._children.push({
                _type:'connpoint',
                _empty:true,
                _attr:{
                    role:"dst",
                    target:_core.getRegistry(_nodes[_prefix+_core.getPointerPath(connNode,'target')],'id')
                }
            });

            return jsonConnection;
        };

        //start
        var jsonObject = initJsonObject(node);

        //now we should add the children to the node
        //then the model/atom
        //then the connection

        var childrenPaths = _core.getChildrenPaths(node);
        var ordinaryChildren = [];
        var connections = [];
        for(var i=0;i<childrenPaths.length;i++){
            if(_core.getRegistry(_nodes[_prefix+childrenPaths[i]],'metameta') === 'connection'){
                connections.push(childrenPaths[i]);
            } else {
                ordinaryChildren.push(childrenPaths[i]);
            }
        }

        //ordinary children recursively
        for(var i=0;i<ordinaryChildren.length;i++){
            jsonObject._children.push(nodeToJsonSync(_nodes[_prefix+""+ordinaryChildren[i]]));
        }

        //connections
        for(var j=0;j<connections.length;j++){
            jsonObject._children.push(createConnectionChild(_nodes[ _prefix+""+connections[j]]));
        }

        return jsonObject;
    }
    function jsonToString(jsonObject,indent){
        ASSERT(jsonObject._type);
        var outString = indent;

        //starting with the type of the object
        outString += "<"+jsonObject._type;

        //adding XML attributes
        if(jsonObject._attr){
            for(var i in jsonObject._attr){
                outString += " "+i+"=\""+jsonObject._attr[i]+"\"";
            }
        }

        //checking _empty
        if(jsonObject._empty){
            outString += "/>\n";
            return outString;
        }

        //checking _string
        if(jsonObject._string !== undefined && jsonObject._string !== null){
            outString += ">"+jsonObject._string+"</"+jsonObject._type+">\n";
            return outString;
        }
        outString += ">\n";

        //creating children texts
        if(jsonObject._children){
            ASSERT(jsonObject._children.length);
            for(i=0;i<jsonObject._children.length;i++){
                outString+=jsonToString(jsonObject._children[i],indent+"  ");
            }
        }

        outString += indent+"</"+jsonObject._type+">\n";
        return outString;
    }
    function createXMLStart(){
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE project SYSTEM \"mga.dtd\">\n"
    }
    function serialize(corr,rootHash,outPath,projectName,callback){
        //temporary hack
        console.log('serialize',(new Date()));
        var myStorage = new Commit(new Cache(new Mongo({
            database: 'test',
            host: 'localhost',
            port:27017
        }), {}));
        myStorage.openDatabase(function(err){
            if(!err){
                myStorage.openProject(projectName,function(err,project){
                    if(!err && project){
                        var mycore = new Core(project, {
                            autopersist: true
                        });
                        _serialize(mycore,rootHash,outPath,callback);
                    }
                });
            }
        });
    }
    function _serialize(core,rootHash,outPath,callback){
        _core = core;
        console.log('_serialize',(new Date()));
        var loadObject = function(object,cb){
            var waiting = (core.getChildrenRelids(object)).length;
            if(waiting>0){
                core.loadChildren(object,function(err,children){
                    if(!err && children && children.length>0){
                        var myErr = null;
                        var myCb = function(err){
                            if(myErr == null){
                                myErr = err;
                            }

                            if(--waiting === 0){
                                cb(myErr);
                            }
                        };
                        for(var i=0;i<children.length;i++){
                            _nodes[_prefix+core.getPath(children[i])] = children[i];
                            loadObject(children[i],myCb);
                        }
                    } else {
                        cb(err);
                    }
                });
            } else {
                cb(null);
            }
        };

        core.loadRoot(rootHash,function(err,root){
            if(!err && root){
                _nodes[_prefix+core.getPath(root)] = root;
                loadObject(root,function(err){
                    if(!err){
                        //now every node is loaded
                        console.log('_serialize - loaded',(new Date()));
                        _core = core; //just for sure
                        var jsonProject = nodeToJsonSync(root);
                        var stringProject = createXMLStart() + jsonToString(jsonProject,"");
                        fs.writeFileSync(outPath,stringProject);
                        callback(null);
                    } else {
                        callback(err);
                    }
                });
            } else {
                callback(err);
            }
        });
    }

    return TASYNC.wrap(serialize);
});
