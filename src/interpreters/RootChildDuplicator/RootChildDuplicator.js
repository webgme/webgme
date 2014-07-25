define(['plugin/PluginBase', 'plugin/PluginConfig'], function (PluginBase, PluginConfig) {
    "use strict";

    var RootChildduplicator = function () {};

    RootChildduplicator.prototype = Object.create(PluginBase.prototype);

    RootChildduplicator.getDefaultConfig = function () {
        return new PluginConfig();
    };

    RootChildduplicator.prototype.main = function (config, callback) {
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
                    result.commitHash = config.project.makeCommit([result.commitHash], newRootHash, 'Plugin \'RootChildDuplicator\' updated the model.', function(err) {});
                    result.success = true;
                    callback(null, result);
                } else {
                    result.success = false;
                    callback(err, result);
                }
            });
        } else {
            result.success = false;
            callback('root node or core is null or undefined', result);
        }
    };

    return RootChildduplicator;
});
