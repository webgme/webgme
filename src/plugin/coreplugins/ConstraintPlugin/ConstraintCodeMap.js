/*globals RegExp,_,define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved
 *
 * @author brollb / https://github/brollb
 * 
 * Code mapping definition
 */

/*
 * Needs to contain:
 *    - codeMapping
 *
 *    Optional:
 *      - boilerPlate
 *      - reservedWords
 */
define([], function (){

    'use strict';

    var JS_RESERVED_WORDS = [ 'break', 'case', 'class', 'catch', 'const', 
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
                             GET_DIMENSION: 'getDimension',
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
                       FUNCTION_DEFS: '%__func_defs__',
                       CODE: '%__code__',
                       ARG: function(i){ return '%__arg__'+ i + '__'; },//Create unique argument names
                       PARENT_SNIPPET_START: '%__parentSnippetStart__',
                       PARENT_SNIPPET_END: '%__parentSnippetEnd__' },
       OPTIONAL_PLACEHOLDERS = ['%next'],
       UNIQUENESS_COEFFICIENT = 10000000,

        //Defined in Constraint Language META
       variableTypes = [ 'map', 'string', 'number', 'boolean', 
            'node', 'collection', 'nodeSet'],
       variableDefinition = { 'map': 'var %name = {};',
                              'collection': 'var %name = [];',
                              '__default__': 'var %name = null;' },
       extension = 'js';

       var getCodeMap = function(params) {
           // The caller needs to make sure that the 
           // variables inserted here are the variables
           // after the collision stuff
           //
           // The code generator will need to get the 
           // private variables, resolve any name 
           // collisions, then pass the new values as 
           // parameters to this function

           var PRIVATE_VARIABLES = params.variables.private;
           var PLACEHOLDER = params.placeholders;

           var boilerplate = 'function('+PRIVATE_VARIABLES.CORE+', currentNode, callback){\n\n' + 
               '"use strict";\n\nvar ' + PRIVATE_VARIABLES.VIOLATION +
               ' = { hasViolation: false };\n' +
               'var ' + PRIVATE_VARIABLES.ERROR + ' = null;\n' +
               'var ' + PRIVATE_VARIABLES.CACHE + ' = {};\n' +
               PLACEHOLDER.FUNCTION_DEFS + '\n\n' + PLACEHOLDER.CODE + '\n\n}';

           //Functions potentially used in constraint
           var functions = {};

           //Get Dimension function
           functions[PRIVATE_VARIABLES.GET_DIMENSION] =     
               'var ' + PRIVATE_VARIABLES.GET_DIMENSION + ' = function(a){\n' +
               'var dim = 0;\nwhile (a instanceof Array){\na=a[0];\ndim++;\n}\n'+
               'return dim;\n};\n';

           //Get Node function
           functions[PRIVATE_VARIABLES.GET_NODE] =     
               'var ' + PRIVATE_VARIABLES.GET_NODE + ' = function(nodeId, cb){\n' +
               'var node;\nif (nodeId === currentNode){\n'+
               'cb(currentNode);\n} else if (' + PRIVATE_VARIABLES.CACHE + '[nodeId]){\n' +
               'cb(' + PRIVATE_VARIABLES.CACHE + '[nodeId]);\n' +
               '} else {\ncore.loadByPath(currentNode, nodeId, function(err, node){\n' +
               '' + PRIVATE_VARIABLES.CACHE + '[nodeId] = node;\n\ncb(node);\n});\n}\n};\n';

           //Get Descendents function
           functions[PRIVATE_VARIABLES.GET_DESCENDENTS] =     
               'var ' + PRIVATE_VARIABLES.GET_DESCENDENTS + '= function' +
               '(n, _callback){\nvar result = [];\nvar count = 1;\nvar id;\nvar load'+
               ' = function(node, cb){\ncore.loadChildren(node, function(e,'+
               ' children){\nif (!e){\nid = core.getPath(node);\nresult.push(id);\n'+
               'count += children.length;\n'+ PRIVATE_VARIABLES.CACHE + '[id] = node;\n'+
               'for (var i = children.length-1; i >= 0; i--){\n'+
               //'setTimeout(load, 0, children[i], cb);'+
               'load(children[i], cb);'+
               '\n}\nif (count === result.length){\ncb(result);'+
               '\n}\n} else {\n' + PRIVATE_VARIABLES.ERROR + ' = e;\n}\n});\n};\n'+
               'load(n, _callback);\n\n};\n';

           //Type Of function
           functions[PRIVATE_VARIABLES.TYPE_OF] =     
               'var ' + PRIVATE_VARIABLES.TYPE_OF + ' = function(node,type){\n' + 
               'if(node === undefined || node === null || type === undefined || ' + 
               'type === null){\nreturn false;\n}\n\n' +
               'while(node){\nif(core.getAttribute(node, "name") === type){\n'+
               'return true;\n}\nnode = core.getBase(node);\n}\nreturn false;\n};\n';

           //Get nodes
           functions[PRIVATE_VARIABLES.GET_NODES] =     
               'var ' + PRIVATE_VARIABLES.GET_NODES +'= function(nodeIds, cb){\nvar '+
               'result = [],\ndone = function (node){\nresult.push(node);if (result.length'+
               ' === nodeIds.length){\ncb(result);\n}\n};\nfor (var i = nodeIds.length-1;'+
               ' i>=0; i--){\n'+ PRIVATE_VARIABLES.GET_NODE +'(nodeIds[i], done);\n}\n};\n';

           //Filter by node type
           functions[PRIVATE_VARIABLES.FILTER_BY_NODE_TYPE] =     
               'var ' + PRIVATE_VARIABLES.FILTER_BY_NODE_TYPE +' = function(nodeSet, type, cb){\n'+
               'var result = [],\nid;\n'+PRIVATE_VARIABLES.GET_NODES+'(nodeSet, '+
               'function(nodes){\nfor (var i = nodes.length-1; i>=0; i--){\nif ('+
               PRIVATE_VARIABLES.TYPE_OF+'(nodes[i], type)){id = core.getPath(nodes[i]);\n'+
               'result.push(id);\n}\n}\ncb(result);\n});\n};';

           var codeMap = {
               //Binary Predicates
               'add': "%first + %second", 
               'subtract': "%first - %second", 
               'multiply': "(%first) * (%second)", 
               'divide': "(%first)/(%second)", 

               'lessThan': "(%first) < (%second)", 
               'greaterThan': "(%first) > (%second)", 
               'equal': "(%first) === (%second)", 

               'and': "(%first) && (%second)", 
               'or': "(%first) || (%second)", 
               'xor': "((%first) || (%second)) && !((%first) && (%second))", 

               'concat': '(\"\" + %first + %second)', 

               //Control flow
               'if': "if (%cond){\n%true_next\n}\n%next",
               'ifElse': "if (%cond){\n%true_next\n} else {\n%false_next\n}\n%next",

               //Variables
               'predicate': "%name",

               //Map mappings
               'addToMap': "%map[%first] = %second;\n%next",
               'removeFromMap': "delete %map[%string];\n%next",
               'getKeysFromMap': "Object.keys(%map)",

               'getItemFromCollection': "%collection[%first]",
               'getItemFromMap': "%map[%first]",

               //Collection mappings
               'addToCollection': 'if(' + PRIVATE_VARIABLES.GET_DIMENSION + '(%collection)'+
                   ' === ' + PRIVATE_VARIABLES.GET_DIMENSION +'(%first)){\n%collection = '+
                   '%collection.concat(%first);\n}else{\n%collection.push(%first);'+
                   '\n}\n%next',

               'contains': '%collection.indexOf(%first) !== -1',

               'markViolation': PRIVATE_VARIABLES.VIOLATION + " = { hasViolation: true," +
                   " message: %message, nodes: %node };\n\n%next",

               'not': "!(%first)",
               'getLength': "Object.keys(%collection).length",

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

               'getAttribute': PRIVATE_VARIABLES.GET_NODE+"(%node, function(" + PLACEHOLDER.ARG(0) + 
                   "){\n" + PLACEHOLDER.PARENT_SNIPPET_START + "core.getAttribute(" + PLACEHOLDER.ARG(0) + 
                   ", %first)" + PLACEHOLDER.PARENT_SNIPPET_END + "\n});",

               'filterByNodeType': PRIVATE_VARIABLES.FILTER_BY_NODE_TYPE +"(%nodeSet, %first, function(" + 
                   PLACEHOLDER.ARG(0) + "){\n" + PLACEHOLDER.PARENT_SNIPPET_START + PLACEHOLDER.ARG(0) +
                   PLACEHOLDER.PARENT_SNIPPET_END + "\n});",

               'forEach': "var " + PLACEHOLDER.FUNCTION + " = function(" + 
                   "){\nvar " + PLACEHOLDER.ARG(1) + " = Object.keys("+
                   "%collection);\nvar " + PLACEHOLDER.ARG(2) + " = " + PLACEHOLDER.ARG(1) + 
                   "[0];\nwhile("+PLACEHOLDER.ARG(0)+"["+PLACEHOLDER.ARG(2)+"] && "+
                   PLACEHOLDER.ARG(1) + ".length){\n" + PLACEHOLDER.ARG(2) + " = " + PLACEHOLDER.ARG(1)+
                   ".pop();\n}\nif (!" + PLACEHOLDER.ARG(0) + "[" + PLACEHOLDER.ARG(2) + 
                   ']){\n' + PLACEHOLDER.ARG(0) + '[' + PLACEHOLDER.ARG(2) + '] = true;\n%iter = %collection[' + 
                   PLACEHOLDER.ARG(2) + '];\n%true_next\n} else '+
                   '{\n %next\n} };\n'+'var ' + PLACEHOLDER.ARG(0) + ' = {};\n' + PLACEHOLDER.FUNCTION +
                   '();\n',

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
           var endCode = {
               'forEach': 'setTimeout(' + PLACEHOLDER.FUNCTION + ", 0);\n",
               'repeat': 'setTimeout(' + PLACEHOLDER.FUNCTION + ', 0, ++' + PLACEHOLDER.ITERATOR + ");\n",
               'while': 'setTimeout(' + PLACEHOLDER.FUNCTION + ", 0);\n",

               'constraint': '\ncallback( ' + PRIVATE_VARIABLES.ERROR + 
                   ', ' + PRIVATE_VARIABLES.VIOLATION + ');\n'
           };

           return {
               endCode: endCode,
               functions: functions,
               boilerplate: boilerplate,
               codeMap: codeMap 
           };
       };


       return {
           // Required
           getCodeMap: getCodeMap,

           // Optional
           reservedWords: JS_RESERVED_WORDS,
           variables: {
               private: PRIVATE_VARIABLES,
               public: ACCESSABLE_VARIABLES,
               types: variableTypes,
               definitions: variableDefinition
           },
           placeholders: PLACEHOLDER,
           optionalPlaceholders: OPTIONAL_PLACEHOLDERS,
           uniqueness: UNIQUENESS_COEFFICIENT,
           ext: extension
       };

});
