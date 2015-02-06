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

  it('bug report 6',function() {
      var debug = {
          verbose: true,
          before: function(router) {
          }
      };
      bugPlayer.test('./testCases/AR_bug_report1423157583206.js');
  });

});
