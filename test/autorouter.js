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

// Test example
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

  it('should connect two boxes',function(){
      router = new AutoRouter();

      var box1 = addBox({x: 100, y: 100});
      var box2 = addBox({x: 500, y: 800});
      router.addPath({src: box1.ports, dst: box2.ports});
  });

  it('should connect multiple boxes',function(){
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
      }
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

    it('should remove path from graph',function(){
      router = new AutoRouter();

      var box1 = addBox({x: 100, y: 100});
      var box2 = addBox({x: 500, y: 800});
      var path = router.addPath({src: box1.ports, dst: box2.ports});
      router.remove(path);
      assert(router.router.paths.length === 0);
  });

  // TODO Add this feature
  //it('should create ports outside the box',function(){
      //router = new AutoRouter();

      //var boxDef = {x1: 100,
                    //x2: 200,
                    //y1: 100,
                    //y2: 200,
                    //ConnectionInfo: [
                       //{id: 'top', 
                        //area: [ [10, 10], [80, 80] ]}
                    //]};

      //router.addBox(boxDef);
  //});

});

// Tests for the autorouter
//  - basic overlapping
//  - boxes are exactly double the buffer width apart
//  - encompassed circle
//  - maze
//  - port outside the box
//  - box's connection area outside the box
//  - box connected to itself
//  - boxes directly on top of each other (connected to each other)
