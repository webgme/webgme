"use strict";

define(['logManager',
    'clientUtil',
    'js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/DiagramDesigner/DecoratorBase',
    'text!./DefaultDecoratorTemplate.html',
    'css!/css/Decorators/DiagramDesigner/DefaultDecorator/DefaultDecorator'], function (logManager,
                                                       util,
                                                       CONSTANTS,
                                                       nodePropertyNames,
                                                       DecoratorBase,
                                                       defaultDecoratorTemplate) {

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
        var gmeID = this._metaInfo[CONSTANTS.GME_ID],
            self = this;

        this._renderName();

        // set title editable on double-click
        this.skinParts.$name.on("dblclick.editOnDblClick", null, function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                $(this).editInPlace({"class": "",
                    "onChange": function (oldValue, newValue) {
                        self._onNodeTitleChanged(oldValue, newValue);
                    }});
            }
            event.stopPropagation();
            event.preventDefault();
        });

        //let the parent decorator class do its job first
        __parent_proto__.on_addTo.apply(this, arguments);
    };

    DefaultDecorator.prototype.on_addToPartBrowser = function () {
        this._renderName();

        //let the parent decorator class do its job first
        __parent_proto__.on_addToPartBrowser.apply(this, arguments);
    };

    DefaultDecorator.prototype._renderName = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);

        //render GME-ID in the DOM, for debugging
        this.$el.attr({"data-id": this._metaInfo[CONSTANTS.GME_ID]});

        if (nodeObj) {
            this.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || "";
        }

        //find name placeholder
        this.skinParts.$name = this.$el.find(".name");
        this.skinParts.$name.text(this.name);
    };

    DefaultDecorator.prototype.update = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
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
        var result = [],
            edge = 10;

        //by default return the bounding box edge's midpoints

        if (id === undefined) {
            //top left
            result.push( {"id": "0",
                "x": edge,
                "y": 0,
                "w": this.hostDesignerItem.width - 2 * edge,
                "h": 0,
                "orientation": "N",
                "len": 10} );

            result.push( {"id": "1",
                "x": edge,
                "y": this.hostDesignerItem.height,
                "w": this.hostDesignerItem.width - 2 * edge,
                "h": 0,
                "orientation": "S",
                "len": 10} );

            result.push( {"id": "2",
                "x": 0,
                "y": edge,
                "w": 0,
                "h": this.hostDesignerItem.height - 2 * edge,
                "orientation": "W",
                "len": 10} );

            result.push( {"id": "3",
                "x": this.hostDesignerItem.width,
                "y": edge,
                "w": 0,
                "h": this.hostDesignerItem.height - 2 * edge,
                "orientation": "E",
                "len": 10} );
        }

        return result;
    };

    /**************** EDIT NODE TITLE ************************/

    DefaultDecorator.prototype._onNodeTitleChanged = function (oldValue, newValue) {
        var client = this._control._client;

        client.setAttributes(this._metaInfo[CONSTANTS.GME_ID], nodePropertyNames.Attributes.name, newValue);
    };

    /**************** END OF - EDIT NODE TITLE ************************/

    return DefaultDecorator;
});