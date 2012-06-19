define(['CoreBuffer','CommonUtil'],function(CoreBuffer,commonUtil){
    var ASSERT = commonUtil.assert;
    var KEY = "_id";
    var Core = function (storage) {

        var buffer = new CoreBuffer(storage);

        var getKey = function(node){
            ASSERT(node);
            ASSERT(node[KEY]);

            return node[KEY];
        };

        var createNode = function (parent,base) {
            var node;
            if(base){
                node = buffer.createEmptyNode();
            }
            else{
                node = buffer.inheritNode(base[ID]);
            }
            return node;
        };

        var loadChildren = function (node, callback) {
            ASSERT(node && callback);

            var counter = 1;
            var children = [];

            var done = function (err, child) {
                ASSERT(counter >= 1);

                if( child ) {
                    children.push(child);
                }

                if( callback && (err || --counter === 0) ) {
                    callback(err, children);
                    callback = null;
                }
            };

            for( var relid in node.data ) {
                if( isValidRelid(relid) ) {
                    ++counter;
                    pertree.loadChild(node, relid, done);
                }
            }

            done(null);
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
            getKey: pertree.getKey,
            loadRoot: buffer.loadRoot,
            //createNode: createNode,
            //loadChildren: loadChildren,
            //loadChild: pertree.loadChild,
            //getParent: pertree.getParent,
            //getRoot: pertree.getRoot,
            //getStringPath: pertree.getStringPath,
            //removeNode: removeNode,
            //attachNode: attachNode,
            //copyNode: copyNode,
            getAttribute: buffer.getAttribute,
            setAttribute: buffer.setAttribute,
            delAttribute: buffer.delAttribute,
            getRegistry: buffer.getRegistry,
            setRegistry: bufffer.setRegistry,
            delRegistry: buffer.delRegistry,
            //persist: persist,
            //loadPointer: loadPointer,
            //deletePointer: deletePointer,
            //setPointer: setPointer,
            //dumpTree: pertree.dumpTree
        };
    };

    return Core;
});
