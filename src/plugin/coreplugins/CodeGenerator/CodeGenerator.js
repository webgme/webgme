/*globals RegExp,_,define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved
 *
 * @author brollb / https://github/brollb
 * 
 * Code generation functionality
 */

define(['plugin/PluginConfig',
        'plugin/PluginBase',
        './Languages'], function (PluginConfig,
                                  PluginBase,
                                  SupportedLanguages){

    'use strict';

    /*
     * Since I don't want to pollute any children types'
     * object namespace, I will use a lot of variables 
     * here.
     */

    var DEFAULT = '__default__';  // For use with untyped variables
    var CodeGenerator = function() {

        PluginBase.call(this);

    };

    //basic functions and setting for plugin inheritance
    CodeGenerator.prototype = Object.create(PluginBase.prototype);
    CodeGenerator.prototype.constructor = CodeGenerator;

    CodeGenerator.prototype.getName = function () {
        return "CodeGenerator";
    };

    CodeGenerator.prototype.getConfigStructure = function () {
        var config = [],
            langs =  Object.keys(SupportedLanguages),
            displayName;

        // Select a language
        for (var i = 0; i < langs.length; i++){
            displayName = /[^\.]*/.exec(langs[i])[0];
            config.push({ name: displayName,
                          displayName: displayName,
                          description: 'Generate ' + displayName + ' code',
                          value: false, // this is the 'default config'
                          valueType: "boolean",
                          readOnly: false });
        }

        return config;
    };

    CodeGenerator.prototype.main = function (callback) {
        var self = this,
            changedNode = this.activeNode,
            options = { codeDefinition: {} },
            codeDefs = [],
            saveMessage = "Created code (";

        this.code = {};
        self.config = self.getCurrentConfig();
        // Get code definition(s)
        for (var lang in self.config) {
            if (SupportedLanguages[lang] && self.config[lang] === true) {
                codeDefs.push(SupportedLanguages[lang]);
            }
        }

        self._loadStartingNodes(function(err){
            if(err){
                //finishing
                self.result.success = false;
                callback(err,self.result);
            } else {
                //executing the plugin
                self.logger.info("Finished loading children");

                options.nodes = self.getAllNodeIds();
                for (var i = 0; i < codeDefs.length; i++) {
                    options.codeDefinition = codeDefs[i];
                    self.code[codeDefs[i].ext] = self.createCode(options);
                    saveMessage += (codeDefs.language || codeDefs.ext) + ', ';
                }

                //Create save message
                saveMessage += ') from ' + self.core.getAttribute(changedNode, 'name');

                if(err){
                    self.result.success = false;
                    callback(err,self.result);
                } else {
                    //Save the constraint changes
                    self.save(saveMessage, function(err){
                        //Download code files
                        self._saveOutput(function(err){
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
                    });
                }
            }
        });
    };

    CodeGenerator.prototype.createCode = function(options) {
        var opts = _.extend({}, options),
            currentNode,
            variables = [],//List of variables to declare
            nodeIds,
            i;

        this._initLangSpec(opts.codeDefinition);
        this.generatedCode = "";

        currentNode = null;
        nodeIds = opts.nodes;
        i = nodeIds.length;

        //Find the starting block and declare variables
        while (i--){
            if(this._isTypeOf(nodeIds[i], this.META.start) && !this._isTypeOf(nodeIds[i], this.META.command)){
               //Found the starting node
               currentNode = this.getNode(nodeIds[i]);
               
            } else if(this._isVariable(nodeIds[i])){
                variables.push(nodeIds[i]);
            }
        }

        //Declare all the variables
        this._initializeVariableMap(variables);
        this._declareVariables(variables);
        this._createCodeMapping();

        //Find the last node (for inserting callback)
        this._setNodeEndCode();

        currentNode = this.core.getPointerPath(currentNode, 'next');
        this.generatedCode += this._generateCode(currentNode) + "\n";

        this._mergeCodeSegments();

        return this.generatedCode;
    };

    /**
     * Initialize basics of the specified language. This includes var types, etc.
     * This also contains the defaults for languages.
     *
     * @private
     * @return {undefined}
     */
    CodeGenerator.prototype._initLangSpec = function(codeDefinition) {

        this.langSpec = {
            reservedWords: null,
            variables: null,
            placeholders: {ITERATOR: '%__iterator__',
                           FUNCTION_DEFS: '%__func_defs__',
                           CODE: '%__code__',
                           PARENT_SNIPPET_START: '%__parentSnippetStart__',
                           PARENT_SNIPPET_END: '%__parentSnippetEnd__'},
            optionalPlaceholders: [],
            endCode: {},
            uniqueness: 10000
        };

        codeDefinition.placeholders = codeDefinition.placeholders || {};

        _.extend(codeDefinition.placeholders, this.langSpec.placeholders);
        _.extend(this.langSpec, codeDefinition);
    };

    CodeGenerator.prototype._createCodeMapping = function() {

        //Code map:
        //
        //Adding the mapping of node META name to code
        //% sign indicates it will be replaced with either 
        //attribute of the given name or ptr tgt of the given name
        //

        var keys = Object.keys(this.langSpec);
        var len = keys.length;
        var key;
        var i;

        //Check for name collisions
        keys = Object.keys(this.langSpec.variables.private);
        len = keys.length;

        for (i = 0; i < len; i++){
            key = keys.pop();
            this.langSpec.variables.private[key] = this._createUniqueName(this.langSpec.variables.private[key]);
        }

        //Placeholders
        keys = Object.keys(this.langSpec.placeholders);
        while (keys.length){
            key = keys.pop();
            if (!_.isFunction(this.langSpec.placeholders[key])){
                this.langSpec.placeholders[key] = this._createUniqueName(this.langSpec.placeholders[key]);
            }
        }

        // Create the code map
        _.extend(this.langSpec, this.langSpec.getCodeMap(this.langSpec));

    };

    CodeGenerator.prototype._initializeVariableMap = function(variables){
        var names = {},
            name,
            node,
            i;

        this.variables = {};

        //Get all the names from the variables
        for (i = variables.length-1; i >= 0; i--){
            node = this.getNode(variables[i]);
            name = this.core.getAttribute(node, 'name');
            names[name] = true;
        }

        //Add js reserved words to variables to prevent collisions
        for (i = this.langSpec.reservedWords.length-1; i >= 0; i--){
            name = this.langSpec.reservedWords[i];
            while (names[name]){
                name = this.langSpec.reservedWords[i] + '_' + Math.floor(Math.random()*this.langSpec.uniqueness);
            }
            this.variables[name] = this.langSpec.reservedWords[i];
        }
    };

    CodeGenerator.prototype._declareVariables = function(variables){
        var types = Object.keys(this.langSpec.variables.definitions),
            variableType,
            variable,
            declared = {},
            name,
            i,
            j;

        //Remove the initial variable from declaration
        for (i = this.langSpec.variables.public.length -1; i >= 0; i--){
            this.variables[this.langSpec.variables.public[i]] = this.langSpec.variables.public[i];
            declared[this.langSpec.variables.public[i]] = true;//don't need to declare these
        }
 
        //Declare remaining variables
        for (i = variables.length -1; i >= 0; i--){
            variable = this.getNode(variables[i]);
            name = this.core.getAttribute(variable, 'name');
            if (declared[name]){
                continue;
            }

            variableType = null;
            j = types.length;

            while (j-- && !variableType){
                if (this._isTypeOf(variable, this.META[types[j]])){
                    variableType = this.langSpec.variables.definitions[types[j]];
                }
            }

            if (!variableType){
                variableType = this.langSpec.variables.definitions[DEFAULT];
            }

            //Keep track of the declared variables
            this._declareVar(variable, variableType);
            declared[name] = true;
        }

        this.generatedCode += "\n";
    };

    CodeGenerator.prototype._declareVar = function(variable, typeInfo){
        var name = this.core.getAttribute(variable, 'name'),
            varName = this._getValidVariableName(name.slice());

        varName = this._createUniqueName(varName);
        this.generatedCode += typeInfo.replace(new RegExp("%name", "g"), varName) + '\n';
        this.variables[name] = varName;
    };

    CodeGenerator.prototype._getValidVariableName = function(variableName){
        var basicRule = new RegExp(/[a-zA-Z_$][0-9a-zA-Z_$]*/),
            regexRule = new RegExp(/^[a-zA-Z_$][0-9a-zA-Z_$]*$/),
            matches;

        if (!regexRule.test(variableName)){
            variableName.replace(/ /g, "_");
            matches = variableName.match(basicRule) || [ "no_matches" ];
            variableName = this._createUniqueName(matches[0]);
        }

        return variableName;
    };

    /**
     * We will search all nodes and match the node to its ending code based
     * on the node type (using the "this.langSpec.endCode" dictionary). The
     * data is recorded in this.langSpec.endCode. 
     *
     * @private
     * @return {undefined}
     */
    CodeGenerator.prototype._setNodeEndCode = function(){
        var nodeIds = this.getAllNodeIds(),
            nodeType,
            node,
            base;

        for (var i = nodeIds.length-1; i >= 0; i--){
            node = this.getNode( nodeIds[i] );
            base = this.core.getBase(node);
            nodeType = this.core.getAttribute(base, 'name');
            if (this.langSpec.endCode[nodeType]){
                this.langSpec.endCode[nodeIds[i]] = this.langSpec.endCode[nodeType];
            }
        }
    };

    // Utility functions
    CodeGenerator.prototype._isTypeOf = function(node,type){
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

    CodeGenerator.prototype._isVariable = function(nodeId){
        var node = this.getNode(nodeId),
            base = this.core.getBase(node),
            typeName = this.core.getAttribute(base, 'name');

        return this.langSpec.variables.types.indexOf(typeName) > -1;
    };

    CodeGenerator.prototype._createUniqueName = function(variable){
        var self = this,
            newName = variable,
            variableExists = function(name){
                var keys = Object.keys(self.variables);

                while (keys.length){
                    if(name === self.variables[keys.pop()]){
                        return true;
                    }
                }

                return false;
            };

        while(variableExists(newName)){
            newName = variable + '_' + Math.floor(Math.random()*this.langSpec.uniqueness);
        }
        this.variables[newName] = newName;//Register the variable name
        return newName;
    };

    CodeGenerator.prototype.getNode = function(nodePath){
        //we check only our node cache
        return this._nodeCache[nodePath];
    };

    CodeGenerator.prototype._generateCode = function(nodeId){
        //Map stuff to code and return the code snippet
        var node = this.getNode(nodeId),
            base = this.core.getBase(node),
            typeName = this.core.getAttribute(base, 'name'),
            snippet = this.langSpec.codeMap[typeName],//Get the code for the given node...
            ptrs = this.core.getPointerNames(node),
            attributes = this.core.getAttributeNames(node),
            attribute,
            snippetTagContent = {},
            snippetTag,
            keys,
            targetNode,
            splitElements,
            subsnippets,
            newSnippet,
            parent = this.core.getParent(node),
            parentId = this.core.getPath(parent),
            i,
            k,
            j,
            dj = 1;

        //Get the snippet
        while (!snippet && base){
            base = this.core.getBase(base);
            typeName = this.core.getAttribute(base, 'name');
            snippet = this.langSpec.codeMap[typeName];
        }

        //Handle any placeholders (ie, iterators, function names)
        keys = Object.keys(this.langSpec.placeholders);
        for (i = 0; i < keys.length; i++){
            if (_.isFunction(this.langSpec.placeholders[keys[i]])){

                //resolve all argument names
                j = 0;
                while (snippet.indexOf(this.langSpec.placeholders[keys[i]](++j)) !== -1){
                    snippetTag = this.langSpec.placeholders[keys[i]](j);
                    if (snippet.indexOf(snippetTag) !== -1 && this.langSpec.variables.private[keys[i]] !== undefined){
                        snippetTagContent[snippetTag] = this._createUniqueName(this.langSpec.variables.private[keys[i]]);
                    }
                }

                snippetTag = this.langSpec.placeholders[keys[i]](0);
            } else {
                snippetTag = this.langSpec.placeholders[keys[i]];
            }

            if (snippet.indexOf(snippetTag) !== -1 && this.langSpec.variables.private[keys[i]] !== undefined){
                snippetTagContent[snippetTag] = this._createUniqueName(this.langSpec.variables.private[keys[i]]);
            }
        }

        //If the attribute name is in the snippet, substitute the attr name with the value
        i = attributes.length;
        while (i--){
            snippetTag = '%' + attributes[i];
            if (snippet.indexOf(snippetTag) !== -1){
                if (this.langSpec.optionalPlaceholders.indexOf(snippetTag) !== -1){
                    snippetTagContent[snippetTag] = '';
                    if (this.langSpec.endCode[parentId]){
                        snippetTagContent[snippetTag] = this.langSpec.endCode[parentId];
                    }

                } else {
                    snippetTagContent[snippetTag] = 'undefined';
                }

                attribute = this.core.getAttribute(node, attributes[i]);
                if (attributes[i] === "name"){//Name may be mapped to a variable-safe string
                    snippetTagContent[snippetTag] = this.variables[attribute] || attribute;
                } else {
                    snippetTagContent[snippetTag] = this._getFormattedAttribute(attribute);
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
                    if (this.langSpec.optionalPlaceholders.indexOf(snippetTag) !== -1){
                        snippetTagContent[snippetTag] = '';
                        if (this.langSpec.endCode[parentId]){
                            snippetTagContent[snippetTag] = this.langSpec.endCode[parentId];
                        }
                    } else {
                        snippetTagContent[snippetTag] = 'undefined';
                    }
                }
            }
        }

        //Replace any PARENT_SNIPPETS in the next loop
        //iff the node is a command type or if the snippet
        //already contains PARENT_SNIPPET (should always
        //only be 1 set of PARENT_SNIPPET's)
        if (this._isTypeOf(node, this.META.command) ||
              snippet.indexOf(this.langSpec.placeholders.PARENT_SNIPPET_START) !== -1){
            dj = 2;
        }

        keys = Object.keys(snippetTagContent);
        for (i = keys.length-1; i >= 0; i--){
            snippetTag = keys[i];

            //Flip the parent, child code if PARENT_SNIPPET
            if (_.isString(snippetTagContent[snippetTag]) && snippetTagContent[snippetTag].indexOf(this.langSpec.placeholders.PARENT_SNIPPET_START) !== -1){
                splitElements = '(' + this.langSpec.placeholders.PARENT_SNIPPET_START + 
                    '|' + this.langSpec.placeholders.PARENT_SNIPPET_END + ')';
                subsnippets = snippetTagContent[snippetTag].split(new RegExp(splitElements, 'g'));
                newSnippet = "";
                for (k = 0; k < subsnippets.length; k +=5){
                    subsnippets[k+2] = snippet.replace(new RegExp(snippetTag, "g"), subsnippets[k+2]);
                    for (j = k; j < k+5; j+=dj){
                        newSnippet += subsnippets[j];
                    }
                }
                snippet = newSnippet;
            } else {
                snippet = snippet.replace(new RegExp(snippetTag, "g"), snippetTagContent[snippetTag]);
                if (this.langSpec.endCode[nodeId]){
                    this.langSpec.endCode[nodeId]
                      .replace(new RegExp(snippetTag, "g"), snippetTagContent[snippetTag]);
                }
            }
            delete snippetTagContent[snippetTag];
        }

        return snippet;
    };

    /**
     * Format the value as number, special word or string.
     *
     * @param {String} value
     * @return {String} formatted value
     */
    CodeGenerator.prototype._getFormattedAttribute = function(value){  // FIXME add specification in codemap
        var number = new RegExp(/^[\d]*.[\d]*$/),
            specialValues = new RegExp(/^(null|undefined)$/);

        if (!number.test(value) && !specialValues.test(value)){
            value = '"' + value.replace(/[\\'"]/g, '\\$&') + '"';
        }

        return value;
    };

    CodeGenerator.prototype._loadStartingNodes = function(callback){
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
                    var cb = function(err){
                            e = e || err;
                            if(--j === 0){//callback only on last child
                                fn(e);
                            }
                        };

                    for(var i=0;i<children.length;i++){
                        self._nodeCache[self.core.getPath(children[i])] = children[i];
                        load(children[i], cb);
                    }
                }
            });
        };

        load(self.activeNode, callback);

    };

    CodeGenerator.prototype.getAllNodeIds = function(){
        return Object.keys(this._nodeCache);
    };

    //Create constraint and store it 
    CodeGenerator.prototype._mergeCodeSegments = function(){
        var code = this.generatedCode,
            funcDefs = "",//function definitions
            functions = Object.keys(this.langSpec.functions);

        //Add function definitions as needed 
        for (var i = functions.length-1; i >=0; i--){
            if (code.match(new RegExp('\\b' + functions[i])) !== null ||
               funcDefs.match(new RegExp('\\b' + functions[i] +'[ \n]*[(]')) !== null){
                funcDefs += this.langSpec.functions[functions[i]];
            }
        }

        code = this.langSpec.boilerplate.replace(this.langSpec.placeholders.CODE, code);
        code = code.replace(this.langSpec.placeholders.FUNCTION_DEFS, funcDefs);

        this.generatedCode = code;
    };

    CodeGenerator.prototype._errorMessages = function(message){
        var self = this;
        self.createMessage(self.activeNode,message);
    };

    CodeGenerator.prototype._saveOutput = function(callback){
        var self = this,
            filename = self.core.getAttribute(self.activeNode, 'name').replace(/ /g, "_"),
            artifact = self.blobClient.createArtifact(filename+"_code"),
            langExt = [],
            len = 0,

            //Function to check if we have added all files
            checkIfShouldSaveAll = function(err){
                len--;
                if(err){
                    callback(err);
                } else if (len === 0){
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

        //Save file for each language
        if (this.code){
            langExt = Object.keys(this.code);
            len = langExt.length;
        }

        var ext;
        while (langExt.length){
            ext = langExt.pop();
            artifact.addFile(filename + '-' + ext + '.' + ext,
                this.code[ext], checkIfShouldSaveAll);
        }
    };

    return CodeGenerator;

});
