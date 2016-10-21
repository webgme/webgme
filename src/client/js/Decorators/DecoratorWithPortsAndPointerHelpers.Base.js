/*globals define, _*/
/*jshint browser: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    './DecoratorWithPorts.Base',
    'js/Constants',
    'js/Utils/GMEConcepts',
    'js/Controls/ContextMenu'
], function (DecoratorWithPortsBase, CONSTANTS, GMEConcepts, ContextMenu) {

    'use strict';

    var DecoratorWithPortsAndPointerHelpersBase,
        EXCLUDED_POINTERS = [
            CONSTANTS.POINTER_BASE,
            CONSTANTS.POINTER_SOURCE,
            CONSTANTS.POINTER_TARGET,
            CONSTANTS.POINTER_CONSTRAINED_BY];

    DecoratorWithPortsAndPointerHelpersBase = function () {
        DecoratorWithPortsBase.apply(this, []);
    };

    _.extend(DecoratorWithPortsAndPointerHelpersBase.prototype, DecoratorWithPortsBase.prototype);

    DecoratorWithPortsAndPointerHelpersBase.prototype._getPointerNames = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            ptrNames = [];

        if (nodeObj) {
            ptrNames = _.difference(nodeObj.getPointerNames().slice(0), EXCLUDED_POINTERS);
        }

        return ptrNames;
    };

    DecoratorWithPortsAndPointerHelpersBase.prototype._getValidPointersForTarget = function (targetId) {
        var client = this._control._client,
            gmeID = this._metaInfo[CONSTANTS.GME_ID],
            ptrNames = this._getPointerNames(),
            len = ptrNames.length,
            validPtrNames = [],
            targetNode = client.getNode(targetId),
            p;

        while (len-- && targetNode) {
            p = ptrNames[len];
            if (targetNode.isValidTargetOf(gmeID, p)) {
                validPtrNames.push(p);
            }
        }

        if (validPtrNames.length > 0) {
            validPtrNames.sort(function (a, b) {
                var ptrA = a.toLowerCase(),
                    ptrB = b.toLowerCase();
                if (ptrA < ptrB) {
                    return -1;
                } else if (ptrA > ptrB) {
                    return 1;
                }

                //must be equal
                return 0;
            });
        }

        return validPtrNames;
    };

    DecoratorWithPortsAndPointerHelpersBase.prototype._getPointerTargets = function () {
        var pointerTargets = [],
            client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            ptrNames,
            len,
            ptrTo;

        if (nodeObj) {
            ptrNames = this._getPointerNames();
            len = ptrNames.length;
            while (len--) {
                ptrTo = nodeObj.getPointer(ptrNames[len]);
                if (ptrTo && ptrTo.to !== undefined && ptrTo.to !== null) {
                    pointerTargets.push([ptrNames[len], ptrTo.to]);
                }
            }

            if (pointerTargets.length > 0) {
                pointerTargets.sort(function (a, b) {
                    var ptrA = a[0].toLowerCase(),
                        ptrB = b[0].toLowerCase();
                    if (ptrA < ptrB) {
                        return -1;
                    } else if (ptrA > ptrB) {
                        return 1;
                    }

                    //must be equal
                    return 0;
                });
            }
        }

        return pointerTargets;
    };

    DecoratorWithPortsAndPointerHelpersBase.prototype._setPointerTarget = function (targetID, mousePos) {
        var ptrNames = this._getValidPointersForTarget(targetID),
            validReplaceable = this._isValidReplaceableTarget(targetID);

        if (ptrNames.length > 0 || validReplaceable) {
            //check to see if there is more than one potential pointer to set
            if (ptrNames.length === 1 && !validReplaceable) {
                this._setPointer(ptrNames[0], targetID);
            } else {
                //there is multiple pointer names that are valid for this target
                //let the user pick one
                this._selectPointerForTarget(ptrNames, targetID, mousePos, validReplaceable);
            }
        }
    };

    DecoratorWithPortsAndPointerHelpersBase.prototype._setPointer = function (ptrName, targetID) {
        var client = this._control._client,
            gmeID = this._metaInfo[CONSTANTS.GME_ID],
            nodeObj = client.getNode(gmeID),
            ptrVal = nodeObj.getPointer(ptrName);

        if (ptrVal !== targetID) {
            client.setPointer(gmeID, ptrName, targetID);
        }
    };

    DecoratorWithPortsAndPointerHelpersBase.prototype._selectPointerForTarget = function (ptrNames, targetID, mousePos,
                                                                                          validReplaceable) {
        var logger = this.logger,
            menu,
            self = this,
            menuItems = {},
            i;

        for (i = 0; i < ptrNames.length; i += 1) {
            menuItems[ptrNames[i]] = {
                icon: 'glyphicon glyphicon-share',
                name: 'Set pointer "' + ptrNames[i] + '"'
            };
        }

        if (validReplaceable) {
            menuItems[''] = {
                icon: 'glyphicon glyphicon-transfer',
                name: 'Replace base'
            };
        }

        menu = new ContextMenu({
            items: menuItems,
            callback: function (key) {
                if (key) {
                    logger.debug('_selectPointerForTarget: ' + key);
                    self._setPointer(key, targetID);
                } else {
                    self._replaceWithTarget(targetID);
                }
            }
        });

        menu.show({x: mousePos.left, y: mousePos.top});
    };

    DecoratorWithPortsAndPointerHelpersBase.prototype._setPointerTerritory = function (pointerTargets) {
        var logger = this.logger,
            len = pointerTargets.length;

        this._selfPatterns = {};

        if (len > 0) {
            if (!this._territoryId) {
                this._territoryId = this._control._client.addUI(this, function (events) {
                    // don't really care here, just want to make sure that the reference object is loaded in the
                    // client
                    logger.debug('onEvent: ' + JSON.stringify(events));
                });
            }
            while (len--) {
                this._selfPatterns[pointerTargets[len][1]] = {children: 0};
            }
        }

        if (this._selfPatterns && !_.isEmpty(this._selfPatterns)) {
            this._control._client.updateTerritory(this._territoryId, this._selfPatterns);
        } else {
            if (this._territoryId) {
                this._control._client.removeUI(this._territoryId);
            }
        }
    };

    // Replaceable helpers
    DecoratorWithPortsAndPointerHelpersBase.prototype._isReplaceable = function () {
        return GMEConcepts.isReplaceable(this._metaInfo[CONSTANTS.GME_ID]);
    };

    DecoratorWithPortsAndPointerHelpersBase.prototype._isValidReplaceableTarget = function (targetId) {
        return GMEConcepts.isValidReplaceableTarget(this._metaInfo[CONSTANTS.GME_ID], targetId);
    };

    DecoratorWithPortsAndPointerHelpersBase.prototype._replaceWithTarget = function (targetId) {
        this._control._client.setBase(this._metaInfo[CONSTANTS.GME_ID], targetId);
    };

    return DecoratorWithPortsAndPointerHelpersBase;
});
