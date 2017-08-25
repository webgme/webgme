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
         * @param selectedIds
         * @param position
         * @param {function(key)} callback
         */
        this.show = function (selectedIds, position, callback) {
            var menuItems = {};

            if (selectedIds.length > 0) {
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
            }

            if (selectedIds.length > 1) {
                menuItems[CONSTANTS.ALIGN_HORIZON] = {
                    name: 'Align selection vertically',
                    icon: 'fa fa-ellipsis-h'
                };
                menuItems[CONSTANTS.ALIGN_VERTICAL] = {
                    name: 'Align selection horizontally',
                    icon: 'fa fa-ellipsis-v'
                };
            }

            if (selectedIds.length > 2) {
                menuItems[CONSTANTS.DISTRIBUTE_HORIZON] = {
                    name: 'Distribute horizontally',
                    icon: 'fa fa-arrows-h'
                };
                menuItems[CONSTANTS.DISTRIBUTE_VERTICAL] = {
                    name: 'Distribute vertically',
                    icon: 'fa fa-arrows-v'
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
            //  id: <itemId>,
            //  x: <number>,
            //  y: <number>,
            //  height: <number>,
            //  width: <number>
            // }

            function getPos(model) {
                return xPosChange ? model.x : model.y;
            }

            function getWidth(model) {
                return xPosChange ? model.width: model.height;
            }

            function getTotalWidth(models) {
                return models.reduce(function (tot, model) {
                    return tot + getWidth(model);
                }, 0);
            }

            function calculateDistribution(models) {
                var start = getPos(models[0]) + getWidth(models.shift()),
                    end = getPos(models.pop()),
                    tot = getTotalWidth(models),
                    d = (end - start - tot) / (models.length + 1);

                models.forEach(function (model) {
                    var newPos = start + d,
                        currPos = getPos(model);

                    if (newPos !== currPos) {
                        result[model.id] = {
                            x: xPosChange ? Math.round(newPos) : model.x,
                            y: xPosChange ? model.y : Math.round(newPos)
                        };
                    }

                    start = newPos + getWidth(model);
                });
            }

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
                    target = selectedModels[0];
                    break;
                case CONSTANTS.ALIGN_VERTICAL:
                    xPosChange = true;
                    target = selectedModels[0];
                    break;
                case CONSTANTS.DISTRIBUTE_HORIZON:
                    xPosChange = true;
                    selectedModels.sort(function (p1, p2) {
                        if (p1.x > p2.x) {
                            return 1;
                        } else if (p1.x === p2.x) {
                            return 0;
                        } else {
                            return -1;
                        }
                    });
                    break;
                case CONSTANTS.DISTRIBUTE_VERTICAL:
                    selectedModels.sort(function (p1, p2) {
                        if (p1.y > p2.y) {
                            return 1;
                        } else if (p1.y === p2.y) {
                            return 0;
                        } else {
                            return -1;
                        }
                    });
                    break;
                default:
                    return {};
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
            } else {
                // Do not mutate the input array
                calculateDistribution(selectedModels.slice());
            }

            return result;
        };
    }

    return AlignMenu;
});