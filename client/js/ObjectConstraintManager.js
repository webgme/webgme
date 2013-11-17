define(['logManager', 'js/NodePropertyNames'], function (logManager, nodePropertyNames) {
  "use strict";

  var logger, client;
  
  var ObjectConstraintManager = function(client_) {
    logManager.setLogLevel(logManager.logLevels.INFO);
    logger = logManager.create('ObjectConstraintManager');
    client = client_;
  };

  ObjectConstraintManager.prototype.validateAll = function(id) {

    validate(id);

    function validate (id) {

      // Validate the node itself..
      var node = client.getNode(id);
      var node_name = node.getAttribute('name');
      logger.info('Validating node: ' + id + ' ' + node_name);

      var constraints = [];
      var constraint_names = node.getConstraintNames();
      constraint_names.forEach(function(constraint_name) {
        var constraint_obj = node.getConstraint(constraint_name);
        constraint_obj.name = constraint_name;
        constraints.push(constraint_obj);
      });

      constraints.forEach(function(constraint) {

        var result = eval("(" + constraint.script + ")(client, node);");

        var msg = '[[ <' + constraint.name + '> of <' + node_name + '> ]]';
        if (result) {
            logger.info('No violation of a constraint: ' +
              msg);
        } else {
            logger.error('!!Violation of a constraint: ' +
              msg + "!!!");
        }

      });

      // var y = function(input, callback) {
      //   //
      //   callback(withsomething);
      // }

      // Call validation for the node's children
      var children = node.getChildrenIds();
      children.forEach(function(child) {
        validate(child);
      });

    }

  };

  return ObjectConstraintManager;
});