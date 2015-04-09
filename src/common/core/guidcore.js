/*globals define*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/util/assert',
    'common/util/guid',
    'common/core/tasync',
    'common/regexp'], function (ASSERT, GUID, TASYNC, REGEXP) {

    'use strict';

    var OWN_GUID = '_relguid';

    function guidCore(_innerCore) {

        //helper functions
        function toInternalGuid(myGuid) {
            return myGuid.replace(/-/g, '');
        }

        function toExternalGuid(myGuid) {
            var out = myGuid.substr(0, 8) + '-' + myGuid.substr(8, 4) + '-' +
                myGuid.substr(12, 4) + '-' + myGuid.substr(16, 4) + '-' + myGuid.substr(20);
            return out;
        }

        function guidToArray(guid) {
            if (guid === null || guid === undefined) {
                return [0, 0, 0, 0, 0, 0, 0, 0];
            }
            var array = [];
            for (var i = 0; i < guid.length / 4; i++) {
                array.push(parseInt(guid.substr(4 * i, 4), 16));
            }
            return array;
        }

        function getRelidGuid(node) {
            //TODO we always should know what structure we should expect as a relid, now we think it is a number so it can be converted to 0xsomething
            var relid = _core.getRelid(node);
            relid = Number(relid);
            if (relid === 'NaN') {
                return null;
            }
            if (relid < 0) {
                relid = relid * (-1);
            }

            relid = relid.toString(16);

            //now we should fill up with 0's in the beggining
            while (relid.length < 32) {
                relid = relid + '0'; //TODO we pad to the end so the final result will be more visible during debug
            }
            return relid;
        }

        function xorGuids(a, b) {
            var arrayA = guidToArray(a);
            var arrayB = guidToArray(b);

            ASSERT(arrayA.length === arrayB.length);

            var arrayOut = [];
            for (var i = 0; i < arrayA.length; i++) {
                arrayOut.push(arrayA[i] ^ arrayB[i]);
            }
            for (i = 0; i < arrayOut.length; i++) {
                arrayOut[i] = Number(arrayOut[i]).toString(16);
                var difi = 4 - arrayOut[i].length;
                while (difi > 0) {
                    arrayOut[i] = '0' + arrayOut[i];
                    difi--;
                }
            }
            return arrayOut.join('');
        }

        var _core = {};
        for (var i in _innerCore) {
            _core[i] = _innerCore[i];
        }

        //new functions
        _core.getMiddleGuid = function (node) {
            var outGuid = _core.getAttribute(node, OWN_GUID);
            var tempnode = _core.getParent(node);
            while (tempnode) {
                outGuid = xorGuids(outGuid, _core.getAttribute(tempnode, OWN_GUID));
                tempnode = _core.getParent(tempnode);
            }
            return outGuid;
        };

        _core.getGuid = function (node) {
            var middle = _core.getMiddleGuid(node),
                relid = getRelidGuid(node),
                guid = xorGuids(middle, relid);
            return toExternalGuid(guid);
        };

        _core.setGuid = function (node, guid) {
            ASSERT(REGEXP.GUID.test(guid));
            var children = _core.loadChildren(node);
            return TASYNC.call(function (nodeArray) {
                var newGuid = toInternalGuid(guid);
                //first setting the node's OWN_GUID
                var oldOwn = _core.getAttribute(node, OWN_GUID);
                var parent = _core.getParent(node);
                if (parent) {
                    _core.setAttribute(node, OWN_GUID,
                        xorGuids(newGuid, xorGuids(_core.getMiddleGuid(parent), getRelidGuid(node))));
                } else {
                    _core.setAttribute(node, OWN_GUID, xorGuids(newGuid, getRelidGuid(node)));
                }
                var newOwn = _core.getAttribute(node, OWN_GUID);
                //now modify its children's
                for (var i = 0; i < nodeArray.length; i++) {
                    var oldGuid = _core.getAttribute(nodeArray[i], OWN_GUID);
                    _core.setAttribute(nodeArray[i], OWN_GUID, xorGuids(oldGuid, xorGuids(oldOwn, newOwn)));
                }

                return;
            }, children);
        };

        //modified functions
        _core.createNode = function (parameters) {
            parameters = parameters || {};
            var guid = parameters.guid || GUID(),
                parent = parameters.parent;

            ASSERT(REGEXP.GUID.test(guid));

            var node = _innerCore.createNode(parameters);
            guid = toInternalGuid(guid);

            var relguid = '';
            if (parent) {
                relguid = xorGuids(toInternalGuid(_core.getMiddleGuid(_core.getParent(node))),
                    xorGuids(guid, getRelidGuid(node)));
            } else {
                relguid = xorGuids(guid, getRelidGuid(node));
            }
            _innerCore.setAttribute(node, OWN_GUID, relguid);

            return node;
        };

        _core.moveNode = function (node, parent) {
            var oldGuid = toInternalGuid(_core.getGuid(node)),
                newNode = _innerCore.moveNode(node, parent);

            _core.setAttribute(newNode, OWN_GUID, xorGuids(_core.getMiddleGuid(parent),
                xorGuids(oldGuid, getRelidGuid(newNode))));

            return newNode;
        };

        _core.copyNode = function (node, parent) {
            var newNode = _innerCore.copyNode(node, parent);
            _core.setAttribute(newNode, OWN_GUID, toInternalGuid(GUID()));
            return newNode;
        };

        _core.copyNodes = function (nodes, parent) {
            var copiedNodes = _innerCore.copyNodes(nodes, parent),
                i;
            for (i = 0; i < copiedNodes.length; i++) {
                _core.setAttribute(copiedNodes[i], OWN_GUID, toInternalGuid(GUID()));
            }

            return copiedNodes;
        };

        return _core;
    }

    return guidCore;
});
