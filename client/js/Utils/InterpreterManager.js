define(['core/core'], function (Core) {
    "use strict";

    var ClientInterpreterManager = function (client) {
        this._client = client;
    };

    var getContext = function(client,callback) {
        var context = { storage: client.getProjectObject()};
        context.core = new Core(context.storage,{corerel:2});
        context.commitHash = client.getActualCommit();
        context.selected = ""; //context.selected = "/-1/-2/-1/-1";
        context.storage.loadObject(context.commitHash, function(err, commitObj) {
            context.core.loadRoot(commitObj.root, function(err, rootNode) {
                if(!err){
                    context.rootNode = rootNode;
                    if(typeof context.selected === 'string'){
                        context.core.loadByPath(context.rootNode, context.selected, function (err, selectedNode) {
                            if(!err){
                                context.selectedNode = selectedNode;
                                callback(null,context);
                            } else {
                                callback("unable to load selected object",context);
                            }
                        });
                    } else {
                        context.selectedNode = null;
                        callback(null,context);
                    }
                } else {
                    callback("unable to load root",context);
                }
            });
        });
    };

    var getInterpreter = function(name){
        //return new WEBGMEINTERPRETER(); //TODO something more 'official'
        return {
            run: function(context){
                console.log(context);
            }
        }
    };

    ClientInterpreterManager.prototype.run = function (name) {

        var interpreter = getInterpreter(name);
        getContext(this._client,function(err,context){
            interpreter.run(context);
        });
    };

    //TODO somehow it would feel more right if we do run in async mode, but if not then we should provide getState and getResult synchronous functions as well

    return ClientInterpreterManager;
});
