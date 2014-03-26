define(["jszip",'plugin/PluginFSBase','fs'],function(ZIP,PluginFSBase,FS){

    PluginFSServer.extends(PluginFSBase);

    function PluginFSServer(parameters){
        PluginFSBase.apply(this,parameters);
    }

    PluginFSServer.prototype.createArtifact = function(name){
        if(this._artifactName === null){
            this._artifactName = name;
            this._artifactZip = ZIP();
            return true;
        } else {
            return false;
        }
    };

    PluginFSServer.prototype.saveArtifact = function(){
        var data = this._artifactZip.generate({base64:false,compression:'DEFLATE'});
        try {
            FS.writeFileSync(this._parameters.outputpath + this._artifactName + ".zip", data, 'binary');
            this._artifactName = null;
            this._artifactZip = null;
            return true;
        } catch (e) {
            this._artifactName = null;
            this._artifactZip = null;
            return false;
        }
    };

    PluginFSServer.prototype.addFile = function(path,data){
        if(this._artifactName !== null){
            this._artifactZip.file(path,data);
            return true;
        } else {
            return false;
        }
    };

    return PluginFSServer;
});
