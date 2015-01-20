'use strict';

var requirejs = require('requirejs');

requirejs.config({
  baseUrl: '../../src/',
  paths:{
    "logManager": "common/LogManager",
    "util/assert": "common/util/assert"
  }
});

var AutoRouter = requirejs('client/js/Widgets/DiagramDesigner/AutoRouter'),
    assert = requirejs('util/assert'),
    router;

// Set up helpers
var getNewGraph = function() {
    return router = new AutoRouter();
};

var connectAll = function(boxes) {
    for (var i = boxes.length; i--;) {
        for (var j = boxes.length; j--;) {
            router.addPath({src: boxes[i].ports, dst: boxes[j].ports});
        }
    }

    router.routeSync();
};

var addBox = function(options) {
    var x = options.x,
        y = options.y,
        width = options.width || 100,
        height = options.height || 100,
        boxDef = {x1: x,
                  x2: x+width,
                  y1: y,
                  y2: y+height,
                  ports: [
                      {id: 'top',
                       area: [ [x+10, y+10], [x+width-10, y+10]]},
                      {id: 'bottom',
                       area: [ [x+10, y+height-10], [x+width-10, y+height-10]]}
                  ]};
    return router.addBox(boxDef);
};

var addBoxes = function(locations) {
      var boxes = [],
          i;

      for (i = locations.length; i--;) {
          boxes.push(addBox({x: locations[i][0], 
                             y: locations[i][1]}));
      }

      return boxes;
};

var getBoxCount = function() {
    return Object.keys(router.graph.boxes).length;
};

// Validation Helpers
var evaluateEdges = function(edges, fn) {
      var edge = edges.order_first;
      var result = false;
      while (edge && !result) {
          result = fn(edge);
          edge = edge.order_next || edge.orderNext;
      }
   
    return result;
};

module.exports = {
    getNewGraph: getNewGraph,
    addBox: addBox,
    connectAll: connectAll,
    addBoxes: addBoxes,
    getBoxCount: getBoxCount,
    evaluateEdges: evaluateEdges,
    assert: assert
};
