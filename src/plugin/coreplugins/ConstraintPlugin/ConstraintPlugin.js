/*globals RegExp,define*/
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
       INITIAL_VARIABLES = ['currentNode'],
       ERROR_NAME = 'err',
       VIOLATION_VARIABLE_NAME = 'violationInfo',
       ITERATOR_PLACEHOLDER = '%__iterator__',
       ITERATOR_BASE = 'i',
       FUNCTION_PLACEHOLDER = '%__func__',
       FUNCTION_BASE = 'fn',
       UNIQUENESS_COEFFICIENT = 10000000;

   var ConstraintPlugin = function() {
        //Call base class's constructor
        PluginBase.call(this);

        //Defined in Constriant Language META
        this._variableTypes = { 'dictionary': 'var %name = {};',
                                'Collection': 'var %name = [];',
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

    ConstraintPlugin.prototype._createConstraintMapping = function(){
        //Code map:
        //
        //Adding the mapping of node META name to code
        //% sign indicates it will be replaced with either 
        //attribute of the given name or ptr tgt of the given name
        //
        //These correspond to META items
        
        //Check for name collisions
        //Violations_Variable
        VIOLATION_VARIABLE_NAME = this._createUniqueName(VIOLATION_VARIABLE_NAME);

        //iterator base
        ITERATOR_PLACEHOLDER = this._createUniqueName(ITERATOR_PLACEHOLDER);
        ITERATOR_BASE = this._createUniqueName(ITERATOR_BASE);

        FUNCTION_PLACEHOLDER = this._createUniqueName(FUNCTION_PLACEHOLDER);
        FUNCTION_BASE = this._createUniqueName(ITERATOR_BASE);

        this._constraintMapping = {   'bp': 'function(core, currentNode){\n\n' + 
                                                '/* Adding utility functions like getNode and loadStartingNodes */\n' +
                                                '//TODO\n\n' +
                                                'var ' + VIOLATION_VARIABLE_NAME + ' = { hasViolation: false };' +
                                                'var ' + ERROR_NAME + ' = null;' +
                                                '\n\n%code\n' +
                                                'cb( ' + ERROR_NAME + ', ' + VIOLATION_VARIABLE_NAME + ');\n}',

                                      'map': { 'Add': "%first + %second", 
                                               'Subtract': "%first - %second", 
                                               'Multiply': "(%first) * (%second)", 
                                               'Divide': "(%first)/(%second)", 
                                               'Less Than': "(%first) < (%second)", 
                                               'Greater Than': "(%first) > (%second)", 
                                               'Equals': "(%first) === (%second)", 

                                               //Control flow
                                               'If': "if (%cond){\n%true_next\n}",
                                               /*
                                               'ForEach': "var " + ITERATOR_PLACEHOLDER + ";\n" +
                                                   "function " + FUNCTION_PLACEHOLDER + "( " + ITERATOR_PLACEHOLDER + 
                                                  */
                                                   //TODO
                                               'ForEach': "for (var " + ITERATOR_PLACEHOLDER + 
                                                   " = %collection.length-1; " + ITERATOR_PLACEHOLDER + 
                                                   " >= 0; " + ITERATOR_PLACEHOLDER + "--){\n "+
                                                   "\t%iter = %collection["+ ITERATOR_PLACEHOLDER + 
                                                   "];\n%true_next\n}",
                                               'While': "while (%cond){\n %true_next\n}",

                                               //Variables
                                               'Variable': "%name",
                                               'Collection': "%name",
                                               'Node': "%name",
                                               'NodeSet': "%name",
                                               'Item': "%name",

                                               //Collection mappings
                                               'addToCollection': "%collection.push(%first)",
                                               'contains': "%collection.indexOf(%first) !== -1",

                                               //Constraint specific mappings
                                               //node specific mappings
                                               'getAttribute': "core.getAttribute(getNode(%second), %first)",//FIXME
                                               'getPointer': "core.getPointerPath(getNode(%node), %first)",
                                               'getParent': "core.getParentPath(getNode(%node))",
                                               'getChildren': "core.getChildrenPaths(getNode(%node))",

                                               'markViolation': VIOLATION_VARIABLE_NAME + " = { hasViolation: true," +
                                                   " message: %Message, nodes: %node };\n",

                                               //TODO Figure out how to have the children be children nodes...
                                               'not': "!(%first)",
                                               'getLength': "%first.length",

                                               //A few basic utilities
                                               'Return': "return %first;",
                                               'Set': '%first = %second;' },

                                        'ext': 'js' };


    };

    ConstraintPlugin.prototype._createUniqueName = function(variable){
        var newName = variable;

        while(this.variables[newName]){
            newName = variable + '_' + Math.floor(Math.random()*UNIQUENESS_COEFFICIENT);
        }
        this.variables[newName] = true;//Register the variable name
        return newName;
    };

    ConstraintPlugin.prototype._getNewIterator = function(){
        return this._createUniqueName(ITERATOR_BASE);
    };

    ConstraintPlugin.prototype._getNewFunctionName = function(){
        return this._createUniqueName(FUNCTION_BASE);
    };

    ConstraintPlugin.prototype.main = function (callback) {
        var self = this;
        self.config = self.getCurrentConfig();

        if(!self._isTypeOf(self.activeNode, self.META.Constraint)){
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
        this.generatedCode = "";

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
               
            } else if(this._isTypeOf(nodeIds[i], this.META.Variable)){
                variables.push(nodeIds[i]);
            }
        }

        //Declare all the variables
        this._declareVariables(variables);
        this._createConstraintMapping();

        //Follow the next pointers and map each object to it's given code
        while(this.core.getPointerPath(currentNode, 'next')){
            currentNode = this.getNode(this.core.getPointerPath(currentNode, 'next'));
            this.generatedCode += this._generateCode(currentNode) + "\n";
        }

        this.generatedCode = this._constraintMapping.bp.replace("%code", this.generatedCode);

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
        for (i = INITIAL_VARIABLES.length -1; i >= 0; i--){
            if ((index = variables.indexOf(INITIAL_VARIABLES[i])) !== -1){
                variables.splice(index, 1);
            }
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

        this.generatedCode += "\n";
    };

    ConstraintPlugin.prototype._declareVar = function(variable, typeInfo){
        var varName = this.core.getAttribute(variable, 'name');
        if (!this.variables[varName]){
            this.generatedCode += typeInfo.replace(new RegExp("%name", "g"), varName) + '\n';
            this.variables[varName] = true;
        }
    };

    ConstraintPlugin.prototype._generateCode = function(node){
        //Map stuff to code and return the code snippet
        var base = this.core.getBase(node),
            typeName = this.core.getAttribute(base, 'name'),
            snippet = this._constraintMapping.map[typeName],//Get the code for the given node...
            ptrs = this.core.getPointerNames(node),
            attributes = this.core.getAttributeNames(node),
            snippetTagContent = {},
            snippetTag,
            keys,
            i,
            n;

        //If the attribute name is in the snippet, substitute the attr name with the value
        i = attributes.length;
        while (i--){
            snippetTag = '%' + attributes[i];
            if (snippet.indexOf(snippetTag) !== -1){
                snippetTagContent[snippetTag] = 'undefined';
                snippetTagContent[snippetTag] = this.core.getAttribute(node, attributes[i]);

                if (attributes[i] !== 'name' && this.core.getAttributeMeta(node, attributes[i]).type === 'string'){
                    snippetTagContent[snippetTag] = '"' + snippetTagContent[snippetTag] + '"';
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
                    snippetTagContent[snippetTag] = this._getBlockCode(this.core.getPointerPath(node, ptrs[i]));
                } 
                if (!snippetTagContent[snippetTag]){
                    snippetTagContent[snippetTag] = 'undefined';
                }
            }
        }

        //Handle any iterators
        if (snippet.indexOf(ITERATOR_PLACEHOLDER) !== -1){
            snippetTagContent[ITERATOR_PLACEHOLDER] = this._getNewIterator();
        }

        keys = Object.keys(snippetTagContent);
        for (i = keys.length-1; i >= 0; i--){
            snippetTag = keys[i];
            snippet = snippet.replace(new RegExp(snippetTag, "g"), snippetTagContent[snippetTag]);
            delete snippetTagContent[snippetTag];
        }

        return snippet;
    };

    ConstraintPlugin.prototype._getBlockCode = function(nodeId){
        //Return code that is part of another block


        if(this._isTypeOf(nodeId, this.META.Predicate)){
            //Return the snippet inline
            return this._generateCode(this.getNode(nodeId));

        }

        if(this._isTypeOf(nodeId, this.META.Command)){//Return the snippet with an indent
            var node = this.getNode(nodeId),
                snippet = "\t" + this._generateCode(node).replace(/\n/g, "\n\t");

            while(this.core.getPointerPath(node, 'next') && this._isTypeOf(this.core.getPointerPath(node, 'next'), this.META.Command)){
                node = this.getNode(this.core.getPointerPath(node, 'next'));
                snippet += "\n\t" + this._generateCode(node).replace(/\n/g, "\n\t");
            }

            return snippet;
        }
    };

    //Thanks to Tamas for the next two functions
    ConstraintPlugin.prototype._saveOutput = function(code, callback){
        var self = this,
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

        //Save all files
        artifact.addFile(fileName + "." + self._constraintMapping.ext,code,checkIfShouldSaveAll);
    };

    ConstraintPlugin.prototype._errorMessages = function(message){
        var self = this;
        self.createMessage(self.activeNode,message);
    };

    return ConstraintPlugin;

});
