/*globals RegExp,_,define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved
 *
 * @author brollb / https://github/brollb
 * 
 * Visual constraint language for WebGME
 */

define(['plugin/PluginConfig',
        'plugin/PluginBase'], function (PluginConfig,
                                       PluginBase){

    "use strict";

   var DEFAULT = '__default__',
       ACCESSABLE_VARIABLES = ['currentNode'],
       PRIVATE_VARIABLES = { CORE: 'core',//Variable names to be unique-ized
                             CALLBACK: 'callback',
                             ERROR: 'err',
                             VIOLATION: 'violationInfo',
                             CACHE : '_nodeCache',
                             GET_NODE : 'getNode',
                             TYPE_OF : 'isTypeOf',

                             //Base values for iterators/functions
                             ITERATOR: 'i',
                             ARG: 'arg',
                             FUNCTION: 'fn'},

       PLACEHOLDER = { ITERATOR: '%__iterator__',//Placeholders to be unique-ized
                       FUNCTION: '%__func__',
                       ARG: '%__arg__',
                       PARENT_SNIPPET_START: '%__parentSnippetStart__',
                       PARENT_SNIPPET_END: '%__parentSnippetEnd__' },
       OPTIONAL_PLACEHOLDERS = ['%next'],
       UNIQUENESS_COEFFICIENT = 10000000;

   var ConstraintPlugin = function() {
        //Call base class's constructor
        PluginBase.call(this);

        //Defined in Constriant Language META
        this._variableTypes = { 'dictionary': 'var %name = {};',
                                'collection': 'var %name = [];',
                                '__default__': 'var %name = null;' };
    };

    //basic functions and setting for plugin inheritance
    ConstraintPlugin.prototype = Object.create(PluginBase.prototype);
    ConstraintPlugin.prototype.constructor = ConstraintPlugin;

    ConstraintPlugin.prototype.getName = function () {
        return "Constraint Creator";
    };
    
    ConstraintPlugin.prototype._loadStartingNodes = function(callback){
        //we load the children of the active node
        var self = this;
        self._nodeCache = {};

        //Add activeNode
        self._nodeCache[self.core.getPath(self.activeNode)] = self.activeNode;

        var load = function(node, fn){
            self.core.loadChildren(node,function(err,children){
                if(err){
                    fn(err);
                } else {
                    var j = children.length,
                        e = null; //error

                    if(j === 0){
                        fn(null);
                    }

                    var callbackIfDone = function(err){
                        e = e || err;
                        if(--j === 0){//callback only on last child
                            fn(e);
                        }
                    };

                    for(var i=0;i<children.length;i++){
                        self._nodeCache[self.core.getPath(children[i])] = children[i];
                        load(children[i], callbackIfDone);
                    }
                }
            });
        };

        load(self.activeNode, callback);

    };

    ConstraintPlugin.prototype.getNode = function(nodePath){
        //we check only our node cache
        return this._nodeCache[nodePath];
    };

    ConstraintPlugin.prototype.getAllNodeIds = function(){
        return Object.keys(this._nodeCache);
    };

    ConstraintPlugin.prototype._isTypeOf = function(node,type){
        //now we make the check based upon path
        if(node === undefined || node === null || type === undefined || type === null){
            return false;
        }

        if (typeof node === "string"){//if the node is the nodeId
            node = this.getNode(node);
        }

        while(node){
            if(this.core.getPath(node) === this.core.getPath(type)){
                return true;
            }
            node = this.core.getBase(node);
        }
        return false;
    };

    ConstraintPlugin.prototype._createConstraintMapping = function(){
        //Code map:
        //
        //Adding the mapping of node META name to code
        //% sign indicates it will be replaced with either 
        //attribute of the given name or ptr tgt of the given name
        //
        //These correspond to META items
        
        //Check for name collisions
        var keys = Object.keys(PRIVATE_VARIABLES),
            key;

        while (keys.length){
            key = keys.pop();
            PRIVATE_VARIABLES[key] = this._createUniqueName(PRIVATE_VARIABLES[key]);
        }

        //Placeholders
        keys = Object.keys(PLACEHOLDER);
        while (keys.length){
            key = keys.pop();
            PLACEHOLDER[key] = this._createUniqueName(PLACEHOLDER[key]);
        }

        this._constraintExtension = 'js';

        this._constraintBoilerPlate = 'function(core, currentNode, callback){\n\n' + 
            '\n"use strict";\n\nvar ' + PRIVATE_VARIABLES.VIOLATION +
            ' = { hasViolation: false };\n' +
            'var ' + PRIVATE_VARIABLES.ERROR + ' = null;\n' +
            'var ' + PRIVATE_VARIABLES.CACHE + ' = {};\n' +
            'var ' + PRIVATE_VARIABLES.GET_NODE + ' = function(nodeId){\n' +
            'var node;\nif (nodeId === currentNode){\n'+
            'return currentNode;\n}\n\nif (' + PRIVATE_VARIABLES.CACHE + '[nodeId]){\n' +
            'return ' + PRIVATE_VARIABLES.CACHE + '[nodeId];\n' +
            '}\nnode = core.loadByPath(currentNode, nodeId);\n'+
            '' + PRIVATE_VARIABLES.CACHE + '[nodeId] = node;\n\nreturn node;\n};\n' + 
            'var ' + PRIVATE_VARIABLES.TYPE_OF + ' = function(node,type){\n' + 
            'if(node === undefined || node === null || type === undefined || ' + 
            'type === null){\nreturn false;\n}\n\n' +
            'while(node){\nif(core.getAttribute(node, "name") === type){\n'+
            'return true;\n}\nnode = core.getBase(node);\n}\nreturn false;\n};\n'+
            '\n\n%code\n\n}';

        this._constraintMapping = {
            'add': "%first + %second", 
            'subtract': "%first - %second", 
            'multiply': "(%first) * (%second)", 
            'divide': "(%first)/(%second)", 
            'lessThan': "(%first) < (%second)", 
            'greaterThan': "(%first) > (%second)", 
            'equals': "(%first) === (%second)", 

            //Control flow
            'if': "if (%cond){\n%true_next\n}\n%next",
            'while': "while (%cond){\n %true_next\n}\n%next",

            //Variables
            'variable': "%name",
            'collection': "%name",
            'node': "%name",
            'nodeSet': "%name",
            'item': "%name",

            //Collection mappings
            'addToCollection': "%collection.push(%first);\n%next",
            'contains': "%collection.indexOf(%first) !== -1",

            'markViolation': PRIVATE_VARIABLES.VIOLATION + " = { hasViolation: true," +
                " message: %Message, nodes: %node };\n\n%next",

            'not': "!(%first)",
            'getLength': "%first.length",

            //A few basic utilities
            'return': "return %first;\n%next",
            'set': '%first = %second;\n%next',

            //node methods (async)
            'isTypeOf': PRIVATE_VARIABLES.GET_NODE+"(%node, function(" + PLACEHOLDER.ARG + 
                "){\n" + PLACEHOLDER.PARENT_SNIPPET_START + PRIVATE_VARIABLES.TYPE_OF + 
                "(" + PLACEHOLDER.ARG + ", %first)" + PLACEHOLDER.PARENT_SNIPPET_END + "\n});",

            'getChildren': PRIVATE_VARIABLES.GET_NODE+"(%node, function(" + PLACEHOLDER.ARG + 
                "){\n" + PLACEHOLDER.PARENT_SNIPPET_START + "core.getChildrenPaths(" + PLACEHOLDER.ARG + 
                ")" + PLACEHOLDER.PARENT_SNIPPET_END + "\n});",

            'getParent': PRIVATE_VARIABLES.GET_NODE+"(%node, function(" + PLACEHOLDER.ARG + 
                "){\n" + PLACEHOLDER.PARENT_SNIPPET_START + "core.getParentPath(" + PLACEHOLDER.ARG + 
                ")" + PLACEHOLDER.PARENT_SNIPPET_END + "\n});",

            'getPointer': PRIVATE_VARIABLES.GET_NODE+"(%node, function(" + PLACEHOLDER.ARG + 
                "){\n" + PLACEHOLDER.PARENT_SNIPPET_START + "core.getPointerPath(" + PLACEHOLDER.ARG + 
                ")" + PLACEHOLDER.PARENT_SNIPPET_END + "\n});",

            'getAttribute': PRIVATE_VARIABLES.GET_NODE+"(%second, function(" + PLACEHOLDER.ARG + "){\n" + PLACEHOLDER.PARENT_SNIPPET_START + "core.getAttribute(" + PLACEHOLDER.ARG + 
                ", %first)" + PLACEHOLDER.PARENT_SNIPPET_END + "\n});",

            'forEach': "var " + PLACEHOLDER.FUNCTION + " = function(" + 
                PLACEHOLDER.ITERATOR + "){\nif (" + PLACEHOLDER.ITERATOR + 
                ' < %collection.length){\n%iter = %collection[' + 
                PLACEHOLDER.ITERATOR + '];\n%true_next\n} else {\n %next\n} };\n'+
                'var ' + PLACEHOLDER.ITERATOR + ' = 0;\n' + PLACEHOLDER.FUNCTION +
                '(' + PLACEHOLDER.ITERATOR + ');\n'
            };

            //additional end code by node type
            this._constraintEndCode = {
                'forEach': PLACEHOLDER.FUNCTION + "(++" + PLACEHOLDER.ITERATOR + ");\n",
                'constraint': '\ncallback( ' + PRIVATE_VARIABLES.ERROR + 
                    ', ' + PRIVATE_VARIABLES.VIOLATION + ');\n'
            };

            //additional end code by node id
            this._nodeEndCode = {};
    };

    ConstraintPlugin.prototype._createUniqueName = function(variable){
        var newName = variable;

        while(this.variables[newName]){
            newName = variable + '_' + Math.floor(Math.random()*UNIQUENESS_COEFFICIENT);
        }
        this.variables[newName] = true;//Register the variable name
        return newName;
    };

    ConstraintPlugin.prototype.main = function (callback) {
        var self = this;
        self.config = self.getCurrentConfig();

        if(!self._isTypeOf(self.activeNode, self.META.constraint)){
            self._errorMessages(self.activeNode, 
                "Current project is an invalid type. Please run the plugin on a constraint definition.");
        }

 
        self._loadStartingNodes(function(err){
            if(err){
                //finishing
                self.result.success = false;
                callback(err,self.result);
            } else {
                //executing the plugin
                self.logger.info("Finished loading children");
                err = self._runSync();
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

    ConstraintPlugin.prototype._runSync = function(){
        var err = null,
            currentNode,
            variables = [],//List of variables to declare
            nodeIds,
            l,
            i;

        this.variables = {};//List of declared variables
        this.projectName = this.core.getAttribute(this.activeNode,'name');
        this.generatedCode = { variables: "", functions: "", code: "" };

        currentNode = null;
        nodeIds = this.getAllNodeIds();
        i = nodeIds.length;

        //Find the hat and declare variables
        while(i-- && currentNode === null){
            if(this._isTypeOf(nodeIds[i], this.META.Hat) && !this._isTypeOf(nodeIds[i], this.META.Command)){
               //Found the starting node
               currentNode = this.getNode(nodeIds[i]);
               //What if they have more than one "start" node?
               //TODO
               
            } else if(this._isTypeOf(nodeIds[i], this.META.variable)){
                variables.push(nodeIds[i]);
            }
        }

        //Declare all the variables
        this._declareVariables(variables);
        this._createConstraintMapping();

        //Find the last node (for inserting callback)
        this._setNodeEndCode();

        currentNode = this.core.getPointerPath(currentNode, 'next');
        this.generatedCode.code += this._generateCode(currentNode) + "\n";

        return err;
    };

    ConstraintPlugin.prototype._declareVariables = function(variables){
        var types = Object.keys(this._variableTypes),
            foundType,
            variableType,
            variable,
            i,
            index,
            j;

        //Remove the initial variable from declaration
        for (i = ACCESSABLE_VARIABLES.length -1; i >= 0; i--){
            this.variables[ACCESSABLE_VARIABLES[i]] = true;
        }
 
        //Declare remaining variables
        for (i = variables.length -1; i >= 0; i--){
            variable = this.getNode(variables[i]);
            variableType = null;
            j = types.length;

            while (j-- && !variableType){
                if (this._isTypeOf(variable, this.META[types[j]])){
                    variableType = this._variableTypes[types[j]];
                }
            }

            if (!variableType){
                variableType = this._variableTypes[DEFAULT];
            }

            this._declareVar(variable, variableType);
        }

        this.generatedCode.variables += "\n";
    };

    ConstraintPlugin.prototype._declareVar = function(variable, typeInfo){
        var varName = this.core.getAttribute(variable, 'name');
        if (!this.variables[varName]){
            this.generatedCode.variables += typeInfo.replace(new RegExp("%name", "g"), varName) + '\n';
            this.variables[varName] = true;
        }
    };

    /**
     * We will search all nodes and match the node to its ending code based
     * on the node type (using the "this._constraintEndCode" dictionary). The
     * data is recorded in this._nodeEndCode. 
     *
     * @private
     * @return {undefined}
     */
    ConstraintPlugin.prototype._setNodeEndCode = function(){
        var nodeIds = this.getAllNodeIds(),
            nodeType,
            node,
            base;

        for (var i = nodeIds.length-1; i >= 0; i--){
            node = this.getNode( nodeIds[i] );
            base = this.core.getBase(node);
            nodeType = this.core.getAttribute(base, 'name');
            if (this._constraintEndCode[nodeType]){
                this._nodeEndCode[nodeIds[i]] = this._constraintEndCode[nodeType];
            }
        }
    };

    ConstraintPlugin.prototype._generateCode = function(nodeId){
        //Map stuff to code and return the code snippet
        var node = this.getNode(nodeId),
            base = this.core.getBase(node),
            typeName = this.core.getAttribute(base, 'name'),
            snippet = this._constraintMapping[typeName],//Get the code for the given node...
            ptrs = this.core.getPointerNames(node),
            attributes = this.core.getAttributeNames(node),
            snippetTagContent = {},
            snippetTag,
            keys,
            i,
            targetNode,
            splitElements,
            subsnippets,
            newSnippet,
            parent = this.core.getParent(node),
            parentId = this.core.getPath(parent);

        //Handle any placeholders (ie, iterators, function names)
        keys = Object.keys(PLACEHOLDER);
        for (i = keys.length-1; i >= 0; i--){
            snippetTag = PLACEHOLDER[keys[i]];
            if (snippet.indexOf(snippetTag) !== -1 && PRIVATE_VARIABLES[keys[i]] !== undefined){
                snippetTagContent[snippetTag] = this._createUniqueName(PRIVATE_VARIABLES[keys[i]]);
            }
        }

        //If the attribute name is in the snippet, substitute the attr name with the value
        i = attributes.length;
        while (i--){
            snippetTag = '%' + attributes[i];
            if (snippet.indexOf(snippetTag) !== -1){
                if (OPTIONAL_PLACEHOLDERS.indexOf(snippetTag) !== -1){
                    snippetTagContent[snippetTag] = '';
                    if (this._nodeEndCode[parentId]){
                        snippetTagContent[snippetTag] = this._nodeEndCode[parentId];
                    }

                } else {
                    snippetTagContent[snippetTag] = 'undefined';
                }
                snippetTagContent[snippetTag] = this.core.getAttribute(node, attributes[i]);

                if (attributes[i] !== 'name' && this.core.getAttributeMeta(node, attributes[i]).type === 'string'){
                    snippetTagContent[snippetTag] = '"' + snippetTagContent[snippetTag].replace(/[\\'"]/g, '\\$&') + '"';
                }
            }
        }

        //If ptr name is present in the snippet, swap it out with the code from the tgt
        //ptrs have precedence over attributes
        i = ptrs.length;
        while(i--){
            snippetTag = '%' + ptrs[i];
            if (snippet.indexOf(snippetTag) !== -1){ 

                if(this.core.getPointerPath(node, ptrs[i])){
                    targetNode = this.core.getPointerPath(node, ptrs[i]);
                    snippetTagContent[snippetTag] = this._generateCode(targetNode);
                } 
                if (!snippetTagContent[snippetTag]){
                    if (OPTIONAL_PLACEHOLDERS.indexOf(snippetTag) !== -1){
                        snippetTagContent[snippetTag] = '';
                        if (this._nodeEndCode[parentId]){
                            snippetTagContent[snippetTag] = this._nodeEndCode[parentId];
                        }
                    } else {
                        snippetTagContent[snippetTag] = 'undefined';
                    }
                }
            }
        }

        keys = Object.keys(snippetTagContent);
        for (i = keys.length-1; i >= 0; i--){
            snippetTag = keys[i];

            if (_.isString(snippetTagContent[snippetTag]) && snippetTagContent[snippetTag].indexOf(PLACEHOLDER.PARENT_SNIPPET_START) !== -1){
                splitElements = '(' + PLACEHOLDER.PARENT_SNIPPET_START + 
                    '|' + PLACEHOLDER.PARENT_SNIPPET_END + ')';
                subsnippets = snippetTagContent[snippetTag].split(new RegExp(splitElements, 'g'));
                newSnippet = "";
                for (var k = 0; k < subsnippets.length; k +=5){
                    newSnippet += subsnippets[k] + snippet.replace(new RegExp(snippetTag, "g"), subsnippets[k+2]) + subsnippets[k+4];
                }
                snippet = newSnippet;
            } else {
                snippet = snippet.replace(new RegExp(snippetTag, "g"), snippetTagContent[snippetTag]);
                if (this._nodeEndCode[nodeId]){
                    this._nodeEndCode[nodeId].replace(new RegExp(snippetTag, "g"), snippetTagContent[snippetTag]);
                }
            }
            delete snippetTagContent[snippetTag];
        }

        return snippet;
    };

    //Thanks to Tamas for the next two functions
    ConstraintPlugin.prototype._saveOutput = function(codeInfo, callback){
        var self = this,
            code = codeInfo.variables + codeInfo.functions + codeInfo.code,
            fileName = self.projectName.replace(/ /g, "_"),
            artifact = self.blobClient.createArtifact(fileName+"_constraint"),

            //Function to check if we have added all files
            checkIfShouldSaveAll = function(err){
                if(err){
                    callback(err);
                } else {
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
            };

        code = this._constraintBoilerPlate.replace("%code", code);

        //Save all files
        artifact.addFile(fileName + "." + self._constraintExtension,code,checkIfShouldSaveAll);
    };

    ConstraintPlugin.prototype._errorMessages = function(message){
        var self = this;
        self.createMessage(self.activeNode,message);
    };

    return ConstraintPlugin;

});
