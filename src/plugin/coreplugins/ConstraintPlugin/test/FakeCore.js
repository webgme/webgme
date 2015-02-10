/*globals define*/
/*
 * Used for testing constraints.
 *
 * @author brollb / https://github/brollb
 */

define(['util/assert'], function (assert){
    
    "use strict";

    var FakeCore = function(){
    };

    FakeCore.prototype.loadChildren = function(node, callback){
        setTimeout(callback, 0, null, node.children);
    };

    FakeCore.prototype.loadByPath = function(start, nodeId, callback){
        var self = this,
            relids = nodeId.split('/').splice(1),
            startPath = this.getPath(start),
            commonPath = "",
            commonAncestor,
            node,
            path,
            i = 0;

        if (startPath === nodeId){
            return start;
        }

        while (i < relids.length-1 && 
               startPath.indexOf(relids[i]) === nodeId.indexOf(relids[i])){
            commonPath += '/' + relids[i];
            i++;
        }

        //Follow children nodes to node with nodeId

        commonAncestor = start;
        while (this.getPath(commonAncestor) !== commonPath){
            commonAncestor = start.parent;
        }

        //iterate forward
        node = commonAncestor;
        path = commonPath;
        var search = function(n){
                if (n === null || ++i >= relids.length){
                    assert(nodeId === self.getPath(n), "FakeCore loaded incorrect node");
                    setTimeout(callback, 0, null, n);
                } else {
                    self._getChildWithPath(n, path += '/' + relids[i], search);
                }
            };

        i--;
        search(commonAncestor);
    };

    FakeCore.prototype._getChildWithPath = function(node, id, cb){
        var self = this,
            goalNode,
            filterFn = function(err, nodes){
                goalNode = null;
                if (!err){
                    for (var i = nodes.length-1; i >= 0; i--){
                        if (self.getPath(nodes[i]) === id){
                            goalNode = nodes[i];
                        }
                    }
                    setTimeout(cb, 0, goalNode);
                } else {
                    assert (false, JSON.stringify(err));
                }
            };

        this.loadChildren(node, filterFn);
    };

    FakeCore.prototype.getAttribute = function(node, name){
        var attribute = null;

        while (!attribute && node){
            if (node.attributes){
                attribute = node.attributes[name] || null;
            }
            node = this.getBase(node);
        }

        return attribute;
    };

    FakeCore.prototype.getPointerPath = function(node, name){
        var pointer = null;

        while (!pointer && node){
            pointer = node.pointers[name] || null;
            node = this.getBase(node);
        }

        return pointer;
    };

    FakeCore.prototype.getChildrenPaths = function(node){
        var result = [];
        for (var i = node.children.length-1; i >= 0; i--){
            result.push(this.getPath(node.children[i]));
        }
        return result;
    };

    FakeCore.prototype.getParentPath = function(node){
        return this.getPath(node.parent);
    };

    FakeCore.prototype.getPath = function(node){
        return node.path;
    };

    FakeCore.prototype.getBase = function(node){
        return node.base;
    };

    return FakeCore;
});
