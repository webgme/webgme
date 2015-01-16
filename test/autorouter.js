/*globals describe,it*/
/*
 * brollb
 */

'use strict';
var requirejs = require('requirejs');

requirejs.config({
  baseUrl: '../src/',
  paths:{
    "logManager": "common/LogManager",
    "util/assert": "common/util/assert"
  }
});

var AutoRouter = requirejs('client/js/Widgets/DiagramDesigner/AutoRouter'),
    assert = requirejs('util/assert'),
    router;

// Set up helpers
var connectAll = function(boxes) {
    for (var i = boxes.length; i--;) {
        for (var j = boxes.length; j--;) {
            router.addPath({src: boxes[i].ports, dst: boxes[j].ports});
        }
    }

    router.autoroute();
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
                  ConnectionInfo: [
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
    return Object.keys(router.router.boxes).length;
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


// Tests
describe('AutoRouter Tests',function(){

  it('should create boxes placed on graph',function(){
      router = new AutoRouter();
      addBox({x: 100,
              y: 100});

      var boxCount = Object.keys(router.router.boxes).length;
      assert(boxCount === 1);
  });

  it('should move box on graph',function(){
      router = new AutoRouter();
      var box = addBox({x: 100,
                        y: 100});

      router.move(box, {x: 300, y: 300});
  });

  it('should remove box from graph',function(){
      router = new AutoRouter();
      var box = addBox({x: 100,
                        y: 100});

      router.remove(box);
      var boxCount = Object.keys(router.router.boxes).length;
      assert(boxCount === 0);
  });

  it('should detect bracket opening',function(){
      router = new AutoRouter();

      var box1 = addBox({x: 100, y: 100});
      var box2 = box1;
      connectAll([box1, box2]);
      
      // Check that the graph contains an edge that is bracket closing or opening
      var hasBracketOpeningOrClosing = false;
      var testFn = function(edge) {
          return edge.bracketOpening || edge.bracketOpening || edge.bracket_closing || edge.bracket_opening;
      };
      hasBracketOpeningOrClosing = evaluateEdges(router.router.horizontal, testFn) ||
                                   evaluateEdges(router.router.vertical, testFn);

      assert(hasBracketOpeningOrClosing, 'Did not detect bracket opening/closing');
  });

  it('should remove port from box',function(){
      router = new AutoRouter();
      throw new Error('Need to make this test');
  });

  it('should connect two boxes',function(){
      router = new AutoRouter();

      var box1 = addBox({x: 100, y: 100});
      var box2 = addBox({x: 500, y: 800});
      connectAll([box1, box2]);
  });

  it('should connect multiple boxes',function(){
      router = new AutoRouter();
      var locations = [[100,100],
                       [500,300],
                       [300,300]],
          boxes = addBoxes(locations),
          i,
          j;

      connectAll(boxes);
  });

  it('should move connected boxes',function(){
      router = new AutoRouter();
      var locations = [[100,100],
                       [500,800],
                       [500,300],
                       [300,300]],
          boxes = addBoxes(locations),
          i,
          j;

      for (i = boxes.length; i--;) {
          for (j = boxes.length; j--;) {
              router.addPath({src: boxes[i].ports, dst: boxes[j].ports});
          }
          router.move(boxes[i], {x: 600, y: 600});
      }

  });

  it('should connect overlapping boxes',function(){
      router = new AutoRouter();
      var locations = [[100,100],
                       [110,110],
                       [120,120],
                       [130,130]],
          boxes = addBoxes(locations),
          i,
          j;

      for (i = boxes.length; i--;) {
          for (j = boxes.length; j--;) {
              router.addPath({src: boxes[i].ports, dst: boxes[j].ports});
          }
      }

  });

  it('should connect contained boxes',function(){
      router = new AutoRouter();
      var width = 900,
          height = 900,
          locations = [[100,100], 
                       [200, 200], 
                       [400, 400],
                       [4100, 4100],
                       [4200, 4200],
                       [4400, 4400]],
          boxes = [],
          i,
          j;

      // Create big boxes
      for (i = locations.length; i--;) {
          boxes.push(addBox({x: locations[i][0],
                             y: locations[i][1],
                             width: width,
                             height: height}));
        
      }

      assert(boxes[0].box.rect.getWidth() === 900);

      // Create normal sized boxes
      for (i = locations.length; i--;) {
          boxes.push(addBox({x: locations[i][0],
                             y: locations[i][1]}));
      }

      connectAll(boxes);
  });

  it('should remove path from graph',function(){
      router = new AutoRouter();

      var box1 = addBox({x: 100, y: 100});
      var box2 = addBox({x: 500, y: 800});
      var path = router.addPath({src: box1.ports, dst: box2.ports});
      router.remove(path);
      assert(router.router.paths.length === 0);
  });

  it('should create ports outside the box',function(){
      router = new AutoRouter();
      var box = addBox({x: 100, y: 100});
      var port = addBox({x: 110, y: 110, width: 30, height: 30});
      router.setComponent(box, port);
  });

  it('should connect port to parent box',function(){
      router = new AutoRouter();
      var box = addBox({x: 100, y: 100});
      var port = addBox({x: 110, y: 110, width: 30, height: 30});
      router.setComponent(box, port);
      connectAll([box, port]);
  });

  it('should connect box encircled by other boxes',function(){
      router = new AutoRouter();
      var locations = [],
          change = 90,
          min = 100,
          max = 1000,
          diff = 2000,
          x = 400,
          y = 400,
          src = addBox({x: x, y: y}),
          dst = addBox({x: x+diff, y: y+diff});

      // Encircle the src box
      for (y = min, x = min; y < max; y += change) {
          addBox({x: x, y: y});
          addBox({x: max, y: y});
      }

      for (y = min, x = min; x < max; x += change) {
          addBox({x: x, y: y});
          addBox({x: x, y: max});
      }

      connectAll([src, dst]);

      // Encircle the dst box
      min = diff;
      for (y = min, x = min; y < max; y += change) {
          addBox({x: x, y: y});
          addBox({x: max, y: y});
      }

      for (y = min, x = min; x < max; x += change) {
          addBox({x: x, y: y});
          addBox({x: x, y: max});
      }

      router.autoroute();
  });

  it('should create connection areas outside the box',function(){
      router = new AutoRouter();

      var boxDef = {x1: 100,
                    x2: 200,
                    y1: 100,
                    y2: 200,
                    ConnectionInfo: [
                       {id: 'top', 
                        area: [ [10, 10], [80, 80] ]}
                    ]};

      router.addBox(boxDef);
  });

  it('should allows connections between immediately overlapping boxes',function(){
      router = new AutoRouter();
      var boxes = addBoxes([[100,100], [100,100]]);
      connectAll(boxes);
  });

  it('should select correct port',function(){
      assert(false, 'Need to make this test!');
  });

});

// Tests for the autorouter
//  - changing the size of boxes
//  - should 
//  - changing the size of ports
//  - maze
//  - remove ports
//
//  - Boxes
//    - move propogates to children
//    - add/remove port
//
//  - Ports
//    - port available area
//      - adjust
//      - clear
