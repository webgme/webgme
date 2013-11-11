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
      var node_name = node.getAttribute('name');
      
      // find if the node has a Constraint Object
      // and collect them in a constraints array
      var constraints = [];

      var children = node.getChildrenIds();
      children.forEach(function(child) {
        var child_node = client.getNode(child);
        var child_name = child_node.getAttribute('name');
        if (child_name == 'Constraints') {
          var grandchildren = child_node.getChildrenIds();
          grandchildren.forEach(function(grandchild) {
            var grandchild_node = client.getNode(grandchild);
            var grandchild_name = grandchild_node.getAttribute('name');
            var constraint = grandchild_node.getAttribute(nodePropertyNames.Attributes.OCLConstraint);
            if ( constraint !== undefined || constraint !== "" ) {
              var constraint_obj = {
                node_name: node_name,
                name: grandchild_name,
                constraint: constraint
              };
              constraints.push(constraint_obj);
            }
          });
        }
      });

      constraints.forEach(function(constraint) {

        var result = eval("(" + constraint.constraint + ")();");

        var msg = '[[ <' + constraint.name + '> of <' + constraint.node_name + '> ]]';
        if (result) {
            logger.warn('No violation of a constraint: ' +
              msg);
        } else {
            logger.warn('!!Violation of a constraint: ' +
              msg + "!!!");
        }

      });

      // Call validation for the node's children
      var children = node.getChildrenIds();
      children.forEach(function(child) {
        validate(child);
      });

    }

  };

  return ObjectConstraintManager;
});