define([],
function(){

    return {
        'msgTypes':{
            'request': 'request',
            'result': 'result',
            'info': 'info',
            'initialize': 'initialize',
            'initialized': 'initialized'
        },
        'workerStates':{
            'initializing': 'initializing',
            'free': 'free',
            'working': 'working',
            'waiting': 'waiting'
        },
        'workerCommands':{
            'initialize': 'initialize',
            'getResult': 'getResult',
            'dumpMoreNodes': 'dumpMoreNodes',
            'generateJsonURL': 'generateJsonURL'
        }
    }
});
