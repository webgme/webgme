define([],function(){

    var PluginFSBase = function(parameters){
        this._parameters = parameters;
        this._artifactName = null;
    };

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
