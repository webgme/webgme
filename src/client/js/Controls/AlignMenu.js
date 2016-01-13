/*globals define*/
/*jshint browser:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['./ContextMenu'], function (ContextMenu) {
    'use strict';

    function AlignMenu(CONSTANTS, options) {
        options = options || {};

        this.isXAxisType = function (type) {
            return type === CONSTANTS.MOVE_TO_LEFT || type === CONSTANTS.MOVE_TO_RIGHT ||
                type === CONSTANTS.ALIGN_VERTICAL;
        };

        this.getExtremePosition = function (allModels, type) {
            var i,
                position,
                extreme = {
                    position: null,
                    id: null
                };

            for (i = 0; i < allModels.length; i += 1) {
                position = allModels[i].position;

                if (type === CONSTANTS.MOVE_TO_TOP) {
                    if (extreme.position === null || extreme.position.y > position.y) {
                        extreme = allModels[i];
                    }
                } else if (type === CONSTANTS.MOVE_TO_BOTTOM) {
                    if (extreme.position === null || extreme.position.y < position.y) {
                        extreme = allModels[i];
                    }
                } else if (type === CONSTANTS.MOVE_TO_RIGHT) {
                    if (extreme.position === null || extreme.position.x < position.x) {
                        extreme = allModels[i];
                    }
                } else if (type === CONSTANTS.MOVE_TO_LEFT) {
                    if (extreme.position === null || extreme.position.x > position.x) {
                        extreme = allModels[i];
                    }
                }
            }

            return extreme.position !== null ? extreme : null;
        };

        /**
         *
         * @param selectionIds
         * @param position
         * @param {function(key)} callback
         */
        this.show = function (selectionIds, position, callback) {
            var menuItems = {};

            //TODO: Display the short cuts in a prettier way
            menuItems[CONSTANTS.MOVE_TO_TOP] = {
                name: 'Move to top [' + CONSTANTS.KEY_SHORT_CUT_MOVE_TO_TOP + ']',
                icon: 'glyphicon glyphicon-arrow-up'
            };
            menuItems[CONSTANTS.MOVE_TO_BOTTOM] = {
                name: 'Move to bottom [' + CONSTANTS.KEY_SHORT_CUT_MOVE_TO_BOTTOM + ']',
                icon: 'glyphicon glyphicon-arrow-down'
            };
            menuItems[CONSTANTS.MOVE_TO_LEFT] = {
                name: 'Move to left [' + CONSTANTS.KEY_SHORT_CUT_MOVE_TO_LEFT + ']',
                icon: 'glyphicon glyphicon-arrow-left'
            };
            menuItems[CONSTANTS.MOVE_TO_RIGHT] = {
                name: 'Move to right [' + CONSTANTS.KEY_SHORT_CUT_MOVE_TO_RIGHT + ']',
                icon: 'glyphicon glyphicon-arrow-right'
            };

            if (selectionIds.length > 1) {
                menuItems[CONSTANTS.ALIGN_HORIZON] = {
                    name: 'Align selection horizontally',
                    icon: 'fa fa-ellipsis-h'
                };
                menuItems[CONSTANTS.ALIGN_VERTICAL] = {
                    name: 'Align selection vertically',
                    icon: 'fa fa-ellipsis-v'
                };
            }

            var menu = new ContextMenu({
                items: menuItems,
                callback: callback
            });

            position = position || {x: 200, y: 200};
            menu.show(position);
        };

        this.alignSetSelection = function (params, selectedIds, type) {
            var target,
                changeXAxis,
                selectedModels = [],
                allModels = [],
                client = params.client,
                modelId = params.modelId,
                idMap = params.idMap,
                coordinates = params.coordinates,
                setName = params.setName;

            selectedIds.forEach(function (id) {
                var gmeId = idMap[id];
                if (gmeId && coordinates[gmeId]) {

                    selectedModels.push({
                        id: gmeId,
                        position: {
                            x: coordinates[gmeId].x,
                            y: coordinates[gmeId].y
                        }
                    });
                }
            });

            if (selectedModels.length === 0) {
                // No models were selected...
                return;
            }

            if (type.indexOf('MOVE_TO_') === 0) {
                Object.keys(coordinates).forEach(function (gmeId) {
                    allModels.push({
                        id: gmeId,
                        position: {
                            x: coordinates[gmeId].x,
                            y: coordinates[gmeId].y
                        }
                    });
                });

                target = this.getExtremePosition(allModels, type);
            } else {
                target = selectedModels[0];
            }

            if (!target) {
                return;
            }

            changeXAxis = this.isXAxisType(type);

            client.startTransaction();
            selectedModels.forEach(function (modelDesc) {
                var newPos = modelDesc.position;
                if (target.id === modelDesc.id) {
                    return;
                }

                if (changeXAxis === true) {
                    newPos.x = target.position.x;
                } else {
                    newPos.y = target.position.y;
                }

                client.setMemberRegistry(modelId, modelDesc.id, setName, 'position', newPos);
            });

            client.completeTransaction();
        };
    }

    return AlignMenu;
});