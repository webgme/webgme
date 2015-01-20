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
          portId,
          dst;

      // Connect bottom port from first box to last box
      for (var i = boxes.length; i--;) {
          if (boxes[i].box.selfPoints[0].x === 100) {
              src = boxes[i];
              for (var j = src.ports.length; j--;) {
                  portId = src.ports[j].id;
                  if (portId.indexOf('bottom') !== -1) {
                      srcPort = src.ports[j];
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

});
