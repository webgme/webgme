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
          validate: function(player) {
                // Call assertValid on every path
                for (var j = player.autorouter.graph.paths.length; j--;) {
                    player.autorouter.graph.paths[j].assertValid();
                }
            }
      };


utils.getNewGraph = common.getNewGraph;
// Tests
describe('AutoRouter Misc Tests', function(){

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

  it('basic model with ports',function(){
      bugPlayer.test('./testCases/test.js');
  });

  it('bug report 1422640675165',function(){
      bugPlayer.test('./testCases/AR_bug_report1422640675165.js');
  });

  it('bug report 1422644247555',function(){
      bugPlayer.test('./testCases/AR_bug_report1422644247555.js', options);
  });

  it.only('bug report 1422652852583',function(){
      bugPlayer.test('./testCases/AR_bug_report1422652852583.js', options);
  });

});
