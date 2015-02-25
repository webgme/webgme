/*globals require,describe,it*/
/*
 * brollb
 */

var common = require('./autorouter.common.js'),
    assert = common.assert,
    utils = common.webgme,
    ARBugPlayer = require('./autorouter.replay.js'),
    bugPlayer = new ARBugPlayer(),
    options = 
      {
          after: function(router) {
                'use strict';
                // Call assertValid on every path
                for (var j = router.graph.paths.length; j--;) {
                    router.graph.paths[j].assertValid();
                }
                router.graph.assertValid();
            }
      },
      debug = {
          verbose: true,
          before: function(router) {
                'use strict';
                router._assertPortId2PathIsValid();
          },
          after: function(router) {
                'use strict';
                // Call assertValid on every path
                router._assertPortId2PathIsValid();
                options.after(router);
          }
      };


utils.getNewGraph = common.getNewGraph;
// Tests
describe('AutoRouter Test Cases', function(){
  'use strict';
  this.timeout(20000);

  it('basic model with ports',function() {
      bugPlayer.test('./testCases/basic.js');
  });

  it('bug report 1',function() {
      bugPlayer.test('./testCases/AR_bug_report1422640675165.js');
  });

  // Changed CR3
  it('bug report 2',function() {
      bugPlayer.test('./testCases/AR_bug_report_2.js');

  });

  it('bug report 3',function() {
      bugPlayer.test('./testCases/AR_bug_report1422974690643.js');
  });

  it('bug report 4',function() {
      bugPlayer.test('./testCases/AR_bug_report1423074120283.js');
  });

  it('bug report 5',function() {
      bugPlayer.test('./testCases/AR_bug_report1423077073008.js');
  });

  it('bug report 6',function() {
      bugPlayer.test('./testCases/AR_bug_report1423157583206.js');
  });

  it('issue/153_overlapping_lines',function() {
      // Connection 4 and 6 are about stacked
      var pathIds = ['C_000006', 'C_000004'];
      bugPlayer.test('./testCases/issue153.js');

      // Check that they are not overlapping
      var startpoints = [],
          id;

      for (var i = pathIds.length; i--;) {
          id = bugPlayer._autorouterPaths[pathIds[i]];
          startpoints.push(bugPlayer.autorouter.paths[id].startpoint);
      }

      assert(startpoints[1].y - startpoints[0].y > 1, 'Paths are virtually overlapping:\n'+
          startpoints[1] + ' and '+startpoints[0]);
  });

  it('issue/169_autorouter_section_HasBlockedEdge_assert_failure',function() {
      bugPlayer.test('./testCases/issue169.js');
  });

  it('issue/186_cannot_read_property_id_of_undefined',function() {
      bugPlayer.test('./testCases/issue186.js');
  });

});

