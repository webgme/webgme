define([
    'coreclient/meta'
],function(
    META
    ){

    var getJsonNode = function(core,node){
            nodes = {};
        nodes[core.getPath(node)] = node;
        META.initialize(core,nodes,function(){});

        return META.getMeta(core.getPath(node));
    };
    return getJsonNode;
});
