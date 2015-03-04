/*globals describe,beforeEach,it*/
/*
 * brollb
 */

// Tests
describe('AutoRouter Misc Tests', function(){
    'use strict';
    var common = require('./autorouter.common.js'),
        assert = common.assert,
        utils = common.webgme,
        ARBugPlayer = require('./autorouter.replay.js'),
        bugPlayer = new ARBugPlayer(),
        router,
        options =
        {
            after: function(router) {
                // Call assertValid on every path
                for (var j = router.graph.paths.length; j--;) {
                    router.graph.paths[j].assertValid();
                }
                router.graph.assertValid();
            }
        };


    utils.getNewGraph = common.getNewGraph;

  beforeEach(function() {
      router = utils.getNewGraph();
  });

  it('Cannot read property of adjustPortAvailability of undefined BUG',function(){
      var updatePorts = function(box) {
          var rect = box.box.rect,
              boxLocation = [rect.left, rect.ceil],
              ports = utils.makeBoxDef(boxLocation).ports;

          for (var i = 0; i < ports.length; i++) {
              router.updatePort(box, ports[i]);
          }
      };

      var boxLocations = [
              [80,160],
              [290,160],
              [610,200],
              [160,360],
              [30,430],
              [250,440],
              [490,330]
          ],
          boxes = [],
          i;

      // Add boxes
      for (i = 0; i < boxLocations.length; i++) {
          boxes.push(utils.makeBox(boxLocations[i]));
      }

      // Update ports ports for boxes... don't actually change anything
      updatePorts(boxes[0]);
      updatePorts(boxes[6]);
  });

  it('candeleteTwoEdgesAt: Utils.isRightAngle(dir) BUG', function(done){
      var boxes = common.addBoxes([[100, 100], [200, 200], [300,300]]),
          path;
      
      common.connectAll(boxes);
      router.routeAsync({
          update: function() {
          },
          callback: function(paths) {
              done();
          }
      });

      path = router.graph.paths[0];
   });
});
