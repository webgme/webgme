/*globals define, _*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define(['common/LogManager'], function (logManager) {


    "use strict";

    var Constraint;

    Constraint = function (constDesc) {
        this.name = constDesc.name;
        this.script = constDesc.script;
        //this.priority = constDesc.priority;
        this.info = constDesc.info;

        this._render();

        //get logger instance for this component
        //some comment here
        this.logger = logManager.create("Constraint_" + this.name);
        this.logger.debug("Created");
    };

    Constraint.prototype._DOMConstraintBase = $('<div class="const" data-name="__ID__"><span class="n"></span><span class="t"></span></div>');

    Constraint.prototype._render = function () {
        var self = this;

        this.$el = this._DOMConstraintBase.clone();
        this.$el.attr({"data-name": this.name,
                      "title": this.name + ", info: " + this.info});

        this.$el.find(".n").text(this.name /*+ ":"*/);
        //this.$el.find(".t").text(this.priority);
        this.$el.find(".i").text(this.info);
    };

    Constraint.prototype.update = function (constDesc) {
        this.name = constDesc.name;
        this.script = constDesc.script;
        //this.priority = constDesc.priority;
        this.info = constDesc.info;

        this._render();
    };

    Constraint.prototype.destroy = function () {
        //finally remove itself from DOM
        if (this.$el) {
            this.$el.remove();
            this.$el.empty();
        }
    };


    return Constraint;
});