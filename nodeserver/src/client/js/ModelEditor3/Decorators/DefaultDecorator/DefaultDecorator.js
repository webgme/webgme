"use strict";

define(['logManager',
    'clientUtil',
    'js/DiagramDesigner/DecoratorBase',
    'text!js/ModelEditor3/Decorators/DefaultDecorator/DefaultDecoratorTemplate.html',
    'js/DiagramDesigner/NodePropertyNames',
    'css!ModelEditor3CSS/Decorators/DefaultDecorator/DefaultDecorator'], function (logManager,
                                                       util,
                                                       DecoratorBase,
                                                       defaultDecoratorTemplate,
                                                       nodePropertyNames) {

    var DefaultDecorator,
        __parent__ = DecoratorBase,
        __parent_proto__ = DecoratorBase.prototype,
        DECORATOR_ID = "DefaultDecorator";

    DefaultDecorator = function (options) {
        var opts = _.extend( {}, options);

        __parent__.apply(this, [opts]);

        this.name = "";

        this.logger.debug("DefaultDecorator ctor");
    };

    _.extend(DefaultDecorator.prototype, __parent_proto__);
    DefaultDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DECORATORBASE MEMBERS **************************/

    DefaultDecorator.prototype.$DOMBase = $(defaultDecoratorTemplate);

    DefaultDecorator.prototype.on_addTo = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo.GMEID),
            gmeID = this._metaInfo.GMEID;

        //render GME-ID in the DOM, for debugging
        this.$el.attr({"data-id": this._metaInfo.GMEID});

        if (nodeObj) {
            this.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || "";
        }

        //find name placeholder
        this.skinParts.$name = this.$el.find(".name");
        this.skinParts.$name.text(this.name);

        // set title editable on double-click
        this.skinParts.$name.editOnDblClick({"class": "",
            "onChange": function (oldValue, newValue) {
                client.setAttributes(gmeID, nodePropertyNames.Attributes.name, newValue);
            }});

        //let the parent decorator class do its job first
        return __parent_proto__.on_addTo.apply(this, arguments);
    };

    DefaultDecorator.prototype.calculateDimension = function () {
        this.hostDesignerItem.width = this.$el.outerWidth(true);
        this.hostDesignerItem.height = this.$el.outerHeight(true);
    };

    DefaultDecorator.prototype.update = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo.GMEID),
            newName = "";

        if (nodeObj) {
            newName = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || "";

            if (this.name !== newName) {
                this.name = newName;
                this.skinParts.$name.text(this.name);
            }
        }
    };

    DefaultDecorator.prototype.getConnectionAreas = function (id) {
        var result = [];

        //by default return the bounding box edge's midpoints

        if (id === undefined) {
            //top left
            result.push( {"id": "0",
                "x": this.hostDesignerItem.width / 2,
                "y": 0,
                "w": 0,
                "h": 0,
                "orientation": "N",
                "len": 10} );

            result.push( {"id": "1",
                "x": this.hostDesignerItem.width / 2,
                "y": this.hostDesignerItem.height,
                "w": 0,
                "h": 0,
                "orientation": "S",
                "len": 10} );

            result.push( {"id": "2",
                "x": 0,
                "y": this.hostDesignerItem.height / 2,
                "w": 0,
                "h": 0,
                "orientation": "W",
                "len": 10} );

            result.push( {"id": "3",
                "x": this.hostDesignerItem.width,
                "y": this.hostDesignerItem.height / 2,
                "w": 0,
                "h": 0,
                "orientation": "E",
                "len": 10} );
        }

        return result;
    };

    return DefaultDecorator;
});