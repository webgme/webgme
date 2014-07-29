define(['util/assert','child_process','worker/constants','util/guid'],
function(ASSERT,Child,CONSTANTS){
    function ServerWorkerManager(_parameters){
        var _workers = [],
           _waitingRequests = [];

        _parameters = _parameters || {};
        _parameters.maxworkers = _parameters.maxworkers || 1;

        //helping functions
        //TODO always check if this works properly
        function getBaseDir(){
            return requirejs.s.contexts._.config.baseUrl;
        }

        function checkRequests(){
            //when this function called then probably some worker became free so we try to assign some job to it
            if(_waitingRequests.length > 0){
                var index = -1;
                for(var i=0;i<_workers.length;i++){
                    if(_workers[i].state === CONSTANTS.workerStates.free){
                        index = i;
                        break;
                    }
                }

                if(index !== -1){
                    var request = _waitingRequests.shift();
                    _workers[index].state = CONSTANTS.workerStates.working;
                    _workers[index].cb = request.cb;
                    _workers[index].resid = null;
                    _workers[index].worker.send(request.request);
                }
            }
        }

        function request(parameters,callback){
            ASSERT(typeof parameters === 'object' && parameters !== null);
            ASSERT(typeof callback === 'function');

            //put the userId into among the parameters based on the sessionId
            _parameters.sessionToUser(parameters.webGMESessionId,function(err,userId){
                if(err){
                    userId = undefined;
                }
                parameters.user = userId;
                _waitingRequests.push({cb:callback,request:parameters});
                checkRequests(); //no-one became free, but it is possible that we do not use all of our resources at this point so its worth to try
            });
        }
        function result(reqId,callback){
            for(var i=0;i<_workers.length;i++){
                if(_workers[i].resid === reqId){
                    ASSERT(_workers[i].state === CONSTANTS.workerStates.waiting);
                    _workers[i].state = CONSTANTS.workerStates.working;
                    _workers[i].cb = callback;
                    _workers[i].resid = null;
                    _workers[i].worker.send(null);
                    return;
                }
            }
            callback('no result under the given id found');
        }
        function indexByPid(pid){
            for(var i=0;i<_workers.length;i++){
                if(pid === _workers[i].pid){
                    return i;
                }
            }
            return -1;
        }

        function messageHandling(msg){
            var index = indexByPid(msg.pid);
            if(index !== -1){
                var worker = _workers[index];
                switch(msg.type){
                    case CONSTANTS.msgTypes.request:
                        var cFunction = worker.cb;
                        worker.cb = null;
                        worker.state = CONSTANTS.workerStates.waiting;
                        worker.resid = msg.resid || null;
                        if(worker.resid === null){
                            //some error occured during request generation
                            worker.state = CONSTANTS.workerStates.free;
                            checkRequests(); //someone became free...
                        }
                        cFunction(msg.error,msg.resid);
                        break;
                    case CONSTANTS.msgTypes.result:
                        var cFunction = worker.cb;
                        worker.cb = null;
                        worker.state = CONSTANTS.workerStates.free;
                        worker.resid = null;
                        checkRequests();
                        cFunction(msg.error,msg.result);
                        break;
                    case CONSTANTS.msgTypes.initialize:
                        //this arrives when the worker seems ready for initialization
                        worker.worker.send({
                            command:CONSTANTS.workerCommands.initialize,
                            ip:_parameters.mongoip,
                            port:_parameters.mongoport,
                            db:_parameters.mongodb,
                            pluginBasePaths:_parameters.pluginBasePaths,
                            interpreteroutputdirectory:_parameters.intoutdir,
                            serverPort:_parameters.serverPort,
                            paths: webGMEGlobal.getConfig().paths,
                            auth: _parameters.auth
                        });
                        break;
                    case CONSTANTS.msgTypes.initialized:
                        worker.state = CONSTANTS.workerStates.free;
                        console.log('worker '+worker.pid+' is ready for tasks');
                        break;
                    case CONSTANTS.msgTypes.info:
                        console.log(msg.info);
                }
            }
        }

        //initialization part
        for(var i=0;i<_parameters.maxworkers;i++){
            var debug = false;
            for(var j = 0;j<process.execArgv.length;j++){
                if(process.execArgv[j].indexOf('--debug-brk') !== -1){
                    debug = true;
                    break;
                }
            }
            if(debug) {
                //Set an unused port number.
                process.execArgv.push('--debug-brk=' + (32000+i));
            }
            var worker = Child.fork(getBaseDir()+'/server/worker/simpleworker.js');
            _workers.push({pid:worker.pid,worker:worker,state:CONSTANTS.workerStates.initializing,resid:null}) - 1;

            worker.on('message', messageHandling);
        }
        return {
            request : request,
            result  : result
        };
   }
   return ServerWorkerManager;
});
