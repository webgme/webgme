/*globals define*/
/*
 * @author brollb / https://github/brollb
 */

define([], function (){

    "use strict";

    var UniqueName = function (env, tree){
        var nodes = Object.keys(env.nodes[tree]),
            violation = { hasViolation: false, nodes: [] },
            names = {},
            name,
            i;

        for (i = nodes.length-1; i>=0; i--){
            name = env.core.getAttribute(env.nodes[tree][nodes[i]], 'name');
            if (names[name]){
                violation.hasViolation = true;
                violation.message = name + ' is in conflict';

                names[name].push(nodes[i]);
                violation.nodes = names[name];
            } else {
                names[name] = [nodes[i]];
            }
        } 
        return violation;
    };

    return { name: "Unique Name",
             test: UniqueName };

});
