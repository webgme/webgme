"use strict";

define(['logManager',
        'js/NodePropertyNames',
        'js/snap.META.js',
        'js/Constants'], function (logManager,
                                                    nodePropertyNames,
                                                    SnapMeta,
                                                    CONSTANTS) {
  
    var SnapInterpreter = function(_client) {
        this._logger = logManager.create('SnapInterpreter');
        this._client = _client;
        this.snapTypes = SnapMeta.TYPE_INFO;
        this.language = "python";
        this.currentObject;
        var self = this;

        this._createCodeMapping();

        var ddlist = WebGMEGlobal.Toolbar.addDropDownButton({ 'title': "Code Generator" });
        for(var lang in this._languages){
            if(this._languages.hasOwnProperty(lang)){
                ddlist.addButton({ "title": "Generate " + lang + " code",
                        "text":lang, 
                        "clickFn": self._clickFn(lang, self),
                        });
            }
        }
        this._client.addEventListener(this._client.events.SELECTEDOBJECT_CHANGED, function (__project, nodeId) {
            self.currentObject = nodeId;
        });

    };

    SnapInterpreter.prototype._clickFn = function(lang, self){
        var terr = {};
        terr[CONSTANTS.PROJECT_ROOT_ID] = { 'children': 10 };//TODO Set the necessary depth!
        return function(){
            self._territoryId = self._client.addUI(self, function(events){
                    self._client.removeUI(self._territoryId);
                    self._runSnapInterpreter(lang);
                    });
            self._client.updateTerritory(self._territoryId, terr); 
        }
    };

    SnapInterpreter.prototype._createCodeMapping = function(){
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
                                               'Variable': "%name",
                                               'Set': '%var = %value' },
                                      'primitives': {'%var = %value': /[a-zA-Z\d._-]*/ },
                                      'ext': 'py' };

        //TODO use generated META as opposed to the hard coded types
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
                                                   'If': "if(%cond){\n %true_next\n}",
                                                   'Variable': "%name",
                                                   'Set': '%var = %value;' },
                                          'primitives': { 'var %var = %value;': /^[a-zA-Z\d._-]*$/ },
                                          'ext': 'js' };

    };

    SnapInterpreter.prototype._runSnapInterpreter = function(lang){
        this.language = lang;    
        this.variables = [];
        
        if(this.currentObject !== undefined
                && this.snapTypes.isProject(this.currentObject)){

            var currentNode = null,
                nodeIds = this._client.getNode(this.currentObject).getChildrenIds(),//Get all the children of the current node
                i = nodeIds.length;

            //Find the hat and declare variables
            while(i-- && currentNode === null){
                if(this.snapTypes.isHat(nodeIds[i]) && !this.snapTypes.isCommand(nodeIds[i]))
                    currentNode = this._client.getNode(nodeIds[i]);
            }

            //Follow the next pointers and map each object to it's given code
            var code = "";
            while(currentNode.getPointer('next').to){
                currentNode = this._client.getNode(currentNode.getPointer('next').to);
                code += this._generateCode(currentNode) + "\n";
            }

            code = this._languages[this.language].bp.replace("%code", code);
            this._download({ 'name': "generated_code", 'text': code });
        }
    };

    SnapInterpreter.prototype._generateCode = function(node){
        //Map stuff to code and return the code snippet
        var typeName = this._client.getNode(node.getBaseId()).getAttribute(nodePropertyNames.Attributes.name),
            snippet = this._languages[this.language].map[typeName],//Get the code for the given node...
            ptrs = node.getPointerNames(),
            attributes = node.getAttributeNames(),
            i = ptrs.length;

        //If ptr name is present in the snippet, swap it out with the code from the tgt
        //ptrs have precedence over attributes
        while(i--){
            if(node.getPointer(ptrs[i]).to && snippet.indexOf('%' + ptrs[i]) !== -1){
                var nId = node.getPointer(ptrs[i]).to,
                    dec = "";

                if(this.snapTypes.isVariable(nId) && this.variables.indexOf(nId)){
                    //Declare the variable

                    var n = this._client.getNode(nId);
                    dec = this._declareVar(n) + "\n"; //variable declaration
                    this.variables.push(nId);
                }
                snippet = dec + snippet.replace('%' + ptrs[i], this._getBlockCode(nId));
            }
        }

        //If the attribute name is in the snippet, substitute the attr name with the value
        i = attributes.length;
        while(i--){
            if(snippet.indexOf('%' + attributes[i]) !== -1){
                snippet = snippet.replace('%' + attributes[i], node.getAttribute(attributes[i]));
            }
        }

        return snippet;
    };

    SnapInterpreter.prototype._getBlockCode = function(nodeId){
        //Return code that is part of another block


        if(this.snapTypes.isPredicate(nodeId)){
            //Return the snippet inline
            return this._generateCode(this._client.getNode(nodeId));

        }

        if(this.snapTypes.isCommand(nodeId)){//Return the snippet with an indent
            var node = this._client.getNode(nodeId),
                snippet = "\t" + this._generateCode(node);

            while(node.getPointer('next').to 
                    && this.snapTypes.isCommand(node.getPointer('next').to)){
                node = this._client.getNode(node.getPointer('next').to);
                snippet += "\n\t" + this._generateCode(node);
            }

            return snippet;
        }
    };

    SnapInterpreter.prototype._declareVar = function(node){
        var primitives = this._languages[this.language].primitives,
            v = { 'name': node.getAttribute(nodePropertyNames.Attributes.name), //variable
                  'val': node.getAttribute('value') };
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

    SnapInterpreter.prototype._download = function(data){
        var pom = document.createElement('a'),
            name = data.name + '.' + this._languages[this.language].ext,
            txt = data.text;

        pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(txt));
        pom.setAttribute('download', name);
        pom.click();
    };

    return SnapInterpreter;
});
