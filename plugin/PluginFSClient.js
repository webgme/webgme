define(["jszip", 'plugin/PluginFSBase', 'lib/filesaver/FileSaver'], function(ZIP, PluginFSBase, FileSaver){

    function PluginFSClient(parameters) {
        PluginFSBase.call(this, parameters);
    }

    PluginFSClient.extends(PluginFSBase);

    PluginFSClient.prototype.constructor = PluginFSClient;

    PluginFSClient.prototype.createArtifact = function(name) {
        if(this._artifactName === null){
            this._artifactName = name;
            this._artifactZip = new ZIP();
            return true;
        } else {
            return false;
        }
    };

    PluginFSClient.prototype.saveArtifact = function() {
        // NOTE: DEFLATE compression does not work for me.
        var data = this._artifactZip.generate({base64:false, type:"blob"});
        try {
            window.saveAs(data, this._artifactName + ".zip");

            this._artifactName = null;
            this._artifactZip = null;
            return true;
        } catch (e) {
            this._artifactName = null;
            this._artifactZip = null;
            return false;
        }
    };

    PluginFSClient.prototype.addFile = function(path, data){
        if(this._artifactName !== null){
            this._artifactZip.file(path, data);
            return true;
        } else {
            return false;
        }
    };

    return PluginFSClient;
});
