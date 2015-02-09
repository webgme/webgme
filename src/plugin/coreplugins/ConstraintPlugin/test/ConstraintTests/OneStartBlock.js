/*globals define*/
/*
 * @author brollb / https://github/brollb
 */

define([], function (){

    "use strict";

    var OneStartBlock = function (env, tree){
        var nodes = Object.keys(env.nodes[tree]),
        violation = { hasViolation: false, nodes: []},
        i;

        for (i = nodes.length-1; i>=0; i--){
            if (env._isTypeOf(env.nodes[tree][nodes[i]], 'start')){
                violation.nodes.push(env.nodes[tree][nodes[i]]);
            }
        } 

        if (violation.nodes.length > 1){
            violation.hasViolation = true;
        }
        return violation;
    };

    return { name: "OneStartBlock",
             test: OneStartBlock };

});
