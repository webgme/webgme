/*globals define*/

/**
 * @author kecso / https://github.com/kecso
 */

define([
    'common/util/assert',
    'common/core/tasync',
    'common/regexp',
    'common/util/random'
], function (ASSERT, TASYNC, REGEXP, RANDOM) {

    'use strict';

    var OWN_GUID = '_relguid',
        relidToInteger = RANDOM.relidToInteger,
        NULL_GUID = '00000000-0000-0000-0000-000000000000',
        GUID = RANDOM.generateGuid;

    function guidCore(_innerCore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');
        var logger = options.logger.fork('guidCore');
        //helper functions
        function toInternalGuid(myGuid) {
            return myGuid.replace(/-/g, '');
        }

        function toExternalGuid(myGuid) {
            return myGuid.substr(0, 8) + '-' + myGuid.substr(8, 4) + '-' +
                myGuid.substr(12, 4) + '-' + myGuid.substr(16, 4) + '-' + myGuid.substr(20);
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
            //TODO we always should know what structure we should expect as a relid -
            // now we think it is a number so it can be converted to 0xsomething
            var relid = _core.getRelid(node);
            //relid = Number(relid);
            relid = relidToInteger(relid);
            if (relid === 'NaN') {
                return null;
            }

            relid = relid.toString(16);

            //now we should fill up with 0's in the beggining
            while (relid.length < 32) {
                relid = relid + '0';
            }
            return relid;
        }

        function xorGuids(a, b) {
            var arrayA = guidToArray(a);
            var arrayB = guidToArray(b);

            ASSERT(arrayA.length === arrayB.length);

            var arrayOut = [];
            for (var i = 0; i < arrayA.length; i++) {
                /*jshint bitwise: false*/
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

        function setDataGuid(node, guid) {
            _core.setAttribute(node, OWN_GUID,
                xorGuids(
                    toInternalGuid(guid),
                    xorGuids(
                        getRelidGuid(node),
                        toInternalGuid(
                            _core.getGuid(
                                _core.getParent(node)
                            )
                        )
                    )
                )
            );
        }

        var _core = {};
        for (var i in _innerCore) {
            _core[i] = _innerCore[i];
        }

        //new functions
        _core.getGuid = function (node) {
            if (node) {
                return toExternalGuid(
                    xorGuids(
                        getRelidGuid(node),
                        xorGuids(
                            _core.getAttribute(node, OWN_GUID),
                            toInternalGuid(
                                _core.getGuid(
                                    _core.getParent(node)
                                )
                            )
                        )
                    )
                );
            } else {
                return NULL_GUID;
            }
        };

        _core.setGuid = function (node, guid) {
            ASSERT(REGEXP.GUID.test(guid));
            return TASYNC.call(function (children) {
                var i,
                    childrenGuids = [];

                //save children guids
                for (i = 0; i < children.length; i += 1) {
                    childrenGuids.push(_core.getGuid(children[i]));
                }

                //setting own dataGuid
                setDataGuid(node, guid);

                //changing children data guids
                for (i = 0; i < children.length; i += 1) {
                    setDataGuid(children[i], childrenGuids[i]);
                }
            }, _core.loadChildren(node));
        };

        //modified functions
        _core.createNode = function (parameters) {
            parameters = parameters || {};

            var guid = parameters.guid || GUID(),
                node;

            ASSERT(REGEXP.GUID.test(guid));

            node = _innerCore.createNode(parameters);

            setDataGuid(node, guid);

            return node;
        };

        _core.moveNode = function (node, parent) {
            var oldGuid = _core.getGuid(node);

            node = _innerCore.moveNode(node, parent);

            setDataGuid(node, oldGuid);

            return node;
        };

        logger.debug('initialized');
        return _core;
    }

    return guidCore;
});
