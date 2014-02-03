define([],
function(){

    return {
        'msgTypes':{
            'request': 'request',
            'response': 'response'
        },
        'workerStates':{
            'free': 'free',
            'working': 'working',
            'waiting': 'waiting'
        },
        'workerCommands':{
            'initialize': 'initialize',
            'getResult': 'getResult'
        }
    }
});
