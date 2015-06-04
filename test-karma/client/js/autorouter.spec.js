/*globals WebGMEGlobal,requirejs, describe*/
/*jshint node:true, mocha:true*/
/**
 * @author brollb / https://github.com/brollb
 */

// Tests
describe('AutoRouter', function () {
    'use strict';
    var global = {};
    global.WebGMEGlobal = {};

    var utils /*= require('./autorouter.common.js')*/,
        assert/* = utils.assert*/,
        router,
        gmeConfig,
        ARBugPlayer,
        boxUtils,
        bugPlayer;

    this.timeout(20000);

    before(function (done) {
        //WebGMEGlobal.gmeConfig
        requirejs(['text!gmeConfig.json'], function (configTxt) {
            gmeConfig = JSON.parse(configTxt);
            WebGMEGlobal.gmeConfig = gmeConfig;

            requirejs(['karmatest/client/js/AutoRouter/autorouter.common.inc',
                    'karmatest/client/js/AutoRouter/autorouter.replay.inc'],
                function (common, replay) {
                    utils = common;
                    assert = utils.assert;
                    ARBugPlayer = replay;
                    boxUtils = utils.webgme;
                    bugPlayer = new ARBugPlayer();
                    done();
                }
            );
        });
    });

    var replayTests = function () {

        it('basic model with ports', function (done) {
            requirejs(['text!aRtestCases/basic.json'], function (actions) {
                bugPlayer.test(JSON.parse(actions));
                done();
            });
        });

        it.skip('bug report 1', function (done) {
            requirejs(['text!aRtestCases/AR_bug_report1422640675165.json'], function (actions) {
                bugPlayer.test(JSON.parse(actions));
                done();
            });
        });

        // Changed CR3
        it.skip('bug report 2', function (done) {
            requirejs(['text!aRtestCases/AR_bug_report_2.json'], function (actions) {
                bugPlayer.test(JSON.parse(actions));
                done();
            });

        });

        it.skip('bug report 3', function (done) {
            requirejs(['text!aRtestCases/AR_bug_report1422974690643.json'], function (actions) {
                bugPlayer.test(JSON.parse(actions));
                done();
            });
        });

        it.skip('bug report 4', function (done) {
            requirejs(['text!aRtestCases/AR_bug_report1423074120283.json'], function (actions) {
                bugPlayer.test(JSON.parse(actions));
                done();
            });
        });

        it.skip('bug report 5', function (done) {
            requirejs(['text!aRtestCases/AR_bug_report1423077073008.json'], function (actions) {
                bugPlayer.test(JSON.parse(actions));
                done();
            });
        });

        it.skip('bug report 6', function (done) {
            requirejs(['text!aRtestCases/AR_bug_report1423157583206.json'], function (actions) {
                bugPlayer.test(JSON.parse(actions));
                done();
            });
        });

        it('issue/153_overlapping_lines', function (done) {
            // Connection 4 and 6 are about stacked
            requirejs(['text!aRtestCases/issue153.json'], function (actions) {
                var pathIds = ['C_000006', 'C_000004'],
                    startpoints = [],
                    storeFirstPt = function(points) {
                        startpoints.push(points.shift());
                        if (startpoints.length === 2) {
                            assert(startpoints[1].y - startpoints[0].y > 1, 
                                'Paths are virtually overlapping:\n' +
                                startpoints[1] + ' and ' + startpoints[0]);

                            done();
                        }
                    };

                bugPlayer.test(JSON.parse(actions), {}, function() {
                    // Check that the paths are not overlapping
                    bugPlayer.getPathPoints(pathIds[1], function(points) {
                        storeFirstPt(points);
                        bugPlayer.getPathPoints(pathIds[0], storeFirstPt);
                    });
                });
            });
        });

        it('issue/169_autorouter_section_HasBlockedEdge_assert_failure', function (done) {
            requirejs(['text!aRtestCases/issue169.json'], function (actions) {
                bugPlayer.test(JSON.parse(actions));
                done();
            });
        });

        it('issue/186_cannot_read_property_id_of_undefined', function (done) {
            requirejs(['text!aRtestCases/issue186.json'], function (actions) {
                bugPlayer.test(JSON.parse(actions));
                done();
            });
        });

        it('issue/187_short_path_should_be_a_straight_line', function (done) {
            requirejs(['text!aRtestCases/issue187.json'], function (actions) {

                var startpoint,
                    endpoint;

                bugPlayer.test(JSON.parse(actions), {}, function() {
                    bugPlayer.getPathPoints('C_000003', function(points) {
                        startpoint = points.shift();
                        endpoint = points.pop();
                        // Check that the y values of the start/end point of the path are equal
                        assert(startpoint.y === endpoint.y,
                            'Start/end points\' y values should match but are ' + startpoint.y + ' and ' + endpoint.y);

                        done();
                    });
                });
            });
        });

        it('issue/190_box_size_too_small', function (done) {
            requirejs(['text!aRtestCases/issue190.json'], function (actions) {
                bugPlayer.test(JSON.parse(actions));
                done();
            });
        });

        it('issue/288_double_click_on_connection', function (done) {
            requirejs(['text!aRtestCases/issue288.json'], function (actions) {
                bugPlayer.test(JSON.parse(actions));
                done();
            });
        });

        it('creating extra connection segments', function (done) {
            requirejs(['text!aRtestCases/creating_new_custom_points.json'], function (actions) {
                bugPlayer.test(JSON.parse(actions));
                done();
            });
        });

        it('creating extra connection segments (2)', function (done) {
            requirejs(['text!aRtestCases/custom_points2.json'], function (actions) {
                bugPlayer.test(JSON.parse(actions));
                done();
            });
        });

        it('issue/297_custom_points_port_selection', function (done) {
            requirejs(['text!aRtestCases/issue297.json'], function (actions) {
                bugPlayer.test(JSON.parse(actions), {}, function() {
                    // Check that both boxes are connected on their
                    // left side (as it is closest to their next next
                    // point on the custom path)

                    bugPlayer.getPathPoints('C_000002', function(points) {
                        var startpoint = points.shift(),
                            endpoint = points.pop();

                        bugPlayer.getBoxRect('I_000000', function(startbox) {
                            bugPlayer.getBoxRect('I_000001', function(endbox) {
                                assert(Math.abs(startbox.left - startpoint.x) < 2);
                                assert(Math.abs(endbox.left - endpoint.x) < 2);
                                done();
                            });
                        });
                    });
                });

            });
        });

        it('should not move box that doesn\'t exist', function (done) {
            requirejs(['text!aRtestCases/finding_correct_buffer_box.json'], function (actions) {
                bugPlayer.expectedErrors.push(/Box does not exist/);
                bugPlayer.test(JSON.parse(actions), {}, done);
            });
        });

        it('should not contain skew edge w/ async routing', function (done) {
            requirejs(['text!aRtestCases/simplifyPathsbug.json'], function (actions) {
                bugPlayer.test(JSON.parse(actions), {}, function() {
                    bugPlayer.getPathPoints('C_000032', function(points) {
                        // TODO: Add API for executing stuff after routeAsync is done...
                        // utils.validatePoints(points);
                        done();
                    });
                });
            });
        });
    };

    describe('Synchronous tests', function () {

        beforeEach(function () {
            router = utils.getNewGraph();
        });

        describe('basic tests', function () {

            it('issue/306 custom path points should not be rounded', function () {
                var box1 = utils.addBox({x: 100, y: 100}),
                    box2 = utils.addBox({x: 900, y: 900}),
                    srcId = Object.keys(box1.ports)[0],
                    dstId = Object.keys(box2.ports)[0],
                    path;

                router.addPath({src: box1.ports[srcId], dst: box2.ports[dstId]});
                path = router.graph.paths[0].id;

                // Set some points!
                var points = [[894.5, 305.5]];
                router.setPathCustomPoints({
                    path: path,
                    points: points
                });

                router.routeSync();

                // Check the points
                var finalPoints = router.getPathPoints(path).map(function(pt) {
                    return [pt.x, pt.y];
                });
                assert(finalPoints.length === points.length + 2, 'Path missing points: ' + finalPoints);
                for (var i = 1; i < finalPoints.length - 1; i++) {
                    for (var j = 0; j < 2; j++) {
                        assert(points[i - 1][j] === finalPoints[i][j],
                            'Points do not match. Expected ' + points[i - 1][j] +
                            ' but found ' + finalPoints[i][j]);
                    }
                }
            });

            it('should create custom paths', function () {
                var box1 = utils.addBox({x: 100, y: 100}),
                    box2 = utils.addBox({x: 900, y: 900}),
                    srcId = Object.keys(box1.ports)[0],
                    dstId = Object.keys(box2.ports)[0],
                    path;

                router.addPath({src: box1.ports[srcId], dst: box2.ports[dstId]});
                path = router.graph.paths[0].id;

                // Set some points!
                var points = [[200, 200], [700, 700]];
                router.setPathCustomPoints({
                    path: path,
                    points: points
                });

                router.routeSync();

                // Check the points
                var finalPoints = router.getPathPoints(path).map(function(pt) {
                    return [pt.x, pt.y];
                });
                assert(finalPoints.length === points.length + 2, 'Path missing points: ' + finalPoints);
                for (var i = 1; i < finalPoints.length - 1; i++) {
                    for (var j = 0; j < 2; j++) {
                        assert(points[i - 1][j] === finalPoints[i][j],
                            'Points do not match. Expected ' + points[i - 1][j] +
                            ' but found ' + finalPoints[i][j]);
                    }
                }
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

        describe('box tests', function () {

            it('should create connection areas outside the box', function () {
                var boxDef = {
                        x1: 100,
                        x2: 200,
                        y1: 100,
                        y2: 200,
                        ports: [
                            {
                                id: 'top',
                                area: [[10, 800], [80, 800]]
                            }
                        ]
                    },

                    src = router.addBox(boxDef),
                    dst = utils.addBox({x: 600, y: 800});

                utils.connectAll([src, dst]);
            });

            it('should create ports outside the box', function () {
                var boxDef = {
                        x1: 100,
                        x2: 200,
                        y1: 100,
                        y2: 200,
                        ports: [
                            {
                                id: 'top',
                                area: [[910, 800], [980, 800]]
                            }
                        ]
                    },

                    src = router.addBox(boxDef),
                    dst = utils.addBox({x: 600, y: 800});

                utils.connectAll([src, dst]);
            });

            it('should add new ports to boxes', function () {
                var base = utils.addBox({x: 100, y: 100});
                router.addPort(base, {
                    id: 'newPort',
                    area: [[110, 120], [110, 130]]
                });
            });

            it('should create subcomponents of a box', function () {
                var base = utils.addBox({x: 100, y: 100}),
                    child = utils.addBox({x: 110, y: 110, width: 30, height: 30});

                router.setComponent(base, child);

                // Moving box should also move the child box
                router.move(base, {x: 300, y: 300});

                assert(base.box.rect.left === 300,
                    'Base box did not move!. Expected 300; Actual: ' + base.box.left);
                assert(base.box.rect.ceil === 300,
                    'Base box did not move!. Expected 300; Actual: ' + base.box.left);
                assert(child.box.rect.left === 310,
                    'Child box did not move!. Expected 310; Actual: ' + child.box.left);
                assert(child.box.rect.ceil === 310,
                    'Child box did not move!. Expected 310; Actual: ' + child.box.left);

                // Deleting box should also delete the child box
                router.remove(base);

                assert(utils.getBoxCount() === 0,
                    'Deleting base box did not remove dependent boxes');
            });

            it('should remove port from box', function () {
                var box = utils.addBox({
                        x: 100,
                        y: 100
                    }),

                    boxCount = utils.getBoxCount(),
                    portIds = Object.keys(box.ports),
                    portId = portIds[0],
                    portCount = portIds.length,
                    boxId = box.box.id;

                router.removePort(box.ports[portId]);

                assert(utils.getBoxCount() === boxCount - 1, 'Didn\'t remove the port container');
                assert(Object.keys(box.ports).length === portCount - 1, 'Didn\'t remove the port from the box. ' +
                'Expected ' + (portCount - 1) + ' but got ' +
                Object.keys(box.ports).length);
                assert(router.graph.boxes[boxId], 'Removing the port also removed the box!');
            });

            it('should create boxes placed on graph', function () {
                var boxCount;

                utils.addBox({
                    x: 100,
                    y: 100
                });

                boxCount = Object.keys(router.graph.boxes).length;
                assert(boxCount === 3, 'box count should be 3 but is ' + boxCount);
            });

            it('should move box on graph', function () {
                var box = utils.addBox({
                    x: 100,
                    y: 100
                });

                router.move(box, {x: 300, y: 300});
            });

            it('should remove box from graph', function () {
                var box = utils.addBox({x: 100, y: 100}),
                    boxCount;

                router.remove(box);
                boxCount = Object.keys(router.graph.boxes).length;
                assert(boxCount === 0, 'box count should be 0 but is ' + boxCount);
            });

            it('should be able to resize boxes', function () {
                var box = utils.addBox({x: 100, y: 100}),
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

                router.setBoxRect(box, newBox);
            });
        });

        describe('port tests', function () {
            function getPortFromBox(id, box) {
                var portIds = Object.keys(box.ports),
                    portId,
                    port,

                    j;

                for (j = portIds.length; j--;) {
                    portId = portIds[j];
                    if (portId.indexOf(id) !== -1) {
                        port = box.ports[portId];
                    }
                }
                return port;
            }

            it('should start paths on exposed/available regions of the ports', function () {
                var boxes = utils.addBoxes([[100, 100], [125, 125], [1000, 1000]]),
                    src,
                    srcPort,
                    dst,

                    area,
                    path,
                    startpoint,

                    i;

                // Connect bottom port from first box to last box
                for (i = boxes.length; i--;) {
                    if (boxes[i].box.selfPoints[0].x === 100) {
                        src = boxes[i];
                        srcPort = getPortFromBox('bottom', src);
                    } else if (boxes[i].box.selfPoints[0].x === 1000) {
                        dst = boxes[i];
                    }
                }

                assert(!!srcPort, 'Port not found!');
                assert(!!dst, 'Destination box not found!');

                router.addPath({src: srcPort, dst: dst.ports});
                router.routeSync();

                // Verify that the path is not in the overlapped region
                area = srcPort.availableArea[0][1];
                path = router.graph.paths[0];
                startpoint = path.startpoint;

                assert(area.x < 126,
                    'Port available area should be less than 151 but is ' + area.x);

                assert(startpoint.x < 125,
                    'Startpoint should be in the available area of the port');
            });

            it('should reset available port region', function () {
                var box1,
                    box2,
                    port;

                box1 = utils.addBox({x: 100, y: 100});
                port = getPortFromBox('bottom', box1);

                box2 = utils.addBox({x: 150, y: 150});

                // Check that the port has a valid available area
                assert(port.availableArea[0][1].x < 151,
                    'Port available area should be < 151 but is ' + port.availableArea[0][1]);

                // Check that it is reset correctly
                router.remove(box2);
                assert(port.isAvailable(), 'Port is not available when it should be completely available');

            });

            it('should record the port edges on the graph after route', function () {
                var bigBoxDef = {
                        x1: 1000,
                        x2: 2000,
                        y1: 1000,
                        y2: 2000,
                        ports: [
                            {
                                id: 'left',
                                area: [[1000, 1010], [1000, 1020]]
                            }
                        ]
                    },

                    box1 = utils.addBox({x: 100, y: 100}),
                    box2 = router.addBox(bigBoxDef),
                    srcId = Object.keys(box1.ports)[0],
                    dstId = Object.keys(box2.ports)[0],
                    path;

                router.addPath({src: box1.ports[srcId], dst: box2.ports[dstId]});
                path = router.graph.paths[0];

                router.routeSync();

                // Check that the startpoint is still in the startport
                box2.ports[dstId].assertValid();
                box1.ports[srcId].assertValid();
                router.graph.assertValid();
            });

            it('should record portId2Path', function () {
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

                assert(router.portId2Path[srcId].out.length > 0,
                    'Path did not record the portId2Path');

                assert(router.portId2Path[dstId].in.length > 0,
                    'Path did not record the portId2Path');
            });

            it('should update port', function () {
                var box1 = utils.addBox({x: 100, y: 100}),
                    box2 = utils.addBox({x: 900, y: 900}),
                    srcId = Object.keys(box1.ports)[0],
                    dstId = Object.keys(box2.ports)[0],
                    path,

                    newPortDef,
                    newPort;

                router.addPath({src: box1.ports[srcId], dst: box2.ports[dstId]});
                path = router.graph.paths[0];

                router.routeSync();
                assert(path.points.length > 2,
                    'Path does not contain enough points to have been routed');

                assert(router.portId2Path[srcId].out.length > 0,
                    'Path did not record the portId2Path');
                // Update a port and verify the path uses the updated port
                newPortDef = {
                    id: srcId,
                    area: [[100, 110], [100, 190]]
                };

                newPort = router.updatePort(box1, newPortDef);

                assert(path.startports.indexOf(newPort) !== -1,
                    'Path did not update to use new port');
            });

            it('should be able to remove point', function () {
                var box1 = utils.addBox({x: 100, y: 100}),
                    box2 = utils.addBox({x: 900, y: 900}),
                    dstId = Object.keys(box2.ports)[0],
                    port,
                    path,

                    points,
                    point,
                    s,
                    p;

                router.addPath({src: box1.ports, dst: box2.ports[dstId]});
                path = router.graph.paths[0];
                router.routeSync();
                port = path.startport;
                assert(port.getPointCount() === 1, 'Port does not have correct number of ports. Has ' +
                port.getPointCount() + ' expected 1.');

                // Get the point
                points = port.points;

                for (s = points.length; s--;) {
                    for (p = points[s].length; p--;) {
                        point = points[s][p];
                    }
                }

                // destroy removes all points, etc
                // in practice, it shouldn't be called this way
                port.destroy();
                assert(port.getPointCount() === 0, 'Port does not have correct number of ports. Has ' +
                port.getPointCount() + ' expected 0.');

                assert(path.startports.indexOf(port) === -1,
                    'Port was not removed from path startports (' + path.startports + ')');
                assert(!path.isConnected(), 'Path should be disconnected after removing startpoint');
            });
        });

        describe('misc tests', function () {

            it('Cannot read property of adjustPortAvailability of undefined BUG', function () {
                var updatePorts = function (box) {
                        var rect = box.box.rect,
                            boxLocation = [rect.left, rect.ceil],
                            ports = boxUtils.makeBoxDef(boxLocation).ports,
                            i;

                        for (i = 0; i < ports.length; i++) {
                            router.updatePort(box, ports[i]);
                        }
                    },

                    boxLocations = [
                        [80, 160],
                        [290, 160],
                        [610, 200],
                        [160, 360],
                        [30, 430],
                        [250, 440],
                        [490, 330]
                    ],
                    boxes = [],
                    i;

                // Add boxes
                for (i = 0; i < boxLocations.length; i++) {
                    boxes.push(boxUtils.makeBox(boxLocations[i]));
                }

                // Update ports ports for boxes... don't actually change anything
                updatePorts(boxes[0]);
                updatePorts(boxes[6]);
            });

            it('candeleteTwoEdgesAt: Utils.isRightAngle(dir) BUG', function (done) {
                var boxes = utils.addBoxes([[100, 100], [200, 200], [300, 300]]),
                    path;

                utils.connectAll(boxes);
                router.routeAsync({
                    update: function () {
                    },
                    callback: function (/* paths */) {
                        done();
                    }
                });

                path = router.graph.paths[0];
            });
        });

    });

    describe('Replay tests', function() {
        describe('Standard', function () {
            // Set up the Autorouter as a web worker
            before(function() {
                bugPlayer.useWebWorker(false);
            });
            describe('Tests', replayTests);
        });

        describe.skip('Web Worker', function () {
            // Set up the Autorouter as a web worker
            before(function() {
                bugPlayer.useWebWorker(true);
            });
            describe('Tests', replayTests);
        });
    });

    describe('Utility Fn tests', function () {
        var arUtils;

        before(function(done) {
            requirejs(['js/Widgets/DiagramDesigner/AutoRouter.Utils'], function (Utils) {
                arUtils = Utils;
                done();
            });
        });
        describe('toArray tests', function () {
            it('should convert array like objects to array', function() {
                var obj = {0: 'd', 1: 'a', 2: 'b', 3: 'c', length: 4},
                    array = arUtils.toArray(obj);

                assert(array instanceof Array);
                assert(array.length === 4, 'Array length should be 4 but is '+array.length);

                for (var i = array.length; i--;) {
                    assert(obj[i] === array[i]);
                }
            });

            it('should stop conversion when index is missing', function() {
                var obj = {0: 'd', 1: 'a', 2: 'b', 7: 'c', length: 3},
                    array = arUtils.toArray(obj);

                assert(array instanceof Array);
                assert(array.length === 3);

                for (var i = array.length; i--;) {
                    assert(obj[i] === array[i]);
                }
            });

            it('should return [] for non array like things', function() {
                var obj = {1: 'a', 2: 'b', 7: 'c'},
                    array = arUtils.toArray(obj);

                assert(array instanceof Array);
                assert(array.length === 0);
            });
        });

        describe('deepCopy tests', function () {
            it('should copy nested arrays', function() {
                var inner = [0,1],
                    array = [0, inner],
                    result = arUtils.deepCopy(array);

                inner.pop();
                assert(result[1].length === 2, 
                    'Nested array should have length 2 but has length: '+result[1].length);
            });
        });

        describe('floatEquals tests', function () {
            it('should return true for 8, 8.09', function() {
                assert(arUtils.floatEquals(8, 8.09));
            });

            it('should return true for 108.94, 109', function() {
                assert(arUtils.floatEquals(108.94, 109));
            });

            it('should return false for 8, 8.1', function() {
                assert(!arUtils.floatEquals(8, 8.1));
            });

            it('should return false for 108.9, 109', function() {
                assert(!arUtils.floatEquals(108.9, 109));
            });

            it('should return true for 109, 109', function() {
                assert(arUtils.floatEquals(109, 109));
            });

            it('should return false for 108, 109', function() {
                assert(!arUtils.floatEquals(108, 109));
            });
        });

        describe('roundTrunc tests', function () {
            it('should round 10.999999 to 10.9', function() {
                assert(arUtils.roundTrunc(10.999999, 1) === 10.9);
            });

            it('should round 10.90000001 to 10.9', function() {
                assert(arUtils.roundTrunc(10.90000001, 1) === 10.9);
            });

            it('should round -10.90000001 to -10.9', function() {
                assert(arUtils.roundTrunc(-10.90000001, 1) === -10.9);
            });

            it('should round -10.9999 to -10.9', function() {
                assert(arUtils.roundTrunc(-10.9999, 1) === -10.9);
            });

            it('should round -10.9999 to -10.99', function() {
                assert(arUtils.roundTrunc(-10.9999, 2) === -10.99);
            });

            it('should round 10.9999 to 10.99', function() {
                assert(arUtils.roundTrunc(10.9999, 2) === 10.99);
            });
        });
    });
});
