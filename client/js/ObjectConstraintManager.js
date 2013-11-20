define(['logManager', 'js/NodePropertyNames'], function (logManager, nodePropertyNames) {
  "use strict";

  var self, logger, client;
  var territoryId, toBeValidated;
  
  var ObjectConstraintManager = function(client_) {
    self = this;
    logManager.setLogLevel(logManager.logLevels.INFO);
    logger = logManager.create('ObjectConstraintManager');
    client = client_;
  };

  ObjectConstraintManager.prototype.validateAll = function(id) {
    toBeValidated = id;
    territoryId = client.addUI(this, true);
    client.updateTerritory(territoryId, {root: {'children': Number.MAX_VALUE}});
  };

  ObjectConstraintManager.prototype.validate = function(id) {
    // Validate the node itself..
    var node = client.getNode(id);
    var node_name = node.getAttribute('name');
    logger.info('Validating node: ' + id + ' ' + node_name);

    var constraints = node.getConstraintNames().map(function(constraint_name) {
      var constraint_obj = node.getConstraint(constraint_name);
      constraint_obj.name = constraint_name;
      return constraint_obj;
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
      self.validate(child);
    });
  }

  ObjectConstraintManager.prototype.onOneEvent = function (events) {
    logger.info('Territory is updated, validation begins');
    self.validate(toBeValidated);
    client.removeUI(territoryId);
  }

  return ObjectConstraintManager;
});