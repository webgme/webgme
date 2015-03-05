/*globals require*/
/*jshint node:true, mocha:true*/
/**
 * @author brollb / https://github.com/brollb
 */

// Tests
describe('AutoRouter Tests', function () {
    'use strict';
    var utils = require('./autorouter.common.js'),
        assert = utils.assert,
        router;

    this.timeout(20000);

    beforeEach(function () {
        router = utils.getNewGraph();
    });

    it('should create basic paths', function () {
        var box1 = utils.addBox({x: 100, y: 100}),
            box2 = utils.addBox({x: 900, y: 900}),
            srcId = Object.keys(box1.ports)[0],
            dstId = Object.keys(box2.ports)[0],
            path;

        router.addPath({src: box1.ports[srcId], dst: box2.ports[dstId]});
        path = router.graph.paths[0];

        router.routeSync();
        assert(path.points.length > 2,
            'Path does not contain enough points to have been routed');

    });

    it('should detect bracket opening', function () {
        var box1 = utils.addBox({x: 100, y: 100}),
            portIds = Object.keys(box1.ports),
            srcId = portIds[0],
            dstId = portIds[1],

            hasBracketOpeningOrClosing,
            testFn = function (edge) {
                return edge.bracketOpening || edge.bracketOpening;
            };

        router.addPath({src: box1.ports[srcId], dst: box1.ports[dstId]});
        router.routeSync();

        // Check that the graph contains an edge that is bracket closing or opening
        hasBracketOpeningOrClosing = utils.evaluateEdges(router.graph.horizontal, testFn) ||
                                     utils.evaluateEdges(router.graph.vertical, testFn);

        if (!hasBracketOpeningOrClosing) {
            router.graph.dumpEdgeLists();
            throw new Error('Did not detect bracket opening/closing');
        }
    });

    it('should connect two boxes', function () {
        var box1 = utils.addBox({x: 100, y: 100}),
            box2 = utils.addBox({x: 500, y: 800});

        utils.connectAll([box1, box2]);
    });

    it('should connect multiple boxes', function () {
        var locations = [[100, 100],
                [500, 300],
                [300, 300]],
            boxes = utils.addBoxes(locations);

        utils.connectAll(boxes);
    });

    it('should move connected boxes', function () {
        var locations = [[100, 100],
                [500, 800],
                [500, 300],
                [300, 300]],
            boxes = utils.addBoxes(locations),
            i,
            j;

        for (i = boxes.length; i--;) {
            for (j = boxes.length; j--;) {
                router.addPath({src: boxes[i].ports, dst: boxes[j].ports});
            }
            router.move(boxes[i], {x: 600, y: 600});
        }

    });

    it('should connect overlapping boxes', function () {
        var locations = [[100, 100],
                [110, 110],
                [120, 120],
                [130, 130]],
            boxes = utils.addBoxes(locations),
            i,
            j;

        for (i = boxes.length; i--;) {
            for (j = boxes.length; j--;) {
                router.addPath({src: boxes[i].ports, dst: boxes[j].ports});
            }
        }

    });

    it('should connect contained boxes', function () {
        var width = 900,
            height = 900,
            locations = [[100, 100],
                [200, 200],
                [400, 400],
                [4100, 4100],
                [4200, 4200],
                [4400, 4400]],
            boxes = [],
            i;

        // Create big boxes
        for (i = locations.length; i--;) {
            boxes.push(utils.addBox({
                x: locations[i][0],
                y: locations[i][1],
                width: width,
                height: height
            }));

        }

        assert(boxes[0].box.rect.getWidth() === 900);

        // Create normal sized boxes
        for (i = locations.length; i--;) {
            boxes.push(utils.addBox({
                x: locations[i][0],
                y: locations[i][1]
            }));
        }

        utils.connectAll(boxes);
    });

    it('should remove path from graph', function () {
        var box1 = utils.addBox({x: 100, y: 100}),
            box2 = utils.addBox({x: 500, y: 800}),
            path = router.addPath({src: box1.ports, dst: box2.ports});

        router.remove(path);
        assert(router.graph.paths.length === 0);
    });

    it('should connect port to parent box', function () {
        var box = utils.addBox({x: 100, y: 100}),
            port = utils.addBox({x: 110, y: 110, width: 30, height: 30});

        router.setComponent(box, port);
        utils.connectAll([box, port]);
    });

    it('should connect box encircled by other boxes', function () {
        var change = 90,
            min = 100,
            max = 1000,
            diff = 2000,
            x = 400,
            y = 400,
            src = utils.addBox({x: x, y: y}),
            dst = utils.addBox({x: x + diff, y: y + diff});

        // Encircle the src box
        for (y = min, x = min; y < max; y += change) {
            utils.addBox({x: x, y: y});
            utils.addBox({x: max, y: y});
        }

        for (y = min, x = min; x < max; x += change) {
            utils.addBox({x: x, y: y});
            utils.addBox({x: x, y: max});
        }

        utils.connectAll([src, dst]);

        // Encircle the dst box
        min = diff;
        for (y = min, x = min; y < max; y += change) {
            utils.addBox({x: x, y: y});
            utils.addBox({x: max, y: y});
        }

        for (y = min, x = min; x < max; x += change) {
            utils.addBox({x: x, y: y});
            utils.addBox({x: x, y: max});
        }

        router.routeSync();
    });

    it('should allows connections between immediately overlapping boxes', function () {
        var boxes = utils.addBoxes([[100, 100], [100, 100]]);
        utils.connectAll(boxes);
    });

    it('should be able to resize routed boxes', function () {
        var boxes = utils.addBoxes([[100, 100], [300, 300]]),
            newBox = {
                x1: 50,
                y1: 50,
                x2: 300,
                y2: 300,
                ports: [
                    {
                        id: 'top',
                        area: [[60, 60], [290, 60]]
                    },
                    {
                        id: 'bottom',
                        area: [[60, 290], [290, 290]]
                    }
                ]
            };

        utils.connectAll(boxes);

        router.setBoxRect(boxes[0], newBox);
        router.routeSync();
    });

    it('should be able to route asynchronously', function (done) {
        var box1 = utils.addBox({x: 100, y: 100}),
            box2 = utils.addBox({x: 900, y: 900}),
            srcId = Object.keys(box1.ports)[0],
            dstId = Object.keys(box2.ports)[0],

            path;

        router.addPath({src: box1.ports[srcId], dst: box2.ports[dstId]});

        router.routeAsync({
            callback: function (paths) {
                var path = paths[0];
                assert(path.points.length > 2,
                    'Path does not contain enough points to have been routed');
                done();
            }
        });

        // Check that there is a temp path
        path = router.graph.paths[0];
        assert(path, 'Missing path');
        assert(path.points.length >= 2, 'Path missing temporary points');
    });

    it('routeAsync should stop optimizing if path is disconnected', function (done) {
        var boxes = utils.addBoxes([[100, 100], [200, 200], [300, 300]]),
            called = false,
            testFn = function () {
                assert(called, 'Callback (redrawing connections) was not called!');
                done();
            },
            path;

        utils.connectAll(boxes);
        router.routeAsync({
            update: function () {
                path = router.graph.paths[0];
                router.graph.disconnect(path);
            },
            callback: function (/* paths */) {
                called = true;
            }
        });

        setTimeout(testFn, 100);
    });

});
