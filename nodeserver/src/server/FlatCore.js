define(['CoreBuffer','./../common/CommonUtil'],function(CoreBuffer,commonUtil){
    var ASSERT = commonUtil.assert;
    var KEY = "_id";
    var Core = function (storage) {

        var buffer = new CoreBuffer(storage);


        var createNode = function (parent,base,newguid) {
            var node;
            if(base === null || base === undefined){
                node = buffer.createEmptyNode(newguid);
            }
            else{
                node = buffer.inheritNode(base[KEY],newguid);
            }

            if(parent){
                buffer.attachChild(parent,node);
            }
            return node;
        };

        var copyNode = function (node, parent) {
            ASSERT(node && parent);

            var relid = createRelid(parent.data);
            pertree.copy(node, parent, relid);
        };

        return {
            getKey            : buffer.getKey,
            loadRoot          : buffer.loadRoot,
            loadByPath        : buffer.loadByPath,
            createNode        : createNode,
            loadChildren      : buffer.loadChildren,
            loadChild         : buffer.loadChild,
            getParent         : buffer.getParent,
            getBase           : buffer.getBase,
            getRoot           : buffer.getRoot,
            getStringPath     : buffer.getStringPath,
            removeNode        : buffer.removeNode,
            attachNode        : buffer.attachChild,
            copyNode          : buffer.copyNode,
            getAttributeNames : buffer.getAttributeNames,
            getAttribute      : buffer.getAttribute,
            setAttribute      : buffer.setAttribute,
            delAttribute      : buffer.delAttribute,
            getRegistry       : buffer.getRegistry,
            setRegistry       : buffer.setRegistry,
            delRegistry       : buffer.delRegistry,
            persist           : buffer.persist,
            getPointerNames   : buffer.getPointerNames,
            loadPointer       : buffer.loadPointer,
            deletePointer     : buffer.deletePointer,
            setPointer        : buffer.setPointer,
            dumpTree          : buffer.dumpTree,
            flushTree         : buffer.flushTree,
            getLevel          : buffer.getLevel
        };
    };

    return Core;
});
