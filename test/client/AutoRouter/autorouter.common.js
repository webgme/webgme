/*globals require*/
/*jshint node:true, mocha:true*/
/**
 * @author brollb / https://github.com/brollb
 */

var requirejs = require('requirejs');

//requirejs.config({
//    //baseUrl: 'src/',
//    paths: {
//        //'logManager': 'common/LogManager',
//        //'util/assert': 'common/util/assert'
//    }
//});

var AutoRouter = requirejs('client/js/Widgets/DiagramDesigner/AutoRouter'),
    assert = requirejs('common/util/assert'),
    router;

// Set up helpers
var getNewGraph = function () {
    'use strict';

    router = new AutoRouter();
    return router;
};

var connectAll = function (boxes) {
    'use strict';

    var i,
        j;

    for (i = boxes.length; i--;) {
        for (j = boxes.length; j--;) {
            router.addPath({src: boxes[i].ports, dst: boxes[j].ports});
        }
    }

    router.routeSync();
};

var addBox = function (options) {
    'use strict';

    var x = options.x,
        y = options.y,
        width = options.width || 100,
        height = options.height || 100,
        boxDef = {
            x1: x,
            x2: x + width,
            y1: y,
            y2: y + height,
            ports: [
                {
                    id: 'top',
                    area: [[x + 10, y + 10], [x + width - 10, y + 10]]
                },
                {
                    id: 'bottom',
                    area: [[x + 10, y + height - 10], [x + width - 10, y + height - 10]]
                }
            ]
        };
    return router.addBox(boxDef);
};

var addBoxes = function (locations) {
    'use strict';
    var boxes = [],
        i;

    for (i = locations.length; i--;) {
        boxes.push(addBox({
            x: locations[i][0],
            y: locations[i][1]
        }));
    }

    return boxes;
};

var getBoxCount = function () {
    'use strict';
    return Object.keys(router.graph.boxes).length;
};

// Validation Helpers
var evaluateEdges = function (edges, fn) {
    'use strict';
    var edge = edges.orderFirst,
        result = false;

    while (edge && !result) {
        result = fn(edge);
        edge = edge.orderNext;
    }

    return result;
};

// WebGME misc test helpers
var webgme_helpers = (function () {
    'use strict';
    var addPorts = function (box) {
            box.ports = [
                {
                    id: 'W',
                    angles: [180, 180],
                    area: [[box.x1, box.y1 + 10], [box.x1, box.y2 - 10]]
                },
                {
                    id: 'S',
                    angles: [90, 90],
                    area: [[box.x1 + 10, box.y2], [box.x2 - 10, box.y2]]
                },
                {
                    id: 'N',
                    angles: [270, 270],
                    area: [[box.x1 + 10, box.y1], [box.x2 - 10, box.y1]]
                },
                {
                    id: 'E',
                    angles: [0, 0],
                    area: [[box.x2, box.y1 + 10], [box.x2, box.y1 + 30]]
                }
            ];

            return box;
        },
        makeBoxDef = function (location /*, width, height */) {
            var x1 = location[0],
                y1 = location[1],
                x2 = x1 + 129,
                y2 = y1 + 40;

            return addPorts({
                x1: x1,
                x2: x2,
                y1: y1,
                y2: y2
            });

        },
        makeBox = function (location) {
            return router.addBox(makeBoxDef(location));
        },

        makeGMEPort = function (location, orientation) {
            var x1 = location[0],
                y1 = location[1],
                x2 = x1 + 7,
                y2 = y1 + 12,
                ports = [],
                boxDef = {
                    x1: x1,
                    x2: x2,
                    y1: y1,
                    y2: y2
                };

            // FIXME: do not use switch statements, use if else
            switch (orientation) {
                case 'left':
                    ports = [{angles: [180, 180], area: [[x1 + 1, y1 + y2 / 2], [x1 + 1, y1 + y2 / 2]]}];
                    break;

                case 'right':
                    ports = [{angles: [0, 0], area: [[x2 - 1, y1 + y2 / 2], [x2 - 1, y1 + y2 / 2]]}];
                    break;
            }

            return router.addBox(boxDef);
        };

    return {
        makeBox: makeBox,
        makeBoxDef: makeBoxDef,
        makeGMEPort: makeGMEPort
    };

})();

module.exports = {
    getNewGraph: getNewGraph,
    addBox: addBox,
    connectAll: connectAll,
    addBoxes: addBoxes,
    getBoxCount: getBoxCount,
    evaluateEdges: evaluateEdges,
    assert: assert,
    webgme: webgme_helpers
};
