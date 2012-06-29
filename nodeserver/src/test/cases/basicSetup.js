"use strict";
/*
 * Utility helper functions for the client and server side
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define([], function () {
    return {
        id : "basicSetup",
        projectName : "empty",
        branchName : "empty",
        storage : "file",
        keepChanges : false,
        referenceFile : "./cases/basicSetup.ref",
        startStorage : "./cases/basicSetup.sto",
        clients : [
            "client-one",
            "client-two"
        ],
        steps : [
            {
                client : "client-one",
                waitForResponse : true,
                toServer : [
                    {type:"createChild",parentId:null,baseId:null,newguid:"root"},
                    {type:"createChild",parentId:"root",baseId:null,newguid:"object"},
                    {type:"createChild",parentId:"root",baseId:"object",newguid:"connection"},
                    {type:"modify",id:"connection",registry:{isConnection:true}}
                ]
            },
            {
                client : "client-two",
                waitForResponse : false,
                toServer : [
                    {type:"territory",id:"my territory id",patterns:{"root":{"children":-1}}}
                ]
            },
            {
                client : "client-one",
                waitForResponse : true,
                toTester : [
                    {type:"wait",time:5000}
                ]
            }
        ]
    }
});
