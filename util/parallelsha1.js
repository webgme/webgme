define([],function(){

    function ParalellSHA1Calculator(_options){
        _options = _options || {};
        _options.maxworker = _options.maxworker || 10;
        if(_options.maxworker <= 0){
            _options.maxworker = 1;
        }

        var _hashes = {},
            _ongoingCalculations = 0,
            _callback = null,
            _error = null,
            _workers = [],
            _worker = 0,
            i,start;

        function collectHashes(callback){
            var hashes = _hashes,
                error = _error;
            //it also cleans the current results
            _hashes = {};
            _error = null;
            _callback = null;
            console.log('waiting for result took ',new Date().getTime()-start);
            callback(error,hashes);
        }

        function getHashes(callback){
            start = new Date().getTime();
            if(_ongoingCalculations === 0){
                collectHashes(callback);
            } else {
                //we will call the callback after the last result arrives
                _callback = callback;
            }
        }

        function nextworker(){
            if(++_worker === _options.maxworker){
                _worker = 0;
            }
        }

        function calculateHash(id,dataArray){
            ++_ongoingCalculations;
            _workers[_worker].postMessage({id:id,datas:dataArray});
            nextworker(); //simple load balancing
        }

        function onMessage(event){
            if(event.data.id){
                _hashes[event.data.id] = event.data.hash;
            }
            _error = _error || event.data.error;

            if(--_ongoingCalculations === 0 && _callback !== null){
                collectHashes(_callback);
            }
        }


        //initializing workers
        for(i=0;i<_options.maxworker;i++){
            _worker = new Worker('util/shaworker.js');
            _worker.onmessage = onMessage;
            _workers.push(_worker);
        }
        _worker = 0;

        return {
            calculateHash : calculateHash,
            getHashes : getHashes
        };
    }

    return ParalellSHA1Calculator;
});
