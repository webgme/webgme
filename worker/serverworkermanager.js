define(['util/assert','child_process','worker/constants','util/guid'],
function(ASSERT,Child,CONSTANTS){
    function ServerWorkerManager(_database,_parameters){
        var _workers = [],
           _waitingRequests = [];

        _parameters = _parameters || {};
        _parameters.maxrowkers = _parameters.maxworkers || 10;

        //helping functions

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

            _waitingRequests.push({cb:callback,request:parameters});
            checkRequests(); //no-one became free, but it is possible that we do not use all of our resources at this point so its worth to try
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

        //initialization part
        for(var i=0;i<_parameters.maxworkers;i++){
            var worker = Child.fork(__dirname+'/../worker/simpleworker.js');
            worker._s_w_m_id = _workers.push({worker:worker,state:CONSTANTS.workerStates.free,resid:null}) - 1;

            worker.on('message', function(msg) {
                msg.type = msg.type || CONSTANTS.msgTypes.request;

                switch(msg.type){
                    case CONSTANTS.msgTypes.request:
                        var cFunction = _workers[worker._s_w_m_id].cb;
                        _workers[worker._s_w_m_id].cb = null;
                        _workers[worker._s_w_m_id].state = CONSTANTS.workerStates.waiting;
                        _workers[worker._s_w_m_id].resid = msg.resid || null;
                        if(_workers[worker._s_w_m_id].resid === null){
                            //some error occured during request generation
                            _workers[worker._s_w_m_id].state = CONSTANTS.workerStates.free;
                            checkRequests(); //someone became free...
                        }
                        cFunction(msg.error,msg.result);
                        break;
                    case CONSTANTS.msgTypes.result:
                        var cFunction = _workers[worker._s_w_m_id].cb;
                        _workers[worker._s_w_m_id].cb = null;
                        _workers[worker._s_w_m_id].state = CONSTANTS.workerStates.free;
                        _workers[worker._s_w_m_id].resid = null;
                        checkRequests();
                        cFunction(msg.error,msg.result);
                        break;
                }
            });
        }
        return {
            request : request,
            result  : result
        };
   }
   return ServerWorkerManager;
});
