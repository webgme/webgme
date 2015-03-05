/*globals require*/
/*jshint node:true, mocha:true*/
/**
 * @author brollb / https://github.com/brollb
 */

describe('AutoRouter Port Tests', function () {
    'use strict';

    var utils = require('./autorouter.common.js'),
        assert = utils.assert,
        router,

        getPortFromBox = function (id, box) {
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
        };

    beforeEach(function () {
        router = utils.getNewGraph();
    });

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
            srcId = Object.keys(box1.ports)[0], // FIXME: not used
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
