define(['logManager', 'js/NodePropertyNames'], function (logManager, nodePropertyNames) {
  "use strict";

  var logger, client;
  
  var ObjectConstraintManager = function(client_) {
    logger = logManager.create('ObjectConstraintManager');
    client = client_;
  };

  ObjectConstraintManager.prototype.validateAll = function(id) {

    validate(id);

    function validate (id) {

      // Validate the node itself..
      logger.info("Validating node: " + id);
      var node = client.getNode(id);
      var constraint = node.getAttribute(nodePropertyNames.Attributes.OCLConstraint);
      if ( constraint !== undefined && constraint !== "" ) {
        var result = eval("(" + constraint + ")();");
        if (result) {
            logger.warn('No Validation');
        } else {
            logger.warn('!!Validation!!!');
        }
      }

      // Call validation for the node's children
      var children = node.getChildrenIds();
      children.forEach(function(child) {
        validate(child);
      });

    }

  };

  return ObjectConstraintManager;
});