/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved
 *
 * Author: Brian Broll
 * 
 * Code generating interpreter for SnapGME
 */

define(['plugin/PluginConfig',
        'plugin/PluginBase'], function (PluginConfig,
                                       PluginBase){

    var SnapPlugin = function() {
        //Call base class's constructor
        PluginBase.call(this);

        //Code maps:
        //
        //Adding the mapping of node META name to code
        //% sign indicates it will be replaced with either 
        //attribute of the given name or ptr tgt of the given name
        this._languages = {};
        this._languages['python'] = { 'bp': '#!/usr/bin/python2\n\n%code',
                                      'map': { 'Add': "%first + %second", 
                                               'Subtract': "%first - %second", 
                                               'Multiply': "(%first) * (%second)", 
                                               'Divide': "(%first)/(%second)", 
                                               'Less Than': "(%first) < (%second)", 
                                               'Greater Than': "(%first) > (%second)", 
                                               'Equals': "(%first) == (%second)", 
                                               'Write': "print %text",
                                               'If': "if %cond:\n %true_next",
                                               'Repeat': "while true:\n %true_next",
                                               'Variable': "%name",
                                               'Set': '%var = %value' },
                                      'primitives': {'%var = %value': /[a-zA-Z\d._-]*/ },
                                      'ext': 'py' };

        //Change the languages to be within the map
        this._languages['javascript'] = { 'bp': '#!/usr/bin/node\n\n%code',
                                          'map': { 'Add': "%first + %second", 
                                                   'Subtract': "%first - %second", 
                                                   'Multiply': "(%first) * (%second)", 
                                                   'Divide': "(%first)/(%second)", 
                                                   'Less Than': "(%first) < (%second)", 
                                                   'Greater Than': "(%first) > (%second)", 
                                                   'Equals': "(%first) === (%second)", 
                                                   'Write': "console.log(%text);",
                                                   'If': "if (%cond){\n %true_next\n}",
                                                   'Repeat': "while (true){\n %true_next\n}",
                                                   'Variable': "%name",
                                                   'Set': '%var = %value;' },
                                          'primitives': { 'var %var = %value;': /^[a-zA-Z\d._-]*$/ },
                                          'ext': 'js' };
    };

    //basic functions and setting for plugin inheritance
    SnapPlugin.prototype = Object.create(PluginBase.prototype);
    SnapPlugin.prototype.constructor = SnapPlugin;

    SnapPlugin.prototype.getName = function () {
        return "Pegasus Plugin";
    };
    
    //config options
    SnapPlugin.prototype.getConfigStructure = function () {
        return [
            {
                "name": "python",
                "displayName": "Python",
                "description": 'Generate Python Code',
                "value": false, // this is the 'default config'
                "valueType": "boolean",
                "readOnly": false
            },
            {
                "name": "javascript",
                "displayName": "Javascript",
                "description": 'Generate Javascript Code',
                "value": true, // this is the 'default config'
                "valueType": "boolean",
                "readOnly": false
            }
        ]
    };

    SnapPlugin.prototype._loadStartingNodes = function(callback){
        //we load the children of the active node
        var self = this;
        self._nodeCache = {};

        var load = function(node, fn){
            self.core.loadChildren(node,function(err,children){
                if(err){
                    fn(err)
                } else {
                    var j = children.length,
                        e = null; //error

                    if(j === 0){
                        fn(null);
                    }

                    for(var i=0;i<children.length;i++){
                        self._nodeCache[self.core.getPath(children[i])] = children[i];
                        load(children[i], function(err){
                            e = e || err;
                            if(--j === 0){//callback only on last child
                                fn(e);
                            }
                        });
                    }
                }
            });
        };

        load(self.activeNode, callback);

    };

    SnapPlugin.prototype.getNode = function(nodePath){
        //we check only our node cache
        return this._nodeCache[nodePath];
    };

    SnapPlugin.prototype._isTypeOf = function(node,type){
        //now we make the check based upon path
        if(node === undefined || node === null || type === undefined || type === null){
            return false;
        }

        var self = this;

        if (typeof node === "string"){//if the node is the nodeId
            node = self.getNode(node);
        }

        while(node){
            if(self.core.getPath(node) === self.core.getPath(type)){
                return true;
            }
            node = self.core.getBase(node);
        }
        return false;
    };

    SnapPlugin.prototype.main = function (callback) {
        var self = this;
        self.config = self.getCurrentConfig();

        if(!self._isTypeOf(self.activeNode, self.META['Project'])){
            self._errorMessages(self.activeNode, 
                "Current project is an invalid type. Please run the plugin on a project.");
        }

 
        self._loadStartingNodes(function(err){
            if(err){
                //finishing
                self.result.success = false;
                callback(err,self.result);
            } else {
                //executing the plugin
                self.logger.info("Finished loading children");
                var err = self._runSync();
                if(err){
                    self.result.success = false;
                    callback(err,self.result);
                } else {
                    //Download language files
                    self._saveOutput(self.generatedCode, function(err){
                        if(err){ 
                            self.result.success = false;
                            callback(err,self.result);
                        } else {
                            if(callback){
                                self.result.success = true;
                                callback(null,self.result);
                            }
                        }
                    });
                }
            }
        });
    };

    SnapPlugin.prototype._runSync = function(){
        var err = null,
            currentNode,
            languages = [];

        this.projectName = this.core.getAttribute(this.activeNode,'name');
        this.generatedCode = {};

        for (var lang in this.config){
            if (this.config.hasOwnProperty(lang) && this.config[lang]){
                this.generatedCode[lang] = "";
                languages.push(lang);
            }
        }

        this.variables = [];

        var currentNode = null,
            nodeIds = this.core.getChildrenPaths(this.activeNode),
            i = nodeIds.length;

        //Find the hat and declare variables
        while(i-- && currentNode === null){
            if(this._isTypeOf(nodeIds[i], this.META["Hat"]) 
               && !this._isTypeOf(nodeIds[i], this.META["Command"]))
           currentNode = this.getNode(nodeIds[i]);
        }

        //Follow the next pointers and map each object to it's given code
        while(this.core.getPointerPath(currentNode, 'next')){
            currentNode = this.getNode(this.core.getPointerPath(currentNode, 'next'));
            for (var l in this.generatedCode){
                if(this.generatedCode.hasOwnProperty(l)){
                    this.generatedCode[l] += this._generateCode(l, currentNode) + "\n";
                }
            }
        }

        for (var l in this.generatedCode){
            if(this.generatedCode.hasOwnProperty(l)){
                this.generatedCode[l] = this._languages[l].bp.replace("%code", this.generatedCode[l]);
            }
        }

        return err;
    };

    SnapPlugin.prototype._generateCode = function(language, node){
        //Map stuff to code and return the code snippet
        var base = this.core.getBase(node),
            typeName = this.core.getAttribute(base, 'name'),
            snippet = this._languages[language].map[typeName],//Get the code for the given node...
            ptrs = this.core.getPointerNames(node),
            attributes = this.core.getAttributeNames(node),
            i = ptrs.length;

        //If ptr name is present in the snippet, swap it out with the code from the tgt
        //ptrs have precedence over attributes
        while(i--){
            if(this.core.getPointerPath(node, ptrs[i]) && snippet.indexOf('%' + ptrs[i]) !== -1){
                var nId = this.core.getPointerPath(node, ptrs[i]),
                    dec = "";

                if(this._isTypeOf(nId, this.META["Variable"]) && this.variables.indexOf(nId)){
                    //Declare the variable

                    var n = this.getNode(nId);
                    dec = this._declareVar(language, n) + "\n"; //variable declaration
                    this.variables.push(nId);
                }
                snippet = dec + snippet.replace('%' + ptrs[i], this._getBlockCode(language, nId));
            }
        }

        //If the attribute name is in the snippet, substitute the attr name with the value
        i = attributes.length;
        while(i--){
            if(snippet.indexOf('%' + attributes[i]) !== -1){
                snippet = snippet.replace('%' + attributes[i], this.core.getAttribute(node, attributes[i]));
            }
        }

        return snippet;
    };

    SnapPlugin.prototype._getBlockCode = function(language, nodeId){
        //Return code that is part of another block


        if(this._isTypeOf(nodeId, this.META["Predicate"])){
            //Return the snippet inline
            return this._generateCode(language, this.getNode(nodeId));

        }

        if(this._isTypeOf(nodeId, this.META["Command"])){//Return the snippet with an indent
            var node = this.getNode(nodeId),
                snippet = "\t" + this._generateCode(language, node).replace(/\n/g, "\n\t");

            while(this.core.getPointerPath(node, 'next') 
                    && this._isTypeOf(this.core.getPointerPath(node, 'next'), this.META["Command"])){
                node = this.getNode(this.core.getPointerPath(node, 'next'));
                snippet += "\n\t" + this._generateCode(language, node);
            }

            return snippet;
        }
    };

    SnapPlugin.prototype._declareVar = function(language, node){
        var primitives = this._languages[language].primitives,
            v = { 'name': this.core.getAttribute(node, 'name'), //variable
                  'val': this.core.getAttribute(node, 'value') };
        if(primitives === null)//Not declaring variables
            return "";

        for(var type in primitives){
            if(primitives.hasOwnProperty(type)){
                //Find the var type
                if(primitives[type].exec(v.val)[0] === v.val){//matches the regex
                    var snippet = type.replace('%var', v.name);
                    return snippet.replace("%value", v.val);
                }
            }
        }
    };

    //Thanks to Tamas for the next two functions
    SnapPlugin.prototype._saveOutput = function(code, callback){
        var self = this,
            fileName = self.projectName.replace(" ", "_"),
            artifact = self.blobClient.createArtifact(fileName+"_code"),
            keys = Object.keys(code),
            i = keys.length,
            language;

            //self._addFiles(fileName, keys, artifact);
        while (i--){
            language = keys[i];
            artifact.addFile(fileName + "." + self._languages[language].ext,code[language],function(err){
                if(err){
                    callback(err);
                } else {
                    keys.pop();
                    if (keys.length === 0){
                        self.blobClient.saveAllArtifacts(function(err, hashes) {
                            if (err) {
                                callback(err);
                            } else {
                                self.logger.info('Artifacts are saved here:');
                                self.logger.info(hashes);

                                // result add hashes
                                for (var j = 0; j < hashes.length; j += 1) {
                                    self.result.addArtifact(hashes[j]);
                                }

                                self.result.setSuccess(true);
                                callback(null);
                            }
                        });
                    }
                }
            });
        }
    };

    SnapPlugin.prototype._errorMessages = function(message){
        var self = this;
        self.createMessage(self.activeNode,message);
    };

    return SnapPlugin;

});
