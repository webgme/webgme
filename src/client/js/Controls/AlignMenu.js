/*globals define*/
/*jshint browser:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['./ContextMenu'], function (ContextMenu) {
    'use strict';

    function AlignMenu(CONSTANTS, options) {
        options = options || {};

        this.getExtremePosition = function (allModels, type) {
            var i,
                extreme = {
                    x: null,
                    y: null,
                    id: null
                };

            for (i = 0; i < allModels.length; i += 1) {
                if (type === CONSTANTS.MOVE_TO_TOP) {
                    if (extreme.y === null || extreme.y > allModels[i].y) {
                        extreme = allModels[i];
                    }
                } else if (type === CONSTANTS.MOVE_TO_BOTTOM) {
                    if (extreme.y === null || extreme.y < allModels[i].y) {
                        extreme = allModels[i];
                    }
                } else if (type === CONSTANTS.MOVE_TO_RIGHT) {
                    if (extreme.x === null || extreme.x < allModels[i].x) {
                        extreme = allModels[i];
                    }
                } else if (type === CONSTANTS.MOVE_TO_LEFT) {
                    if (extreme.x === null || extreme.x > allModels[i].x) {
                        extreme = allModels[i];
                    }
                }
            }

            return extreme.id !== null ? extreme : null;
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
                    name: 'Align selection vertically',
                    icon: 'fa fa-ellipsis-h'
                };
                menuItems[CONSTANTS.ALIGN_VERTICAL] = {
                    name: 'Align selection horizontally',
                    icon: 'fa fa-ellipsis-v'
                };
            }

            if (selectionIds.length > 2) {
                menuItems[CONSTANTS.DISTRIBUTE_HORIZON] = {
                    name: 'Distribute vertically',
                    icon: 'fa fa-ellipsis-h'
                };
                menuItems[CONSTANTS.DISTRIBUTE_VERTICAL] = {
                    name: 'Distribute horizontally',
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

        /**
         *
         * @param {object[]} allModels
         * @param {object[]} selectedModels
         * @param {string} type - 'MOVE_TO_LEFT', 'MOVE_TO_RIGHT', 'MOVE_TO_TOP', 'MOVE_TO_BOTTOM',
         * 'ALIGN_HORIZON', 'ALIGN_VERTICAL', 'DISTRIBUTE_HORIZON', 'DISTRIBUTE_VERTICAL'
         *
         * @returns {object} - New positions indexed by id (only added if changed).
         */
        this.getNewPositions = function (allModels, selectedModels, type) {
            var result = {},
                xPosChange,
                target;
            // models {
            //  id: <gmeID>,
            //  x: <number>,
            //  y: <number>,
            //  height: <number>,
            //  width: <number>
            // }

            switch (type) {
                case CONSTANTS.MOVE_TO_LEFT:
                case CONSTANTS.MOVE_TO_RIGHT:
                    xPosChange = true;
                    target = this.getExtremePosition(allModels, type);
                    break;
                case CONSTANTS.MOVE_TO_TOP:
                case CONSTANTS.MOVE_TO_BOTTOM:
                    target = this.getExtremePosition(allModels, type);
                    break;
                case CONSTANTS.ALIGN_HORIZON:
                    xPosChange = true;
                    target = selectedModels[0];
                    break;
                case CONSTANTS.ALIGN_VERTICAL:
                    target = selectedModels[0];
                    break;
                case CONSTANTS.DISTRIBUTE_HORIZON:
                case CONSTANTS.DISTRIBUTE_VERTICAL:
                    throw new Error('Not Implemented');
                    break;

                default:
                    break;
            }

            if (target) {
                selectedModels.forEach(function (model) {
                    if (xPosChange && model.x !== target.x) {
                        result[model.id] = {
                            x: target.x,
                            y: model.y
                        };
                    } else if (model.y !== target.y) {
                        result[model.id] = {
                            x: model.x,
                            y: target.y
                        };
                    }
                });
            }

            return result;
        };
    }

    return AlignMenu;
});