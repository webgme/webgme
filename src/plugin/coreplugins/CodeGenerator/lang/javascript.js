/*globals RegExp,_,define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved
 *
 * @author brollb / https://github/brollb
 * 
 * Javascript language definition for code generation
 */

define([], function (){

    /*
     * First, the variables, reserved words, etc, are returned to the code generator. 
     * Then the code generator hoists and declares all the variables in the user-provided
     * source code blocks. 
     *
     * Finally, the code generator will call 'getCodeMap' to get the rest of the code mapping. 
     *
     * As some of the private variables and placeholders may have had to be renamed, 
     * the CodeGenerator object will pass the (potentially) new values for variables 
     * used in the boilerplate.
     */

    'use strict';

    var reservedWords = [ 'break', 'case', 'class', 'catch', 'const', 
        'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export',
        'extends', 'finally', 'for', 'function', 'if', 'import', 'in', 
        'instanceof', 'let', 'new', 'return', 'super', 'switch', 'this',
        'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
        'enum', 'await', 'implements', 'package', 'protected', 'static', 
        'interface', 'private', 'public', 'null', 'undefined', 'true', 'false'],

        publicVariables = ['currentNode'],
        privateVariables = ['getDimension'],

        placeholders = { ITERATOR: '__iterator__',
                         FUNCTION_DEFS: '__func_defs__',
                         CODE: '__code__'},

        // Placeholders that can be replaced with '' if empty in model
        optionalPlaceholders = ['next', 'true_next', 'false_next'],

        variableTypes = [ 'map', 'string', 'number', 'boolean', 
                'node', 'collection', 'nodeSet'],
        variableDefinition = { 'map': 'var {{ name }} = {};',
                    'collection': 'var {{ name }} = [];',
                    // __default__ refers to any non map or collection
                    '__default__': 'var {{ name }} = null;' },

        extension = 'js';

    var boilerplate = '"use strict";\n\n'+
        '{{'+placeholders.FUNCTION_DEFS+'}}\n\n{{' + placeholders.CODE + '}}';

    //Functions potentially used in constraint
    var functions = {

        getDimension: 'var getDimension = function(a){\n' +
                'var dim = 0;\nwhile (a instanceof Array)'+
                '{\na=a[0];\ndim++;\n}\n'+
                'return dim;\n};\n' 
    };

    var codeMap = {
        //Binary Predicates
        'add': "{{ first }} + {{ second }}", 
        'subtract': "{{ first }} - {{ second }}", 
        'multiply': "({{ first }}) * ({{ second }})", 
        'divide': "({{ first }})/({{ second }})", 

        'lessThan': "({{ first }}) < ({{ second }})", 
        'greaterThan': "({{ first }}) > ({{ second }})", 
        'equal': "({{ first }}) === ({{ second }})", 

        'and': "({{ first }}) && ({{ second }})", 
        'or': "({{ first }}) || ({{ second }})", 
        'xor': "(({{ first }}) || ({{ second }})) && !(({{ first }}) && ({{ second }}))", 

        'concat': '(\"\" + {{ first }} + {{ second }})', 

        //Control flow
        'if': "if ({{ cond }}){\n{{ true_next }}\n}\n{{ next }}",
        'ifElse': "if ({{ cond }}){\n{{ true_next }}\n} else {\n{{ false_next }}\n}\n{{ next }}",

        //Variables
        'predicate': "{{ name }}",

        //Map mappings
        'addToMap': "{{ map }}[{{ first }}] = {{ second }};\n{{ next }}",
        'removeFromMap': "delete {{ map }}[{{ string }}];\n{{ next }}",
        'getKeysFromMap': "Object.keys({{ map }})",

        'getItemFromCollection': "{{ collection }}[{{ first }}]",
        'getItemFromMap': "{{ map }}[{{ first }}]",

        //Collection mappings
        'addToCollection': 'if(getDimension({{ collection }})'+
            ' === getDimension({{ first }})){\n{{ collection }} = '+
            '{{ collection }}.concat({{ first }});\n}else{\n{{ collection }}.push({{ first }});'+
            '\n}\n{{ next }}',

        'contains': '{{ collection }}.indexOf({{ first }}) !== -1',

        'not': "!({{ first }})",
        'getLength': "Object.keys({{ collection }}).length",

        //A few basic utilities
        'return': "return {{ first }};\n{{ next }}",
        'set': '{{ first }} = {{ second }};\n{{ next }}',

        'forEach': 'for(var ' + placeholders.ITERATOR + ' in {{ collection }}) {\n' +
            '{{ iter }} = {{ collection }}['+placeholders.ITERATOR+'];\n{{ next }}\n}',

        'repeat': 'var ' + placeholders.ITERATOR + ' = {{ count }};\nwhile(--'+
            placeholders.ITERATOR+'){\n{{ next }}\n}',

        'while': 'while({{ cond }}){\n{{ next }}\n}'
    };

    return {
        codeMap: codeMap,  // Mapping of blocks to template snippets
        functions: functions,  // convenience functions potentially used in some of the templates
        boilerplate: boilerplate,

        reservedWords: reservedWords,  // keywords of the given programming language
        variables: {
            private: privateVariables,  // With respect to the boilerplate code
            public: publicVariables,  // With respect to the boilerplate code
            types: variableTypes,  // variable types support (referring to block types)
            definitions: variableDefinition  // template for initializing each block
        },
        undefined: 'null',  // The value inserted for empty required pointers/attributes in the model
        optionalPlaceholders: optionalPlaceholders,  // template keywords that can be ignored if no value in model
        ext: extension,

        language: 'Javascript',
        placeholders: placeholders  // allows overriding of default placeholders for code, functions, etc,
                                    // used in the boilerplate
    };

});

