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

       var getCodeMap = function(params) {
           // The caller needs to make sure that the 
           // variables inserted here are the variables
           // after the collision stuff
           //
           // The code generator will need to get the 
           // private variables, resolve any name 
           // collisions, then pass the new values as 
           // parameters to this function

           var privateVariables = params.variables.private;
           var placeholder = params.placeholders;

           var boilerplate = '"use strict";\n\n'+
               placeholder.FUNCTION_DEFS + '\n\n' + placeholder.CODE;

           //Functions potentially used in constraint
           var functions = {};

           //Get Dimension function
           functions[privateVariables.GET_DIMENSION] =     
               'var ' + privateVariables.GET_DIMENSION + ' = function(a){\n' +
               'var dim = 0;\nwhile (a instanceof Array){\na=a[0];\ndim++;\n}\n'+
               'return dim;\n};\n';

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
               'addToCollection': 'if(' + privateVariables.GET_DIMENSION + '({{ collection }})'+
                   ' === ' + privateVariables.GET_DIMENSION +'({{ first }})){\n{{ collection }} = '+
                   '{{ collection }}.concat({{ first }});\n}else{\n{{ collection }}.push({{ first }});'+
                   '\n}\n{{ next }}',

               'contains': '{{ collection }}.indexOf({{ first }}) !== -1',

               'not': "!({{ first }})",
               'getLength': "Object.keys({{ collection }}).length",

               //A few basic utilities
               'return': "return {{ first }};\n{{ next }}",
               'set': '{{ first }} = {{ second }};\n{{ next }}',

               'forEach': 'for(var ' + placeholder.ITERATOR + ' in {{ collection }}) {\n' +
                   '{{ iter }} = {{ collection }}['+placeholder.ITERATOR+'];\n{{ next }}\n}',

               'repeat': 'var ' + placeholder.ITERATOR + ' = {{ count }};\nwhile(--'+
                   placeholder.ITERATOR+'){\n{{ next }}\n}',

               'while': 'while({{ cond }}){\n{{ next }}\n}'
           };

           return {
               functions: functions,
               boilerplate: boilerplate,
               codeMap: codeMap 
           };
       };

    var reservedWords = [ 'break', 'case', 'class', 'catch', 'const', 
        'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export',
        'extends', 'finally', 'for', 'function', 'if', 'import', 'in', 
        'instanceof', 'let', 'new', 'return', 'super', 'switch', 'this',
        'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
        'enum', 'await', 'implements', 'package', 'protected', 'static', 
        'interface', 'private', 'public', 'null', 'undefined', 'true', 'false'],

       publicVariables = ['currentNode'],
       privateVariables = {GET_DIMENSION: 'getDimension'},

       placeholder = { ITERATOR: '{{ __iterator__ }}',
                       FUNCTION_DEFS: '{{ __func_defs__ }}',
                       CODE: '{{ __code__ }}'},
       optionalPlaceholderS = ['next', 'true_next', 'false_next'],
       uniqueness = 10000000,

       variableTypes = [ 'map', 'string', 'number', 'boolean', 
                         'node', 'collection', 'nodeSet'],
       variableDefinition = { 'map': 'var {{ name }} = {};',
                              'collection': 'var {{ name }} = [];',
                              // __default__ refers to any non map or collection
                              '__default__': 'var {{ name }} = null;' },

       extension = 'js';


       return {
           getCodeMap: getCodeMap,

           reservedWords: reservedWords,
           variables: {
               private: privateVariables,  // With respect to the boilerplate code
               public: publicVariables,  // With respect to the boilerplate code
               types: variableTypes,
               definitions: variableDefinition
           },
           placeholders: placeholder,
           optionalPlaceholders: optionalPlaceholderS,
           uniqueness: uniqueness,
           ext: extension,
           language: 'Javascript'
       };

});

