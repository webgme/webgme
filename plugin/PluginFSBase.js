define([],function(){

    if(Function.prototype.extends === undefined){
        Function.prototype.extends = function(parent) {
            this.prototype = Object.create(parent.prototype);
        };
    }



    function PluginFSBase(parameters){
        this._parameters = parameters;
        this._artifactName = null;
    }

    PluginFSBase.prototype.createArtifact = function(name){
        throw new Error('not implemented');
    };
    PluginFSBase.prototype.saveArtifact = function(){
        throw new Error('not implemented');
    };
    PluginFSBase.prototype.addFile = function(path,data){
        throw new Error('not implemented');
    };

    return PluginFSBase;
});
