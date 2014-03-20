define(['core/core'], function (Core) {
    "use strict";

    var ClientInterpreterManager = function (client) {
        this._client = client;
    };

    var getContext = function(client,callback) {
        var context = { storage: client.getProjectObject(), project:client.getProjectObject()};
        context.core = new Core(context.storage,{corerel:2});
        context.commitHash = client.getActualCommit();
        context.selected = WebGMEGlobal.State.getActiveSelection() || [];
        context.selected = context.selected[0] || null; //TODO allow multiple objects in the selection and pass active object as well
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

    var getInterpreter = function(name,callback){
        require(['/interpreters/'+name+'/'+name],
            function(InterpreterClass){
                callback(null,new InterpreterClass());
            },
            function(err){
                callback(err,null);
            }
        );
    };

    ClientInterpreterManager.prototype.run = function (name,callback) {
        //TODO now the foundtation of distinguishing is the preceeding srv in the plugin name
        var self = this;
        if(name.indexOf('srv') === 0){
            //we call the clients - runServerPlugin function
            var context = {};
            context.commitHash = self._client.getActualCommit();
            context.projectName = self._client.getActiveProject();
            self._client.runServerPlugin(name,context,function(result){
                //console.log(result);
                if (callback) {
                    callback(result);
                }
            });
        } else {
            getInterpreter(name,function(err,interpreter){
                if(!err && interpreter !== null){
                    getContext(self._client,function(err,context){
                        interpreter.run(context,callback);
                    });
                } else {
                    //TODO generate proper result
                    callback({error:err});
                }
            });
        }
    };

    //TODO somehow it would feel more right if we do run in async mode, but if not then we should provide getState and getResult synchronous functions as well

    return ClientInterpreterManager;
});
