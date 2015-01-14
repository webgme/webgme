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
    router;

// Test example
describe('AutoRouter Tests',function(){

  it('should create boxes placed on graph',function(){
      router = new AutoRouter();

      var boxDef = {x1: 100,
                    x2: 200,
                    y1: 100,
                    y2: 200,
                    ConnectionInfo: [
                       {id: 'top', 
                        area: [ [110, 110], [180, 180] ]}
                    ]};


      router.addBox(boxDef);
  });

  it('Moving box on graph',function(){
      router = new AutoRouter();

      var boxDef = {x1: 100,
                    x2: 200,
                    y1: 100,
                    y2: 200,
                    ConnectionInfo: [
                       {id: 'top', 
                        area: [ [110, 110], [180, 180] ]}
                    ]};

      var box = router.addBox(boxDef);
      router.move(box, {x: 300, y: 300});
  });

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
//  - basic connections
//  - basic overlapping
//  - boxes are exactly double the buffer width apart
//  - encompassed circle
//  - maze
//  - port outside the box
//  - box's connection area outside the box
//  - box connected to itself
//  - boxes directly on top of each other (connected to each other)
