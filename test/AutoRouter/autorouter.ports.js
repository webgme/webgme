/*globals describe,it*/
'use strict';

var utils = require('./autorouter.common.js'),
    assert = utils.assert;

describe('AutoRouter Port Tests', function() {

  it('should start paths on exposed/available regions of the ports', function(){
      var router = utils.getNewGraph(),
          boxes = utils.addBoxes([[100,100], [150,150], [1000, 1000]]),
          src,
          srcPort,
          portIds,
          portId,
          dst;

      // Connect bottom port from first box to last box
      for (var i = boxes.length; i--;) {
          if (boxes[i].box.selfPoints[0].x === 100) {
              src = boxes[i];
              portIds = Object.keys(src.ports);
              console.log('ports:', portIds);
              for (var j = portIds.length; j--;) {
                  portId = portIds[j];
                  if (portId.indexOf('bottom') !== -1) {
                      srcPort = src.ports[portId];
                  }
              }
          } else if (boxes[i].box.selfPoints[0].x === 1000) {
              dst = boxes[i];
          }
      }

      assert (!!srcPort, 'Port not found!');
      assert (!!dst, 'Destination box not found!');

      router.addPath({src: srcPort, dst: dst.ports});
      router.routeSync();

      // Verify that the path is not in the overlapped region
      var area = srcPort.availableArea[0][1],
          path = router.graph.paths[0],
          startpoint = path.startpoint;

      assert(area.x < 151, 
            'Port available area should be less than 151 but is ' + area.x);

      assert(startpoint.x < 151, 
            'Startpoint should be in the available area of the port');
  });

  it('should reset available port region', function(){
      assert(false, 'Need to write this test!');
  });

  it('should record portId2Path', function(){
      var router = utils.getNewGraph();

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

  it('should update port', function(){
      var router = utils.getNewGraph();

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
      // Update a port and verify the path uses the updated port
      var newPortDef = {id: srcId, 
                        area: [ [100, 110], [100, 190]]},
          newPort;

      newPort = router.updatePort(box1, newPortDef);

      // Check the path
      console.log('Startports ids:');
      for (var i = path.startports.length; i--;) {
          console.log(path.startports[i].id,':\n', path.startports[i]);
      }

      console.log('checking for', newPort.id, ':\n', newPort);
      assert(path.startports.indexOf(newPort) !== -1, 
             'Path did not update to use new port');
  });

  it('should be able to remove point', function(){
      var router = utils.getNewGraph();

      var box1 = utils.addBox({x: 100, y: 100}),
          box2 = utils.addBox({x: 900, y: 900}),
          srcId = Object.keys(box1.ports)[0],
          dstId = Object.keys(box2.ports)[0],
          port,
          path;

      router.addPath({src: box1.ports, dst: box2.ports[dstId]});
      path = router.graph.paths[0];
      router.routeSync();
      port = path.startport;
      assert(port.getPointCount() === 1, 'Port does not have correct number of ports. Has '+
             port.getPointCount()+' expected 1.');

      // Get the point
      var points = port.points,
          point;

      for (var s = points.length; s--;) {
          for (var p = points[s].length; p--;) {
              point = points[s][p];
          }
      }

      // destroy removes all points, etc
      // in practice, it shouldn't be called this way
      port.destroy();
      assert(port.getPointCount() === 0, 'Port does not have correct number of ports. Has '+
             port.getPointCount()+' expected 0.');

      assert(path.startports.indexOf(port) === -1, 
            'Port was not removed from path startports ('+path.startports+')');
      assert(!path.isConnected(), 'Path should be disconnected after removing startpoint');
  });

 
});
