define(['logManager', 'js/NodePropertyNames', 'text!./ConstraintManager.html'], 
  function (logManager, nodePropertyNames, constraintManagerDialogTemplate) {
  
  "use strict";

  var self, logger, client;
  var territoryId, selfPatterns, toBeValidated;
  var constraintManagerDialog;

  var ConstraintManager = function(client_) {
    self = this;
    logManager.setLogLevel(logManager.logLevels.INFO);
    logger = logManager.create('ConstraintManager');
    client = client_;
    constraintManagerDialog = $(constraintManagerDialogTemplate);
  };

  ConstraintManager.prototype.validateAll = function(id) {
    constraintManagerDialog.modal('show');
    toBeValidated = id;
    territoryId = client.addUI(this, true);
    selfPatterns = {};
    selfPatterns[id] = { children: Number.MAX_VALUE };
    client.updateTerritory(territoryId, selfPatterns);
  };

  ConstraintManager.prototype.validate = function(id) {
    // Validate the node itself..
    var node = client.getNode(id);
    var node_name = node.getAttribute('name');
    // logger.info('Validating node: ' + id + ' ' + node_name);

    var constraints = node.getConstraintNames().map(function(constraint_name) {
      var constraint_obj = node.getConstraint(constraint_name);
      constraint_obj.name = constraint_name;
      return constraint_obj;
    }).sort(function(a, b) {
      return a.priority - b.priority;
    });

    var flag = false;
    constraints.forEach(function(constraint) {
      if (flag) return;
      var result = eval("(" + constraint.script + ")(client, node);");
      var msg = '[[ <' + constraint.name + '> of <' + node_name + '> ]]';
      if (result) {
          logger.info('No violation of a constraint: ' + msg);
          // alert('No violation of a constraint: ' + msg);
      } else {
          logger.error('!!Violation of a constraint: ' + msg + "!!!");
          if ( constraint.priority == 0) {
            logger.error('This is a serious error, please fix it first to run'
              + ' remaining constraints, if there are any');
            flag = true;
          }
          // alert('!!Violation of a constraint: ' + msg + "!!!");
      }
    });

    if (flag) {
      logger.warning('no more validation');
    }


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

  ConstraintManager.prototype.onOneEvent = function (events) {
    logger.info('Territory is updated, validation begins');
    self.validate(toBeValidated);
    client.removeUI(territoryId);
  }

  return ConstraintManager;
});