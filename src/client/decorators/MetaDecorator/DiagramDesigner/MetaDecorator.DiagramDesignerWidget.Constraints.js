/*globals define, _, $*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define([
    'js/Constants',
    './ConstraintDetailsDialog',
    './Constraint'
], function (CONSTANTS, ConstraintDetailsDialog, Constraint) {


    'use strict';

    var MetaDecoratorDiagramDesignerWidgetConstraints,
        SCRIPT_TEMPLATE = [
            '/**',
            ' * To be called when the constraint has been evaluated.',
            ' * @callback constraintCallback',
            ' * @param {string|Error} err - Should be null unless unexpected execution errors.',
            ' * @param {object} result - Result of the constraint evaluation.',
            ' * @param {boolean} result.hasViolation - Set to true if there were violations.',
            ' * @param {string} [result.message] - Message to display in case of violation.',
            ' */',
            '',
            '/**',
            ' * The function defining the constraint.',
            ' * @param {Core} core - API for retrieving data about the node.',
            ' * @param {Node} node - The node being checked.',
            ' * @param {constraintCallback} callback',
            ' */',
            'function (core, node, callback) {',
            '    var result = {hasViolation: false, message: \'\'};',
            '    // Here goes the constraint checking..',
            '    callback(null, result)',
            '}'].join('\n');

    MetaDecoratorDiagramDesignerWidgetConstraints = function () {
    };

    MetaDecoratorDiagramDesignerWidgetConstraints.prototype._renderContentConstraints = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            self = this;

        this._constraintNames = [];
        this._constraints = {};

        this._skinParts.$constraintsContainer = this.$el.find('.constraints');
        this._skinParts.$addConstraintContainer = this.$el.find('.add-new-constraint');

        this._skinParts.$constraintsContainer.on('dblclick', 'li', function (e) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                var constraintName = $(this).find('.n').text().replace(':', ''),
                    constraintNames = self._constraintNames.slice(0),
                    dialog = new ConstraintDetailsDialog(),
                    desc = _.extend({}, nodeObj.getConstraint(constraintName));

                desc.name = constraintName;

                //pass all the other attribute names to the dialog
                constraintNames.splice(self._constraintNames.indexOf(constraintName), 1);

                dialog.show(desc, constraintNames, function (constraintDesc) {
                        self.saveConstraintDescriptor(constraintName, constraintDesc);
                    },
                    function () {
                        self.deleteConstraintDescriptor(constraintName);
                    }
                );
            }

            e.stopPropagation();
            e.preventDefault();
        });

        //set the 'Add new...' clickhandler
        this._skinParts.$addConstraintContainer.on('click', null, function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                self._onNewConstraintClick();
            }
            event.stopPropagation();
            event.preventDefault();
        });
    };


    MetaDecoratorDiagramDesignerWidgetConstraints.prototype._onNewConstraintClick = function () {
        this._onNewClick(this._constraintNames, this._skinParts.$constraintsContainer,
            this._skinParts.$addConstraintContainer, this._skinParts.$constraintsTitle, this._onNewConstraintCreate);
    };

    MetaDecoratorDiagramDesignerWidgetConstraints.prototype._updateConstraints = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            newConstraints = nodeObj ? nodeObj.getOwnConstraintNames() : [],
            len,
            displayedConstraints = this._constraintNames.slice(0),
            diff,
            cLIBase = $('<li/>'),
            i;

        //first get the ones that are not there anymore
        diff = _.difference(displayedConstraints, newConstraints);
        len = diff.length;
        while (len--) {
            this._removeConstraint(diff[len]);
        }

        //second get the ones that are new
        diff = _.difference(newConstraints, displayedConstraints);
        len = diff.length;
        while (len--) {
            this._addConstraint(diff[len]);
        }

        //finally update the ones that are not new and not deleted
        diff = _.intersection(newConstraints, displayedConstraints);
        len = diff.length;
        while (len--) {
            this._updateConstraint(diff[len]);
        }

        //finally update UI
        this._constraintNames.sort();
        this._skinParts.$constraintsContainer.empty();
        len = this._constraintNames.length;
        for (i = 0; i < len; i += 1) {
            this._skinParts.$constraintsContainer.append(
                cLIBase.clone().append(this._constraints[this._constraintNames[i]].$el));
        }
    };

    MetaDecoratorDiagramDesignerWidgetConstraints.prototype._addConstraint = function (cName) {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            constraint = nodeObj.getConstraint(cName);

        if (constraint) {
            constraint.name = cName;
            this._constraints[cName] = new Constraint(constraint);
            this._constraintNames.push(cName);
        }
    };

    MetaDecoratorDiagramDesignerWidgetConstraints.prototype._updateConstraint = function (cName) {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            constraint = nodeObj.getConstraint(cName);

        if (constraint) {
            constraint.name = cName;
            this._constraints[cName].update(constraint);
        }
    };

    MetaDecoratorDiagramDesignerWidgetConstraints.prototype._removeConstraint = function (cName) {
        var idx = this._constraintNames.indexOf(cName);

        if (idx !== -1) {
            this._constraints[cName].destroy();
            delete this._constraints[cName];
            this._constraintNames.splice(idx, 1);
        }
    };

    MetaDecoratorDiagramDesignerWidgetConstraints.prototype._onNewConstraintCreate = function (cName) {
        var desc,
            self = this,
            constraintNames = this._constraintNames.slice(0),
            dialog = new ConstraintDetailsDialog();

        this.logger.debug('_onNewConstraintCreate: ' + cName);

        //pass all the other attribute names to the dialog
        constraintNames.splice(this._constraintNames.indexOf(cName), 1);

        desc = {
            'name': cName,
            'script': SCRIPT_TEMPLATE,
            /*'priority': 0,*/
            'info': ''
        };

        dialog.show(desc, constraintNames, function (cDesc) {
            self.saveConstraintDescriptor(cName, cDesc);
        });
    };


    MetaDecoratorDiagramDesignerWidgetConstraints.prototype.saveConstraintDescriptor = function (cName, cDesc) {
        var client = this._control._client,
            objID = this._metaInfo[CONSTANTS.GME_ID];

        client.startTransaction();

        if (cName !== cDesc.name) {
            //name has changed --> delete the descriptor with the old name
            client.delConstraint(objID, cName);
        }

        client.setConstraint(objID, cDesc.name, cDesc);

        client.completeTransaction();
    };

    MetaDecoratorDiagramDesignerWidgetConstraints.prototype.deleteConstraintDescriptor = function (cName) {
        var client = this._control._client,
            objID = this._metaInfo[CONSTANTS.GME_ID];

        client.startTransaction();

        client.delConstraint(objID, cName);

        client.completeTransaction();
    };

    return MetaDecoratorDiagramDesignerWidgetConstraints;
});