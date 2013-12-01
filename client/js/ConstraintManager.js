define(['logManager', 'js/NodePropertyNames', 'text!./ConstraintManager.html'], 
  function (logManager, nodePropertyNames, constraintManagerDialogTemplate) {
  
  "use strict";

  var self, logger, client;
  var territoryId, selfPatterns, toBeValidated;
  var constraintManagerDialog;
  var $cmb;

  var ConstraintManager = function(client_) {
    self = this;
    logManager.setLogLevel(logManager.logLevels.INFO);
    logger = logManager.create('ConstraintManager');
    client = client_;
    constraintManagerDialog = $(constraintManagerDialogTemplate);
    constraintManagerDialog.on('hidden', function() {
      $cmb.html('');
    });
  };

  ConstraintManager.prototype.validateAll = function(id) {

    constraintManagerDialog.one('shown', function () {
      toBeValidated = id;
      territoryId = client.addUI(self, true);
      selfPatterns = {};
      selfPatterns[id] = { children: Number.MAX_VALUE };
      $cmb = $("#ConstraintModalBody");
      client.updateTerritory(territoryId, selfPatterns);
    });
    constraintManagerDialog.modal('show');

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

    if (constraints.length == 0 ) {
      create_alert('There are no constraints to run on <strong>{' +
        node_name + '}</strong>', 'alert-success').appendTo($cmb);
    }

    var flag = false;
    constraints.forEach(function(constraint) {
      if (flag) return;
      var result = eval("(" + constraint.script + ")(client, node);");

      var msg = '<strong>{' + node_name  + ' ' + constraint.name+ '}</strong>';
      
      if (result) {
        var no_violation_message = 'No violation: ' + msg;
        create_alert(no_violation_message, 'alert-success').appendTo($cmb);
      } else {
        var violation_message = '!!!Violation: ' + msg;
        create_alert(violation_message).appendTo($cmb);
        if ( constraint.priority == 0) {
          create_alert('Please fix the last constraint violation to run'
            + ' the remaining constraints, if there are more', 'alert-error')
            .appendTo($cmb);
          flag = true;
        }
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
    // var children = node.getChildrenIds();
    // children.forEach(function(child) {
    //   self.validate(child);
    // });

    function create_alert(msg, type) {
      var $but = $('<button/>', {
        type: 'button',
        class: 'close',
        'data-dismiss': 'alert',
        html: '&times;'
      });
      var $div = $('<div/>', {
        class: 'alert ' + type,
        html: msg
      }).append($but);
      return $div;
    };

  }

  ConstraintManager.prototype.onOneEvent = function (events) {
    logger.info('Territory is updated, validation begins');
    self.validate(toBeValidated);
    client.removeUI(territoryId);
  }

  return ConstraintManager;
});