define(['CoreBuffer','CommonUtil'],function(CoreBuffer,commonUtil){
    var ASSERT = commonUtil.assert;
    var KEY = "_id";
    var Core = function (storage) {

        var buffer = new CoreBuffer(storage);


        var createNode = function (parent,base,newguid) {
            var node;
            if(base){
                node = buffer.createEmptyNode(newguid);
            }
            else{
                node = buffer.inheritNode(base[ID],newguid);
            }

            if(parent){
                buffer.attachChild(parent,node);
            }
            return node;
        };

        var removeNode = function (node) {
            var parent = pertree.getParent();
            ASSERT(parent !== null);

            pertree.delParent(node);
        };

        var attachNode = function (node, parent) {
            ASSERT(node && parent);
            ASSERT(pertree.getParent(node) === null);

            var relid = createRelid(parent.data);
            pertree.setParent(node, parent, relid);
        };

        var copyNode = function (node, parent) {
            ASSERT(node && parent);

            var relid = createRelid(parent.data);
            pertree.copy(node, parent, relid);
        };

        var persist = function (root, callback) {
            ASSERT(root && callback);
            ASSERT(pertree.getParent(root) === null);

            pertree.persist(root, callback);
        };

        var EMPTY_STRING = "";

        var loadPointer = function (node, name, callback) {
            ASSERT(node && name && callback);

            var source = EMPTY_STRING;
            var target;

            do {
                var child = pertree.getChild(node, OVERLAYS);
                ASSERT(child);

                child = pertree.getChild(child, source);
                if( child ) {
                    target = pertree.getProperty(child, name);
                    if( target ) {
                        break;
                    }
                }

                if( source === EMPTY_STRING ) {
                    source = pertree.getRelid(node);
                }
                else {
                    source = pertree.getRelid(node) + "/" + source;
                }

                node = pertree.getParent(node);
            } while( node );

            if( target === undefined ) {
                callback(null, null);
            }
            else {
                ASSERT(typeof target === "string");
                pertree.loadByPath(node, target, callback);
            }
        };

        var getPointerNames = function (node) {

            var source = EMPTY_STRING;
            var names = [];

            do {
                var child = pertree.getProperty2(node, OVERLAYS, source);
                if(child) {
                    for(var name in child) {
                        ASSERT(names.indexOf(name) === -1);
                        if( name.slice(-5) !== "-coll" ) {
                            names.push(name);
                        }
                    }
                }

                if( source === EMPTY_STRING ) {
                    source = pertree.getRelid(node);
                }
                else {
                    source = pertree.getRelid(node) + "/" + source;
                }

                node = pertree.getParent(node);
            } while( node );

            return names;
        };

        var deletePointer = function (node, name) {
            ASSERT(node && name);

            var source = EMPTY_STRING;
            var target;

            do {
                var refs = pertree.getChild(node, OVERLAYS);
                ASSERT(refs);

                var child = pertree.getChild(refs, source);
                if( child ) {
                    target = pertree.getProperty(child, name);
                    if( target ) {
                        pertree.delProperty(child, name);
                        if( pertree.isEmpty(child) ) {
                            pertree.detach(child);
                        }

                        child = pertree.getChild(refs, target);
                        ASSERT(child);

                        name = name + "-coll";

                        var array = pertree.getProperty(child, name);
                        ASSERT(array && array.constructor === Array && array.length >= 1);

                        if( array.length === 1 ) {
                            ASSERT(array[0] === source);

                            pertree.delProperty(child, name);
                            if( pertree.isEmpty(child) ) {
                                pertree.detach(child);
                            }
                        }
                        else {
                            var index = array.indexOf(source);
                            ASSERT(index >= 0);

                            array = array.slice(0);
                            array.splice(index, 1);

                            pertree.setProperty(child, name, array);
                        }

                        return true;
                    }
                }

                if( source === EMPTY_STRING ) {
                    source = pertree.getRelid(node);
                }
                else {
                    source = pertree.getRelid(node) + "/" + source;
                }

                node = pertree.getParent(node);
            } while( node );

            return false;
        };

        var setPointer = function (node, name, target) {
            ASSERT(node && name && target);

            deletePointer(node, name);

            var ancestor = pertree.getCommonAncestor(node, target);
            var relpaths = [ pertree.getStringPath(node, ancestor[0]),
                pertree.getStringPath(target, ancestor[1]) ];

            ASSERT(ancestor[0] === ancestor[1]);

            var refs = pertree.getChild(ancestor[0], OVERLAYS);
            ASSERT(refs);

            var child = pertree.getChild(refs, relpaths[0]);
            if( !child ) {
                child = pertree.createChild(refs, relpaths[0]);
            }

            ASSERT(pertree.getProperty(child, name) === undefined);
            pertree.setProperty(child, name, relpaths[1]);

            child = pertree.getChild(refs, relpaths[1]);
            if( !child ) {
                child = pertree.createChild(refs, relpaths[1]);
            }

            name = name + "-coll";

            var array = pertree.getProperty(child, name);
            ASSERT(array === undefined || array.constructor === Array);

            if( !array ) {
                array = [ relpaths[0] ];
            }
            else {
                array = array.slice(0);
                array.push(relpaths[0]);
            }

            pertree.setProperty(child, name, array);
        };


        return {
            getKey        : buffer.getKey,
            loadRoot      : buffer.loadRoot,
            createNode    : createNode,
            loadChildren  : buffer.loadChildren,
            loadChild     : buffer.loadChild,
            getParent     : buffer.getParent,
            getRoot       : buffer.getRoot,
            getStringPath : buffer.getStringPath,
            //removeNode: removeNode,
            attachNode: buffer.attachChild,
            //copyNode: copyNode,
            getAttribute  : buffer.getAttribute,
            setAttribute  : buffer.setAttribute,
            delAttribute  : buffer.delAttribute,
            getRegistry   : buffer.getRegistry,
            setRegistry   : bufffer.setRegistry,
            delRegistry   : buffer.delRegistry
            //persist: persist,
            //loadPointer: loadPointer,
            //deletePointer: deletePointer,
            //setPointer: setPointer,
            //dumpTree: pertree.dumpTree
        };
    };

    return Core;
});
