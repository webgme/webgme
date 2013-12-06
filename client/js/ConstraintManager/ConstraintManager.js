"use strict";

define(['logManager',
        'js/NodePropertyNames',
        'text!./ConstraintManager.html'], function (logManager,
                                                    nodePropertyNames,
                                                    constraintManagerDialogTemplate) {
  
    var dialog_base = $(constraintManagerDialogTemplate);

    var ConstraintManager = function(_client) {
        this._logger = logManager.create('ConstraintManager');
        this._client = _client;
    };

    // Validate the node itself..
    ConstraintManager.prototype.validate = function(id) {
        var client = this._client,
            node = client.getNode(id),
            node_name = node.getAttribute(nodePropertyNames.Attributes.name),
            dialog = dialog_base.clone(),
            dialogBody = dialog.find(".modal-body"),
            addValidationResult,
            doValidate,
            constraints;

        this._logger.debug('Validating node: ' + id + ' ' + node_name);

        addValidationResult =  function (msg, type) {
            var $div = $('<div/>', {
                class: 'alert ' + type,
                html: msg
            });
            dialogBody.append($div);
        };

        doValidate = function () {
            if (constraints.length == 0 ) {
                addValidationResult('SUCCESS: No constraints defined for <strong>' + node_name + '</strong>', 'alert-success');
            } else {
                constraints.forEach(function(constraint) {
                    var result = eval("(" + constraint.script + ")(client, node);");

                    var msg = ': <strong>' + constraint.name + '</strong>' + '&nbsp;&nbsp;&nbsp;[priority: ' + constraint.priority + ']';

                    if (result === true) {
                        addValidationResult('SUCCESS' + msg, 'alert-success');
                    } else {
                        addValidationResult('FAIL' + msg + '<br/><span class="muted">' + constraint.message + '</span>', 'alert-error');
                    }
                });
            }
        };

        constraints = node.getConstraintNames().map(
            function(constraint_name) {
              var constraint_obj = node.getConstraint(constraint_name);
              constraint_obj.name = constraint_name;
              return constraint_obj;
            }).sort(function(a, b) {
                return a.priority - b.priority;
            });

        dialog.on('shown', function () {
            doValidate();
        });

        dialog.on('hidden', function () {
            dialog.remove();
            dialog = undefined;
        });

        dialog.modal('show');
    };

    return ConstraintManager;
});