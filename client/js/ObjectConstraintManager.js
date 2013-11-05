define(['logManager'], function (logManager) {
  "use strict";

  var logger, client;
  
  var ObjectConstraintManager = function(client_) {
    logger = logManager.create('ObjectConstraintManager');
    client = client_;
  };

  ObjectConstraintManager.prototype.validateAll = function() {
    var root = client.getNode("root");
    console.dir(root);
  };

  return ObjectConstraintManager;
});