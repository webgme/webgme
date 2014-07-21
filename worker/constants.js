define([],
function(){
    'use strict';
    return {
        'msgTypes':{
            'request'     : 'request',
            'result'      : 'result',
            'info'        : 'info',
            'initialize'  : 'initialize',
            'initialized' : 'initialized',
            'query'       : 'query'
        },
        'workerStates':{
            'initializing' : 'initializing',
            'free'         : 'free',
            'working'      : 'working',
            'waiting'      : 'waiting'
        },
        'workerCommands':{
            'initialize'      : 'initialize',
            'getResult'       : 'getResult',
            'dumpMoreNodes'   : 'dumpMoreNodes',
            'generateJsonURL' : 'generateJsonURL',
            'executePlugin'   : 'executePlugin',
            'exportLibrary'   : 'exportLibrary',
            'connectedWorker' : 'connectedWorker' //this command starts the addOn
        }
    };
});
