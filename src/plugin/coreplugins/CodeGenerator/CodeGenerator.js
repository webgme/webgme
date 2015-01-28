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

    var DEFAULT = '__default__';  // For use with untyped variables
    var namespace  = { USR: 'USR', LANG: 'LANG' };
    var varId = 0;
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
            options = { langSpec: {} },
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
                    options.langSpec = codeDefs[i];
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
                        self.onFinish(self.code, function(err){
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

        this._initLangSpec(opts.langSpec);
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
        this._declareVariables(variables);

        //Find the last node (for inserting callback)
        this._setNodeEndCode();

        currentNode = this.core.getPointerPath(currentNode, 'next');
        this.generatedCode += this._generateBlockCode(currentNode) + "\n";

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
    CodeGenerator.prototype._initLangSpec = function(langSpec) {

        this.langSpec = {
            reservedWords: null,
            variables: {
                types: [ 'map', 'string', 'number', 'boolean', 'collection'],
                format: /^[a-zA-Z_$][0-9a-zA-Z_$]*$/
            },
            placeholders: {ITERATOR: '__iterator__',
                           FUNCTION_DEFS: '__func_defs__',
                           CODE: '__code__'},
            async: {START: '_async_start_',
                    END: '_async_end_'},
            optionalPlaceholders: ['next', 'true_next', 'false_next'],
            undefined: 'null',
            endCode: {},
            codeMap: {},
            functions: {}
        };

        langSpec.placeholders = langSpec.placeholders || {};

        // Copy (depth 2) langSpec attributes to this.langSpec
        //  Merge objects. Overwrite all else.
        for (var l in langSpec) {
            if (_.isObject(langSpec[l]) && !_.isArray(langSpec[l])) {
                for (var k in langSpec[l]) {
                    this.langSpec[l][k] = langSpec[l][k];
                }
            } else {
                this.langSpec[l] = langSpec[l];
            }
        }
    };

    CodeGenerator.prototype._declareVariables = function(variables){
        var types = Object.keys(this.langSpec.variables.definitions),
            declared = {},
            variableType,
            names = {},
            variable,
            name,
            node,
            j,
            i;

        // Create the variable namespaces
        this.variables = {};
        for (var n in namespace) {
            this.variables[namespace[n]] = {};
        }

        //Add the following to variables to prevent collisions
        //  - js reserved words 
        //  - private variables
        for (i = this.langSpec.reservedWords.length-1; i >= 0; i--){
            name = this.langSpec.reservedWords[i];
            this.variables[namespace.LANG][name] = this.langSpec.reservedWords[i];
        }

        for (i = this.langSpec.variables.private.length-1; i >= 0; i--){
            name = this.langSpec.variables.private[i];
            this.variables[namespace.LANG][name] = this.langSpec.variables.private[i];
        }

        //Remove the initial variable from declaration
        for (i = this.langSpec.variables.public.length -1; i >= 0; i--){
            name = this.langSpec.variables.public[i];  // 'public' vars in 
            this.variables[namespace.USR][name] = this.langSpec.variables.public[i];  // boilerplate are pushed to USR space
            declared[name] = true;                                     // but we don't declare them
        }
 
        //Declare remaining variables
        for (i = variables.length -1; i >= 0; i--){
            variable = this.getNode(variables[i]);
            name = this.core.getAttribute(variable, 'name');
            if (declared[name]){  // If already declared, skip it
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

    // Declare variable in user namespace
    CodeGenerator.prototype._declareVar = function(variable, typeInfo){
        var name = this.core.getAttribute(variable, 'name'),
            varName = this._getValidVariableName(name.slice());

        varName = this._createUniqueName(varName);
        this.generatedCode += typeInfo.replace(this._getPlaceholderRegex('name'), varName) + '\n';
        this.variables[namespace.USR][name] = varName;
    };

    CodeGenerator.prototype._getPlaceholderRegex = function(name){
        return new RegExp('{{\\s*' + name + '\\s*}}', 'g');
    };

    CodeGenerator.prototype._getParentRegex = function(){
        return new RegExp('{{\\s*' + this.langSpec.async.START+ 
          '\\s*}}(.*){{\\s*'+this.langSpec.async.END+'\\s*}}', 'g');
    };

    CodeGenerator.prototype._getValidVariableName = function(variableName){
        var basicRule = new RegExp(/[a-zA-Z][0-9a-zA-Z_]*/),
            regexRule = this.langSpec.variables.format,  
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
    CodeGenerator.prototype._setNodeEndCode = function(){  // FIXME
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
            namespaces = Object.keys(this.variables),
            allVars = [],
            variableExists = function(name){

                for (var v = allVars.length-1; v >= 0; v--) {
                    if(name === allVars[v]){
                        return true;
                    }
                }

                return false;
            };

        for (var i = 0; i < namespaces.length; i++) {
            allVars = allVars.concat(Object.keys(this.variables[namespaces[i]]));
        }

        while(variableExists(newName)){
            newName = variable + '_' + (++varId);
        }
        this.variables[namespace.USR][newName] = newName;  // Register the variable name
        return newName;
    };

    CodeGenerator.prototype.getNode = function(nodePath){
        //we check only our node cache
        return this._nodeCache[nodePath];
    };

    CodeGenerator.prototype._generateBlockCode = function(nodeId){
        //Map stuff to code and return the code snippet
        var node = this.getNode(nodeId),
            base = this.core.getBase(node),
            typeName = this.core.getAttribute(base, 'name'),
            snippet = this.langSpec.codeMap[typeName],  // Get the code for the given node...
            ptrs = this.core.getPointerNames(node),
            attributes = this.core.getAttributeNames(node),
            attribute,
            snippetTagContent = {},
            snippetTag,
            keys,
            key,
            targetNode,
            splitElements,
            subsnippets,
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
                key = this.langSpec.placeholders[keys[i]](j);
                snippetTag = this._getPlaceholderRegex(key);
                while (snippet.match(snippetTag) !== null){
                    if (this.langSpec.variables.private.indexOf(keys[i]) !== undefined){
                        snippetTagContent[key] = this._createUniqueName(this._getValidVariableName(key));
                    }
                    key = this.langSpec.placeholders[keys[i]](++j);
                    snippetTag = this._getPlaceholderRegex(key);
                }

                key = this.langSpec.placeholders[keys[i]](0);
            } else {
                key = this.langSpec.placeholders[keys[i]];
            }

            snippetTag = this._getPlaceholderRegex(key);
            if (snippet.match(snippetTag) !== null){
                snippetTagContent[key] = this._createUniqueName(this._getValidVariableName(key));
            }
        }

        //If the attribute name is in the snippet, substitute the attr name with the value
        i = attributes.length;
        while (i--){
            snippetTag = this._getPlaceholderRegex(attributes[i]);
            if (snippet.match(snippetTag) !== null){
                if (this.langSpec.optionalPlaceholders.indexOf(attributes[i]) !== -1){
                    snippetTagContent[attributes[i]] = '';
                    if (this.langSpec.endCode[parentId]){
                        snippetTagContent[attributes[i]] = this.langSpec.endCode[parentId];
                    }

                } else {
                    snippetTagContent[attributes[i]] = this.langSpec.undefined;
                }

                attribute = this.core.getAttribute(node, attributes[i]);
                if (attributes[i] === "name"){  // Assuming variable block
                    // Retrieve language satisfactory variable name from USR namespace
                    snippetTagContent[attributes[i]] = this.variables[namespace.USR][attribute] || attribute;
                } else {
                    snippetTagContent[attributes[i]] = this._getFormattedAttribute(attribute);
                }
            }
        }

        //If ptr name is present in the snippet, swap it out with the code from the tgt
        //ptrs have precedence over attributes
        i = ptrs.length;
        while(i--){
            snippetTag = this._getPlaceholderRegex(ptrs[i]);
            if (snippet.match(snippetTag) !== null){ 

                if(this.core.getPointerPath(node, ptrs[i])){
                    targetNode = this.core.getPointerPath(node, ptrs[i]);
                    snippetTagContent[ptrs[i]] = this._generateBlockCode(targetNode);
                } 
                if (!snippetTagContent[ptrs[i]]){
                    if (this.langSpec.optionalPlaceholders.indexOf(ptrs[i]) !== -1){
                        snippetTagContent[ptrs[i]] = '';
                        if (this.langSpec.endCode[parentId]){  // FIXME parentId should be META object name not id
                            snippetTagContent[ptrs[i]] = this.langSpec.endCode[parentId];
                        }
                    } else {
                        snippetTagContent[ptrs[i]] = this.langSpec.undefined;
                    }
                }
            }
        }

        //Replace any PARENT_SNIPPETS in the next loop
        //iff the node is a command type or if the snippet
        //already contains PARENT_SNIPPET (should always
        //only be 1 set of PARENT_SNIPPET's)
        var parentRegex = this._getParentRegex(),
            parentStart,
            parentEnd,
            subsnippet,
            match;

        keys = Object.keys(snippetTagContent);
        for (i = keys.length-1; i >= 0; i--){
            snippetTag = this._getPlaceholderRegex(keys[i]);

            //Flip the parent, child code if PARENT_SNIPPET
            // There is a much easier way to do this...
            if (_.isString(snippetTagContent[keys[i]]) && snippetTagContent[keys[i]].match(parentRegex) !== null){
                // I can get the matching parent group
                subsnippet = snippetTagContent[keys[i]];
                match = snippetTagContent[keys[i]].match(parentRegex)[0];

                //    Remove the parent template markers
                parentStart = this._getPlaceholderRegex(this.langSpec.async.START);
                parentEnd = this._getPlaceholderRegex(this.langSpec.async.END);
                match = match.replace(parentStart, '').replace(parentEnd, '');

                //    Replace the key regex with the result in snippet
                snippet = snippet.replace(snippetTag, match);

                // Replace the subsnippet with the snippet
                subsnippet = subsnippet.replace(parentRegex, snippet);
                snippet = subsnippet;
            } else {
                snippet = snippet.replace(snippetTag, snippetTagContent[keys[i]]);
                if (this.langSpec.endCode[nodeId]){
                    this.langSpec.endCode[nodeId]
                      .replace(snippetTag, snippetTagContent[keys[i]]);
                }
            }
            delete snippetTagContent[keys[i]];
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
        var number = new RegExp(/^[\d]*\.[\d]*$/),
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
            functions = Object.keys(this.langSpec.functions),
            placeholder;

        //Add function definitions as needed 
        for (var i = functions.length-1; i >=0; i--){
            if (code.match(new RegExp('\\b' + functions[i])) !== null ||
               funcDefs.match(new RegExp('\\b' + functions[i] +'[ \n]*[(]')) !== null){
                funcDefs += this.langSpec.functions[functions[i]];
            }
        }

        // Insert code into boilerplate
        placeholder = this._getPlaceholderRegex(this.langSpec.placeholders.CODE);
        code = this.langSpec.boilerplate.replace(placeholder, code);

        // Insert functions
        placeholder = this._getPlaceholderRegex(this.langSpec.placeholders.FUNCTION_DEFS);
        code = code.replace(placeholder, funcDefs);

        this.generatedCode = code;
    };

    CodeGenerator.prototype.onFinish = function(code, callback){
        this._saveOutput(callback);
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
            artifact.addFile(filename + '.' + ext,
                this.code[ext], checkIfShouldSaveAll);
        }
    };

    return CodeGenerator;

});
