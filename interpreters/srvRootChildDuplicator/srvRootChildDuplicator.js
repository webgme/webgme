define([], function () {
    "use strict";

    var RootChildduplicator = function () {};

    RootChildduplicator.prototype.run = function (config, callback) {
        var result = {commitHash:config.commitHash};
        if(config.rootNode && config.core){
            config.core.loadChildren(config.rootNode,function(err,children){
                if(!err){
                    for(var i=0;i<children.length;i++){
                        var newChild = config.core.copyNode(children[i],config.rootNode);
                        config.core.setAttribute(newChild,'name',config.core.getAttribute(newChild,'name')+"_duplicate");
                    }
                    config.core.persist(config.rootNode, function(err) {});
                    var newRootHash = config.core.getHash(config.rootNode);
                    result.commitHash = config.project.makeCommit([result.commitHash], newRootHash, 'Interpreter \'RootChildDuplicator\' updated the model.', function(err) {});
                    result.success = true;
                    config.FS.createArtifact("proba_srv_rcd");
                    config.FS.addFile("konyvtar/egy.txt","ketto");
                    config.FS.addFile("ketto.txt","harom");
                    config.FS.addFile("konyv/harom.txt","negy");
                    result.artifactTest = config.FS.saveArtifact();
                    callback(result);
                } else {
                    result.success = false;
                    callback(result);
                }
            });
        } else {
            result.success = false;
            callback(result);
        }
    };

    return RootChildduplicator;
});
