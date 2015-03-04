/*globals describe,beforeEach,it*/
/*
 * brollb
 */


// Tests
describe('AutoRouter Box Tests', function(){
    'use strict';
    var utils = require('./autorouter.common.js'),
        assert = utils.assert,
        router;

  beforeEach(function() {
      router = utils.getNewGraph();
  });

  it('should create connection areas outside the box',function(){
      var boxDef = {x1: 100,
                    x2: 200,
                    y1: 100,
                    y2: 200,
                    ports: [
                       {id: 'top', 
                        area: [ [10, 800], [80, 800] ]}
                    ]};

      var src = router.addBox(boxDef),
          dst = utils.addBox({x: 600, y: 800});
      utils.connectAll([src, dst]);
  });

  it('should create ports outside the box',function(){
      var boxDef = {x1: 100,
                    x2: 200,
                    y1: 100,
                    y2: 200,
                    ports: [
                       {id: 'top', 
                        area: [ [910, 800], [980, 800] ]}
                    ]};

      var src = router.addBox(boxDef),
          dst = utils.addBox({x: 600, y: 800});
      utils.connectAll([src, dst]);
  });

  it('should add new ports to boxes',function(){
      var base = utils.addBox({x: 100, y: 100});
      router.addPort(base, {id: 'newPort',
                            area: [[110, 120], [110, 130]]});
  });

  it('should create subcomponents of a box',function(){
      var base = utils.addBox({x: 100, y: 100});
      var child = utils.addBox({x: 110, y: 110, width: 30, height: 30});
      router.setComponent(base, child);

      // Moving box should also move the child box
      router.move(base, {x: 300, y: 300});

      assert(base.box.rect.left === 300, 
             'Base box did not move!. Expected 300; Actual: '+base.box.left);
      assert(base.box.rect.ceil === 300, 
             'Base box did not move!. Expected 300; Actual: '+base.box.left);
      assert(child.box.rect.left === 310,
             'Child box did not move!. Expected 310; Actual: '+child.box.left);
      assert(child.box.rect.ceil === 310,
             'Child box did not move!. Expected 310; Actual: '+child.box.left);

      // Deleting box should also delete the child box
      router.remove(base);

      assert(utils.getBoxCount() === 0, 
             'Deleting base box did not remove dependent boxes');
  });

  it('should remove port from box',function(){
      var box = utils.addBox({x: 100,
                                y: 100});


      var boxCount = utils.getBoxCount(),
          portIds = Object.keys(box.ports),
          portId = portIds[0],
          portCount = portIds.length,
          boxId = box.box.id;

      router.removePort(box.ports[portId]);

      assert(utils.getBoxCount() === boxCount-1, 'Didn\'t remove the port container');
      assert(Object.keys(box.ports).length === portCount-1, 'Didn\'t remove the port from the box. '+
            'Expected ' + (portCount-1) + ' but got ' + Object.keys(box.ports).length);
      assert(router.graph.boxes[boxId], 'Removing the port also removed the box!');
  });

   it('should create boxes placed on graph',function(){
      var ports = utils.addBox({x: 100,
                                y: 100});

      var boxCount = Object.keys(router.graph.boxes).length;
      assert(boxCount === 3, 'box count should be 3 but is '+boxCount);
  });

   it('should move box on graph',function(){
      var box = utils.addBox({x: 100,
                        y: 100});

      router.move(box, {x: 300, y: 300});
  });

  it('should remove box from graph',function(){
      var box = utils.addBox({x: 100, y: 100});

      router.remove(box);
      var boxCount = Object.keys(router.graph.boxes).length;
      assert(boxCount === 0, 'box count should be 0 but is ' + boxCount);
  });

   it('should be able to resize boxes', function() {
      var box = utils.addBox({x: 100, y: 100});
      var newBox = {x1: 50,
                    y1: 50, 
                    x2: 300,
                    y2: 300,
                    ports: [
                     {id: 'top',
                      area: [ [60, 60], [290, 60]]},
                     {id: 'bottom',
                      area: [ [60, 290], [290, 290]]}
                  ]};
      router.setBoxRect(box, newBox);
  });

});
