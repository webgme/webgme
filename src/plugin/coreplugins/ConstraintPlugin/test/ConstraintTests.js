/*globals define*/
/*
* GENERATED TEST FILES *      
* DO NOT EDIT MANUALLY *    
* TO GENERATE PLEASE RUN node generate_tests.js    
*/  

define([ "./ConstraintTests/OneStartBlock",
"./ConstraintTests/UniqueName" ], function ( OneStartBlock,
UniqueName ) {    
	'use strict';           
                            
	var tests = {};
		tests[OneStartBlock.name] = OneStartBlock.test;
		tests[UniqueName.name] = UniqueName.test;

    return tests;
});