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
define(['../CodeGenerator/lang/javascript'], function (jsCodeMap){

    'use strict';

    var publicVars = ['currentNode'];
    var privateVars = [ 'core', 'callback', 'err', 'violationInfo', 
            '_nodeCache', 'getDimension', 'getNode', 'getDescendents', 
            'getNodes', 'filterByNodeType', 'isTypeOf', 'i', 'arg', 'fn' ];
    var placeholders = { 
            ITERATOR: '__iterator__',//Placeholders to be unique-ized
            FUNCTION: 'fn',
            FUNCTION_DEFS: '__func_defs__',
            CODE: '__code__',
            ARG: function(i){ return 'arg'+ i; }//Create unique argument names
        };


    var async = {START: '_async_start_', END: '_async_end_'};

        //Defined in Constraint Language META
    var variableTypes = [ 'map', 'string', 'number', 'boolean', 
                          'node', 'collection', 'nodeSet'];

    var boilerplate = 'function(core, currentNode, callback){\n\n' + 
        '"use strict";\n\nvar violationInfo = { hasViolation: false };\n' +
        'var err = null;\nvar _nodeCache = {};\n{{' +
        placeholders.FUNCTION_DEFS + '}}\n\n{{' + placeholders.CODE + '}}\n\n}';

    //Functions potentially used in constraint
    var functions = {
            getDimension: 
                'var getDimension = function(a){\n' +
                'var dim = 0;\nwhile (a instanceof Array){\na=a[0];\ndim++;\n}\n'+
                'return dim;\n};\n',

            getNode: 
                'var getNode = function(nodeId, cb){\n' +
                'var node;\nif (nodeId === currentNode){\n'+
                'cb(currentNode);\n} else if (_nodeCache[nodeId]){\n' +
                'cb(_nodeCache[nodeId]);\n' +
                '} else {\ncore.loadByPath(currentNode, nodeId, function(err, node){\n' +
                '_nodeCache[nodeId] = node;\n\ncb(node);\n});\n}\n};\n',

            getDescendents:
                'var getDescendents = function' +
                '(n, _callback){\nvar result = [];\nvar count = 1;\nvar id;\nvar load'+
                ' = function(node, cb){\ncore.loadChildren(node, function(e,'+
                ' children){\nif (!e){\nid = core.getPath(node);\nresult.push(id);\n'+
                'count += children.length;\n_nodeCache[id] = node;\n'+
                'for (var i = children.length-1; i >= 0; i--){\n'+
                //'setTimeout(load, 0, children[i], cb);'+
                'load(children[i], cb);'+
                '\n}\nif (count === result.length){\ncb(result);'+
                '\n}\n} else {\nerr = e;\n}\n});\n};\n'+
                'load(n, _callback);\n\n};\n',

            isTypeOf:
                'var isTypeOf = function(node,type){\n' + 
                'if(node === undefined || node === null || type === undefined || ' + 
                'type === null){\nreturn false;\n}\n\n' +
                'while(node){\nif(core.getAttribute(node, "name") === type){\n'+
                'return true;\n}\nnode = core.getBase(node);\n}\nreturn false;\n};\n',

            getNodes: 
                'var getNodes = function(nodeIds, cb){\nvar '+
                'result = [],\ndone = function (node){\nresult.push(node);if (result.length'+
                ' === nodeIds.length){\ncb(result);\n}\n};\nfor (var i = nodeIds.length-1;'+
                ' i>=0; i--){\ngetNode(nodeIds[i], done);\n}\n};\n',

            filterByNodeType:
                'var filterByNodeType = function(nodeSet, type, cb){\n'+
                'var result = [],\nid;\ngetNodes(nodeSet, '+
                'function(nodes){\nfor (var i = nodes.length-1; i>=0; i--){\nif ('+
                'isTypeOf(nodes[i], type)){id = core.getPath(nodes[i]);\n'+
                'result.push(id);\n}\n}\ncb(result);\n});\n};'
    };


   var codeMap = {

       markViolation: 'violationInfo = { hasViolation: true,' +
           ' message: {{ message }}, nodes: {{ node }} };\n\n{{ next }}',

       //node methods (async)
       isTypeOf: 'getNode({{ node }}, function({{' + placeholders.ARG(0) + 
                   '}}){\n{{' + async.START + '}}isTypeOf({{' + 
                   placeholders.ARG(0) + '}}, {{ first }}){{' + async.END + '}}\n});',

       getChildren: 'getNode({{ node }}, function({{' + placeholders.ARG(0) + 
                      '}}){\n{{' + async.START + '}}core.getChildrenPaths({{' + placeholders.ARG(0) + 
                      '}}){{' + async.END + '}}\n});',

       getDescendents: 'getNode({{ node }}, function({{' + placeholders.ARG(0) + 
                         '}}){\ngetDescendents({{' + placeholders.ARG(0) + 
                         '}}, function({{' + placeholders.ARG(1) + '}}){\n{{' + 
                         async.START + '}}{{' +placeholders.ARG(1) + 
                         '}}{{'+async.END + '}}});\n\n});',

       getParent: 'getNode({{ node }}, function({{' + placeholders.ARG(0) + 
                    '}}){\n{{' + async.START + '}}core.getParentPath({{' + placeholders.ARG(0) + 
                    '}}){{' + async.END + '}}\n});',

        getPointer: 'getNode({{ node }}, function({{' + placeholders.ARG(0) + 
                    '}}){\n{{' + async.START + '}}core.getPointerPath({{' + placeholders.ARG(0) + 
                    '}}){{' + async.END + '}}\n});',

        getAttribute: 'getNode({{ node }}, function({{' + placeholders.ARG(0) + 
                    '}}){\n{{' + async.START + '}}core.getAttribute({{' + placeholders.ARG(0) + 
                    '}}, {{ first }}){{' + async.END + '}}\n});',

        filterByNodeType: 'filterByNodeType({{ nodeSet }}, {{ first }}, function({{' + 
                    placeholders.ARG(0) + '}}){\n{{' + async.START +'}}{{'+ placeholders.ARG(0) +
                    '}}{{'+async.END + '}}\n});',

        forEach: 'var {{' + placeholders.FUNCTION + '}} = function(' + 
                   '){\nvar {{' + placeholders.ARG(1) + '}} = Object.keys('+
                   '{{ collection }});\nvar {{' + placeholders.ARG(2) + '}} = {{' + placeholders.ARG(1) + 
                   '}}[0];\nwhile({{'+placeholders.ARG(0)+'}}[{{'+placeholders.ARG(2)+'}}] && {{'+
                   placeholders.ARG(1) + '}}.length){\n{{' + placeholders.ARG(2) + '}} = {{' + placeholders.ARG(1)+
                   '}}.pop();\n}\nif (!{{' + placeholders.ARG(0) + '}}[{{' + placeholders.ARG(2) + 
                   '}}]){\n{{' + placeholders.ARG(0) + '}}[{{' + placeholders.ARG(2) + '}}] = true;\n{{ iter }} = {{ collection }}[{{' + 
                   placeholders.ARG(2) + '}}];\n{{ true_next }}\n} else '+
                   '{\n {{ next }}\n} };\nvar {{' + placeholders.ARG(0) + '}} = {};\n{{' + placeholders.FUNCTION +
                   '}}();\n',

        repeat: 'var {{' + placeholders.FUNCTION + '}} = function({{' + 
                  placeholders.ITERATOR + '}}){\nif ({{' + placeholders.ITERATOR + 
                  '}} < {{ count }}){\n{{ true_next }}\n} else {\n {{ next }}\n} };\n'+
                  'var {{' + placeholders.ITERATOR + '}} = 0;\n{{' + placeholders.FUNCTION +
                  '}}({{' + placeholders.ITERATOR + '}});\n',

        addToCollection: 'if(getDimension({{ collection }})'+
                ' === getDimension({{ first }})){\n{{ collection }} = '+
                '{{ collection }}.concat({{ first }});\n}else{\n{{ collection }}.push({{ first }});'+
                '\n}\n{{ next }}',

        while: 'var {{' + placeholders.FUNCTION + '}} = function(){\n' +
                 'if ({{ cond }}){\n{{ true_next }}\n} else {\n {{ next }}\n} };\n{{'+
                 placeholders.FUNCTION + '}}();\n'
    };

       //additional end code by node type
    var endCode = {
        forEach: 'setTimeout({{' + placeholders.FUNCTION + '}}, 0);\n',
        repeat: 'setTimeout({{' + placeholders.FUNCTION + '}}, 0, ++{{' + placeholders.ITERATOR + '}});\n',
        while: 'setTimeout({{' + placeholders.FUNCTION + '}}, 0);\n',
        constraint: '\ncallback( err, violationInfo);\n'
    };



    var langSpec = {
        boilerplate: boilerplate,

        // Optional
        variables: {
            private: privateVars,
            public: publicVars,
            types: variableTypes,
            definitions: jsCodeMap.variables.definitions
        },
        async: async,
        placeholders: _.extend(jsCodeMap.placeholders, placeholders),
        endCode: endCode,
        functions: functions,
        codeMap: _.extend(jsCodeMap.codeMap, codeMap)
    };

    return _.extend(jsCodeMap, langSpec);

});
