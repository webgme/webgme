/*globals describe,it*/
/*
 * brollb
 */

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
// Tests
describe('AutoRouter Misc Tests', function(){
  this.timeout(20000);

  it('Cannot read property of adjustPortAvailability of undefined BUG',function(){
      router = utils.getNewGraph();

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

      for (i = 0; i < boxes.length; i++) {
          console.log(i + ' box id', boxes[i].box.id);
      }

  });

  it('basic model with ports',function() {
      bugPlayer.test('./testCases/basic.js');
  });

  it('bug report 1',function() {
      bugPlayer.test('./testCases/AR_bug_report1422640675165.js');
  });

  // Changed CR3
  it('bug report 2',function() {
    var debug = {
          before: function(router) {
                router._assertPortId2PathIsValid();
          },
          after: function(router) {
                // Call assertValid on every path
                router._assertPortId2PathIsValid();
                options.after(router);
            }
      };
      bugPlayer.test('./testCases/AR_bug_report_2.js');

  });

  it('bug report 3',function() {
      var debug = {
          before: function(router) {
          },
          after: options.after
      };
      bugPlayer.test('./testCases/AR_bug_report1422974690643.js');
  });

  it('bug report 4',function() {
      var debug = {
          verbose: true,
          before: function(router) {
          },
          after: options.after
      };
      bugPlayer.test('./testCases/AR_bug_report1423074120283.js');
  });

  it('bug report 5',function() {
      var debug = {
          verbose: true,
          before: function(router) {
          },
          after: options.after
      };
      bugPlayer.test('./testCases/AR_bug_report1423077073008.js');
  });

});
