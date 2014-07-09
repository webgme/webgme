"use strict";

define(['logManager',
        'js/NodePropertyNames',
        'js/Utils/METAAspectHelper',
        'text!./ConstraintManager.html'], function (logManager,
                                                    nodePropertyNames,
                                                    METAAspectHelper,
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
                    var msg = ': <strong>' + constraint.name + '</strong>' + '&nbsp;&nbsp;&nbsp;[priority: ' + constraint.priority + ']';
                    try {
                        var result = eval("(" + constraint.script + ")(client, node);");

                        if (result === true) {
                            addValidationResult('SUCCESS' + msg, 'alert-success');
                        } else {
                            addValidationResult('FAIL' + msg + '<br/><span class="muted">' + constraint.message + '</span>', 'alert-error');
                        }
                    } catch (exp) {
                        addValidationResult('ERROR' + msg + '<br/><span class="muted">Constraint threw an exception:<br/>' + exp.message + '</span>', 'alert-error');
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
                //sort first by priority descending, then by name ascending
                var res = b.priority - a.priority;
                if (res === 0) {
                    if(a.name < b.name) {
                        res = -1;
                    } else if( a.name > b.name) {
                        res = 1;
                    }
                }
                return res;
            });

        dialog.on('shown.bs.modal', function () {
            doValidate();
        });

        dialog.on('hidden.bs.modal', function () {
            dialog.remove();
            dialog = undefined;
        });

        dialog.modal('show');
    };

    return ConstraintManager;
});