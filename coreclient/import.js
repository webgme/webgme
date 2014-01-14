/*
The decision whether a pointer is pointer or set should be based upon the node's META info.
If the META info doesn't contains anything about the given pointer then the importer should ignore it.
One exception from this rule is when the pointer is 'base' as that should be handled in all nodes.
Other exception is when we import a root. In this case we assume that every non 'base' named pointer is a set (or we introduce an exception list for pointers...).
Regarding the META, the multiplicity will show us whether a pointer is a set or not.
This means that if a META was given badly in the first place, then the importer would change it!!!

Other important thing is that the node must have a base pointer, the only exception again if the node is the root itself. - this option may be switchable TODO

As we have the possibility to import a subtree inside the same project, this means that the nodes that are inside the import will loose their GUID.

Currently we expect to have 'GUID enhanced' reference objects (or internal referring standard ones) and we will not search for the GUID, but only check against the found node on the given path. TODO

*/

define([
    'coreclient/meta'
],function(
    META
    ){
    var _core = null,
        _root = null,
        _createdNodes = null;

    function getRefernceNode(refObj,callback){

    }
    function importJsonNode(core,parent,jNode,callback){
        _core = core;

        callback('not implemented');
    }

    return importJsonNode;
});

