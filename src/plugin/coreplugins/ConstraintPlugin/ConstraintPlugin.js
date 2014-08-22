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
       JS_RESERVED_WORDS = [ 'break', 'case', 'class', 'catch', 'const', 
           'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export',
           'extends', 'finally', 'for', 'function', 'if', 'import', 'in', 
           'instanceof', 'let', 'new', 'return', 'super', 'switch', 'this',
           'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
           'enum', 'await', 'implements', 'package', 'protected', 'static', 
           'interface', 'private', 'public', 'null', 'undefined', 'true', 'false'],
       ACCESSABLE_VARIABLES = ['currentNode'],
       PRIVATE_VARIABLES = { CORE: 'core',//Variable names to be unique-ized
                             CALLBACK: 'callback',
                             ERROR: 'err',
                             VIOLATION: 'violationInfo',
                             CACHE : '_nodeCache',
                             GET_NODE : 'getNode',
                             GET_DESCENDENTS: 'getDescendents',
                             GET_NODES: 'getNodes',
                             FILTER_BY_NODE_TYPE: 'filterByNodeType',
                             TYPE_OF : 'isTypeOf',

                             //Base values for iterators/functions
                             ITERATOR: 'i',
                             ARG: 'arg',
                             FUNCTION: 'fn'},

       PLACEHOLDER = { ITERATOR: '%__iterator__',//Placeholders to be unique-ized
                       FUNCTION: '%__func__',
                       ARG: function(i){ return '%__arg__'+ i + '__'; },//Create unique argument names
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
        return "ConstraintPlugin";
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

    ConstraintPlugin.prototype._loadConstraintNodes = function(callback){
        //we load the children of the constraintNodes
        var self = this,
            name,
            root = self.core.getRoot(self.activeNode),
            len,
            constraintsDirs = [];

        //Load the constraints to be run
        self.constraints = {};

        var findConstraints = function(l, dirs){
            var dir = dirs[--l];
            self.core.loadChildren(dir, function(err, children){
                if (!err && children){
                    for (var i = 0; i < children.length; i++){
                        name = self.core.getAttribute(children[i], 'name');
                        if (self.config.hasOwnProperty(name) && self.config[name]){
                            self.constraints[name] = children[i];//Store the node by constraint name
                        }
                    }
                }

                if (l > 0){
                    findConstraints(l, dirs);
                } else {
                    self._loadStartingNodes(callback);
                }
            });
        };

        self.core.loadChildren( root, function(err, children){
            if (!err && children){
                //Find the constraints dir
                for (var i = 0; i < children.length; i++){
                    if (self._isTypeOf(children[i], self.META.Constraints)){
                        //found constraints dir!
                        constraintsDirs.push(children[i]);
                    }
                }
                len = constraintsDirs.length;
                findConstraints(len, constraintsDirs);
            }
        });

    };

    ConstraintPlugin.prototype._loadStartingNodes = function(callback){
        var self = this,
            constraints = self.constraints;

        self._nodeCache = {};

        var load = function(name, node, fn){
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
                        self._nodeCache[name][self.core.getPath(children[i])] = children[i];
                        load(name, children[i], callbackIfDone);
                    }
                }
            });
        };

        //Load the nodes and store them in their own nodeCache entry
        var loadConstraintNodes = function(constraints){
            var names = Object.keys(constraints),
                name,
                node,
                len = names.length,
                err = null,
                id,
                cb = function(e){
                    err = e || err;
                    len--;
                    if (len <= 0){
                        callback();
                    }
                };

            if (names.length){
                while (names.length){
                    name = names.pop();
                    self._nodeCache[name] = {};

                    //Add the constraint node
                    node = self.constraints[name];
                    id = self.core.getPath(node);
                    self._nodeCache[name][id] = node;

                    load(name, constraints[name], cb);
                }
            } else {
                cb();
            }
        };

        loadConstraintNodes(constraints);

    };

    ConstraintPlugin.prototype.getNode = function(nodePath){
        //we check only our node cache
        return this._nodeCache[this.currentConstraint][nodePath];
    };

    ConstraintPlugin.prototype.getAllNodeIds = function(){
        return Object.keys(this._nodeCache[this.currentConstraint]);
    };

    ConstraintPlugin.prototype.getConfigStructure = function () {
        var config = [],
            constraints = [ 'Unique Name', 'OneStartBlock', 'Limited Connections Per Item', 'test2' ];

        //Apply To All Option
        config.push({ name: 'applyAll',
                      displayName: "Add constraints to node base",
                      description: 'Apply constraints to all nodes of this type',
                      value: false, // this is the 'default config'
                      valueType: "boolean",
                      readOnly: false });

        //Get the constraint names to populate the config
        //Currently this is not possible.
        //TODO

        for (var i = 0; i < constraints.length; i++){
            config.push({ name: constraints[i],
                          displayName: constraints[i],
                          description: 'Generate the ' + constraints[i] + ' constraint',
                          value: false, // this is the 'default config'
                          valueType: "boolean",
                          readOnly: false });
        }

        return config;
    };

    ConstraintPlugin.prototype.main = function (callback) {
        var self = this,
            changedNode = this.activeNode,
            saveMessage = "Added constraints (";

        self.config = self.getCurrentConfig();

        self._loadConstraintNodes(function(err){
            if(err){
                //finishing
                self.result.success = false;
                callback(err,self.result);
            } else {
                //executing the plugin
                self.logger.info("Finished loading children");
                err = self._runSync();

                //Create save message
                saveMessage += self.getConstraintNames().join(",") + ") to ";
                if (self.config.applyAll){
                    changedNode = self.core.getBase(changedNode);
                } 

                saveMessage += self.core.getAttribute(changedNode, 'name');

                if(err){
                    self.result.success = false;
                    callback(err,self.result);
                } else {
                    //Save the constraint changes
                    self.save(saveMessage, function(err){
                        //Download language files
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

    ConstraintPlugin.prototype.getConstraintNames = function(){
        return Object.keys(this._nodeCache);
    };

    //Get node names and store nodes in dictionary
    ConstraintPlugin.prototype.getConstraintNodes = function(){
        return this.constraints;
    };

    ConstraintPlugin.prototype._runSync = function(){
        var constraints = Object.keys(this.constraints),
            i = constraints.length,
            constNames,
            node = this.activeNode,
            err = null;

        if (this.config.applyAll){
            node = this.core.getBase(this.activeNode);
        }

        //delete old constraints
        constNames = this.core.getConstraintNames(node);
        for (var j = constNames.length-1; j >= 0; j--){
            this.core.delConstraint(node, constNames[j]);
        }

        while (i-- && !err){
            this.currentConstraint = constraints[i];
            err = this.createConstraintCode(constraints[i]);

            if (!err){
                //Apply the constraints to the activeNode
                //Currently this is set to add the constraint to the given node - NOT the node TYPE (META object)
                //This could be a problem...
                
                this.core.setConstraint(node, constraints[i], this.constraintObject[constraints[i]]);
            }
        }

        return err;
    };

    ConstraintPlugin.prototype.createConstraintCode = function(){
        var err = null,
            currentNode,
            variables = [],//List of variables to declare
            nodeIds,
            i;

        this.generatedCode = "";

        currentNode = null;
        nodeIds = this.getAllNodeIds();
        i = nodeIds.length;

        //Find the hat and declare variables
        while (i--){
            if(this._isTypeOf(nodeIds[i], this.META.Hat) && !this._isTypeOf(nodeIds[i], this.META.Command)){
               //Found the starting node
               currentNode = this.getNode(nodeIds[i]);
               
            } else if(this._isTypeOf(nodeIds[i], this.META.variable)){
                variables.push(nodeIds[i]);
            }
        }

        //Declare all the variables
        this._initializeVariableMap(variables);
        this._declareVariables(variables);
        this._createConstraintMapping();

        //Find the last node (for inserting callback)
        this._setNodeEndCode();

        currentNode = this.core.getPointerPath(currentNode, 'next');
        this.generatedCode += this._generateCode(currentNode) + "\n";

        this._createConstraintObject();

        return err;
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
            if (!_.isFunction(PLACEHOLDER[key])){
                PLACEHOLDER[key] = this._createUniqueName(PLACEHOLDER[key]);
            }
        }

        this._constraintExtension = 'js';

        this._constraintBoilerPlate = 'function(core, currentNode, callback){\n\n' + 
            '"use strict";\n\nvar ' + PRIVATE_VARIABLES.VIOLATION +
            ' = { hasViolation: false };\n' +
            'var ' + PRIVATE_VARIABLES.ERROR + ' = null;\n' +
            'var ' + PRIVATE_VARIABLES.CACHE + ' = {};\n' +

            //Get Node function
            'var ' + PRIVATE_VARIABLES.GET_NODE + ' = function(nodeId, cb){\n' +
            'var node;\nif (nodeId === currentNode){\n'+
            'cb(currentNode);\n}\n\nif (' + PRIVATE_VARIABLES.CACHE + '[nodeId]){\n' +
            'cb(' + PRIVATE_VARIABLES.CACHE + '[nodeId]);\n' +
            '}\nnode = core.loadByPath(currentNode, nodeId, function(n){\n' +
            '' + PRIVATE_VARIABLES.CACHE + '[nodeId] = node;\n\ncb(node);\n});\n};\n' + 

            //Get nodes
            'var ' + PRIVATE_VARIABLES.GET_NODES +'= function(nodeIds, cb){\nvar '+
            'result = [],\ndone = function (node){\nresult.push(node);if (result.length'+
            ' === nodeIds.length){\ncb(result);\n}\n};\nfor (var i = nodeIds.length-1;'+
            ' i>=0; i--){\n'+ PRIVATE_VARIABLES.GET_NODE +'(nodeIds[i], done);\n}\n};\n'+

            //Get Descendents function
            'var ' + PRIVATE_VARIABLES.GET_DESCENDENTS + '= function' +
            '(n, _callback){\nvar result = [];\nvar count = 1;\nvar load'+
            ' = function(node, cb){\ncore.loadChildren(node, function(e,'+
            ' children){\nif (!e){\nresult.push(node);\ncount += children'+
            '.length;\nfor (var i = children.length-1; i >= 0; i--){\nload'+
            '(children[i], cb);\n}\nif (count === result.length){\ncb(result);'+
            '\n}\n} else {\n' + PRIVATE_VARIABLES.ERROR + ' = e;\n}\n});\n};\n'+
            'load(n, _callback);\n\n};\n'+

            //Type Of function
            'var ' + PRIVATE_VARIABLES.TYPE_OF + ' = function(node,type){\n' + 
            'if(node === undefined || node === null || type === undefined || ' + 
            'type === null){\nreturn false;\n}\n\n' +
            'while(node){\nif(core.getAttribute(node, "name") === type){\n'+
            'return true;\n}\nnode = core.getBase(node);\n}\nreturn false;\n};\n'+
            '\n\n%code\n\n}'+

            'var ' + PRIVATE_VARIABLES.FILTER_BY_NODE_TYPE +'(nodeSet, type, cb){\n'+
            'var result = [],\nid;\n'+PRIVATE_VARIABLES.GET_NODES+'(nodeSet, '+
            'function(nodes){\nfor (var i = nodes.length-1; i>=0; i--){\nif ('+
            PRIVATE_VARIABLES.TYPE_OF+'(nodes, type)){id = core.getPath(nodes[i]);\n'+
            'result.push(id);\n}\n}\ncb(result);\n});\n};';

        this._constraintMapping = {
            'add': "%first + %second", 
            'subtract': "%first - %second", 
            'multiply': "(%first) * (%second)", 
            'divide': "(%first)/(%second)", 

            //Binary Predicates
            'lessThan': "(%first) < (%second)", 
            'greaterThan': "(%first) > (%second)", 
            'equal': "(%first) === (%second)", 
            'and': "(%first) && (%second)", 
            'or': "(%first) || (%second)", 
            'xor': "((%first) || (%second)) && !((%first) && (%second))", 

            //Control flow
            'if': "if (%cond){\n%true_next\n}\n%next",

            //Variables
            'dictionary': "%name",
            'variable': "%name",
            'collection': "%name",
            'node': "%name",
            'nodeSet': "%name",
            'item': "%name",

            //Map mappings
            'addToMap': "%map[%first] = %second;\n%next",
            'getItemFromMap': "%map[%first]",
            'getKeysFromMap': "Object.keys(%map)",

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
            'isTypeOf': PRIVATE_VARIABLES.GET_NODE+"(%node, function(" + PLACEHOLDER.ARG(0) + 
                "){\n" + PLACEHOLDER.PARENT_SNIPPET_START + PRIVATE_VARIABLES.TYPE_OF + 
                "(" + PLACEHOLDER.ARG(0) + ", %first)" + PLACEHOLDER.PARENT_SNIPPET_END + "\n});",

            'getChildren': PRIVATE_VARIABLES.GET_NODE+"(%node, function(" + PLACEHOLDER.ARG(0) + 
                "){\n" + PLACEHOLDER.PARENT_SNIPPET_START + "core.getChildrenPaths(" + PLACEHOLDER.ARG(0) + 
                ")" + PLACEHOLDER.PARENT_SNIPPET_END + "\n});",

            'getDescendents': PRIVATE_VARIABLES.GET_NODE +"(%node, function(" + PLACEHOLDER.ARG(0) + 
                "){\n" + PRIVATE_VARIABLES.GET_DESCENDENTS +
                "(" + PLACEHOLDER.ARG(0) + ", function(" + PLACEHOLDER.ARG(1) + "){\n" + 
                PLACEHOLDER.PARENT_SNIPPET_START + PLACEHOLDER.ARG(1) + 
                PLACEHOLDER.PARENT_SNIPPET_END + "});\n\n});",

            'getParent': PRIVATE_VARIABLES.GET_NODE+"(%node, function(" + PLACEHOLDER.ARG(0) + 
                "){\n" + PLACEHOLDER.PARENT_SNIPPET_START + "core.getParentPath(" + PLACEHOLDER.ARG(0) + 
                ")" + PLACEHOLDER.PARENT_SNIPPET_END + "\n});",

            'getPointer': PRIVATE_VARIABLES.GET_NODE+"(%node, function(" + PLACEHOLDER.ARG(0) + 
                "){\n" + PLACEHOLDER.PARENT_SNIPPET_START + "core.getPointerPath(" + PLACEHOLDER.ARG(0) + 
                ")" + PLACEHOLDER.PARENT_SNIPPET_END + "\n});",

            'getAttribute': PRIVATE_VARIABLES.GET_NODE+"(%second, function(" + PLACEHOLDER.ARG(0) + 
                "){\n" + PLACEHOLDER.PARENT_SNIPPET_START + "core.getAttribute(" + PLACEHOLDER.ARG(0) + 
                ", %first)" + PLACEHOLDER.PARENT_SNIPPET_END + "\n});",

            'filterByNodeType': PRIVATE_VARIABLES.FILTER_BY_NODE_TYPE +"(%second, function(" + 
                PLACEHOLDER.ARG(0) + "){\n" + PLACEHOLDER.PARENT_SNIPPET_START + PLACEHOLDER.ARG(0) +
                PLACEHOLDER.PARENT_SNIPPET_END + "\n});",

            'forEach': "var " + PLACEHOLDER.FUNCTION + " = function(" + 
                PLACEHOLDER.ITERATOR + "){\nif (" + PLACEHOLDER.ITERATOR + 
                ' < %collection.length){\n%iter = %collection[' + 
                PLACEHOLDER.ITERATOR + '];\n%true_next\n} else {\n %next\n} };\n'+
                'var ' + PLACEHOLDER.ITERATOR + ' = 0;\n' + PLACEHOLDER.FUNCTION +
                '(' + PLACEHOLDER.ITERATOR + ');\n',

            'repeat': "var " + PLACEHOLDER.FUNCTION + " = function(" + 
                PLACEHOLDER.ITERATOR + "){\nif (" + PLACEHOLDER.ITERATOR + 
                ' < %count){\n%true_next\n} else {\n %next\n} };\n'+
                'var ' + PLACEHOLDER.ITERATOR + ' = 0;\n' + PLACEHOLDER.FUNCTION +
                '(' + PLACEHOLDER.ITERATOR + ');\n',

            'while': 'var ' + PLACEHOLDER.FUNCTION + ' = function(){\n' +
                'if (%cond){\n%true_next\n} else {\n %next\n} };\n'+
                 PLACEHOLDER.FUNCTION + '();\n'
            };

            //additional end code by node type
            this._constraintEndCode = {
                'forEach': PLACEHOLDER.FUNCTION + "(++" + PLACEHOLDER.ITERATOR + ");\n",
                'repeat': PLACEHOLDER.FUNCTION + "(++" + PLACEHOLDER.ITERATOR + ");\n",
                'while': PLACEHOLDER.FUNCTION + "();\n",

                'constraint': '\ncallback( ' + PRIVATE_VARIABLES.ERROR + 
                    ', ' + PRIVATE_VARIABLES.VIOLATION + ');\n'
            };

            //additional end code by node id
            this._nodeEndCode = {};
    };

    ConstraintPlugin.prototype._createUniqueName = function(variable){
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
            newName = variable + '_' + Math.floor(Math.random()*UNIQUENESS_COEFFICIENT);
        }
        this.variables[newName] = newName;//Register the variable name
        return newName;
    };

    ConstraintPlugin.prototype._initializeVariableMap = function(variables){
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
        for (i = JS_RESERVED_WORDS.length-1; i >= 0; i--){
            name = JS_RESERVED_WORDS[i];
            while (names[name]){
                name = JS_RESERVED_WORDS[i] + '_' + Math.floor(Math.random()*UNIQUENESS_COEFFICIENT);
            }
            this.variables[name] = JS_RESERVED_WORDS[i];
        }
    };

    ConstraintPlugin.prototype._declareVariables = function(variables){
        var types = Object.keys(this._variableTypes),
            variableType,
            variable,
            declared = {},
            name,
            i,
            j;

        //Remove the initial variable from declaration
        for (i = ACCESSABLE_VARIABLES.length -1; i >= 0; i--){
            this.variables[ACCESSABLE_VARIABLES[i]] = ACCESSABLE_VARIABLES[i];
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
                    variableType = this._variableTypes[types[j]];
                }
            }

            if (!variableType){
                variableType = this._variableTypes[DEFAULT];
            }

            //Keep track of the declared variables
            this._declareVar(variable, variableType);
            declared[name] = true;
        }

        this.generatedCode += "\n";
    };

    ConstraintPlugin.prototype._declareVar = function(variable, typeInfo){
        var name = this.core.getAttribute(variable, 'name'),
            varName = this._getValidVariableName(name.slice());

        varName = this._createUniqueName(varName);
        this.generatedCode += typeInfo.replace(new RegExp("%name", "g"), varName) + '\n';
        this.variables[name] = varName;
    };

    ConstraintPlugin.prototype._getValidVariableName = function(variableName){
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
            attribute,
            snippetTagContent = {},
            snippetTag,
            keys,
            i,
            j,
            targetNode,
            splitElements,
            subsnippets,
            newSnippet,
            parent = this.core.getParent(node),
            parentId = this.core.getPath(parent);

        //Handle any placeholders (ie, iterators, function names)
        keys = Object.keys(PLACEHOLDER);
        for (i = 0; i < keys.length; i++){
            if (_.isFunction(PLACEHOLDER[keys[i]])){

                //resolve all argument names
                j = 0;
                while (snippet.indexOf(PLACEHOLDER[keys[i]](++j)) !== -1){
                    snippetTag = PLACEHOLDER[keys[i]](j);
                    if (snippet.indexOf(snippetTag) !== -1 && PRIVATE_VARIABLES[keys[i]] !== undefined){
                        snippetTagContent[snippetTag] = this._createUniqueName(PRIVATE_VARIABLES[keys[i]]);
                    }
                }

                snippetTag = PLACEHOLDER[keys[i]](0);
            } else {
                snippetTag = PLACEHOLDER[keys[i]];
            }

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

    /**
     * Format the value as number, special word or string.
     *
     * @param {String} value
     * @return {String} formatted value
     */
    ConstraintPlugin.prototype._getFormattedAttribute = function(value){
        var number = new RegExp(/^[\d]*.[\d]*$/),
            specialValues = new RegExp(/^(null|undefined)$/);

        if (!number.test(value) && !specialValues.test(value)){
            value = '"' + value.replace(/[\\'"]/g, '\\$&') + '"';
        }

        return value;
    };

    //Create constraint and store it 
    ConstraintPlugin.prototype._createConstraintObject = function(){
        var code = this.generatedCode,
            constraintName = this.currentConstraint;

        code = this._constraintBoilerPlate.replace("%code", code);

        if (!this.constraintObject){
            this.constraintObject = {};
        }

        this.constraintObject[constraintName] = { script: code,
            priority: 0,
            name: constraintName };
    };

    //Thanks to Tamas for the next two functions
    ConstraintPlugin.prototype._saveOutput = function(callback){
        var self = this,
            filename = self.core.getAttribute(self.activeNode, 'name').replace(/ /g, "_"),
            artifact = self.blobClient.createArtifact(filename+"_constraints"),
            constraints = [],
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

        if (this.constraintObject){
            constraints = Object.keys(this.constraintObject);
            len = constraints.length;
        }

        //Save all files
        while (constraints.length){
            filename = constraints.pop();
            artifact.addFile(filename + "." + self._constraintExtension,
                this.constraintObject[filename].script, checkIfShouldSaveAll);
        }
    };

    ConstraintPlugin.prototype._errorMessages = function(message){
        var self = this;
        self.createMessage(self.activeNode,message);
    };

    return ConstraintPlugin;

});
