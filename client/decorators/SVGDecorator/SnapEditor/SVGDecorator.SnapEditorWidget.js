"use strict";

define(['js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/SnapEditor/SnapEditorWidget.DecoratorBase',
    'js/Widgets/SnapEditor/SnapEditorWidget.Constants',
    'text!../Core/SVGDecorator.html',
    './SVGDecorator.Core',
    'css!./SVGDecorator.SnapEditorWidget'], function (CONSTANTS,
                                                      nodePropertyNames,
                                                      SnapEditorWidgetDecoratorBase,
                                                      SnapEditorWidgetConstants,
                                                      SVGDecoratorTemplate,
                                                      SVGDecoratorCore) {

    /*
     * This SVG was created with Snap! (byob) in mind.
     *
     * This SVG is dynamic and has the following features:
     *      - contains it's name in the svg itself
     *      - gets wider as the name increases in length
     *      - gets taller as elements are added inside
     *  
     * The SVG used must have the following id(s):
     *      - "name" (text)
     *
     * The SVG used must have a couple elements with given 
     * classes:
     *      - "x-shift-PTR_NAME"
     *      - "x-stretch-PTR_NAME"
     *      - "y-shift-PTR_NAME"
     *      - "y-stretch-PTR_NAME"
     *      
     */
    var SVGDecoratorSnapEditorWidget,
        DECORATOR_ID = "SVGDecoratorSnapEditorWidget";

    SVGDecoratorSnapEditorWidget = function (options) {
        var opts = _.extend( {}, options);

        SnapEditorWidgetDecoratorBase.apply(this, [opts]);
        SVGDecoratorCore.apply(this, [opts]);

        this._initializeVariables({"connectors": false});

        this._selfPatterns = {};
        
        this._transforms = {};//The current abs stretch of any class in the SVG
        this._minDims = {};

        this.logger.debug("SVGDecoratorSnapEditorWidget ctor");
    };

    /************************ INHERITANCE *********************/
    _.extend(SVGDecoratorSnapEditorWidget.prototype, SnapEditorWidgetDecoratorBase.prototype);
    _.extend(SVGDecoratorSnapEditorWidget.prototype, SVGDecoratorCore.prototype);

    /**************** OVERRIDE INHERITED / EXTEND ****************/

    /**** Override from SnapEditorWidgetDecoratorBase ****/
    SVGDecoratorSnapEditorWidget.prototype.DECORATORID = DECORATOR_ID;


    /**** Override from SnapEditorWidgetDecoratorBase ****/
    SVGDecoratorSnapEditorWidget.prototype.$DOMBase = $(SVGDecoratorTemplate);

    /**** Override from SnapEditorWidgetDecoratorBase ****/
    SVGDecoratorSnapEditorWidget.prototype.on_addTo = function () {
        var self = this;

        this._renderContent();

        // set title editable on double-click
        this.$name.on("dblclick.editOnDblClick", null, function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                $(this).editInPlace({"class": "",
                    "value": self.name,
                    "onChange": function (oldValue, newValue) {
                        self.__onNodeTitleChanged(oldValue, newValue);
                    }});
            }
            event.stopPropagation();
            event.preventDefault();
        });
    };


    /**** Override from SnapEditorWidgetDecoratorBase ****/
    SVGDecoratorSnapEditorWidget.prototype.update = function () {
        var oldNameLength = this.$name.width(),
            oldName = this.$name.text(),
            dx;

        this._update();

        //Resize the svg as needed, if needed
        if(this.$name[0].tagName === "text"){
            if(this.$name.width() === 0 && oldNameLength === 0){
                //Assume that it hasn't been drawn yet.
                //Approx the pixel length by relative name change
                //FIXME Find a better way to approximate this...
                //I could add a "name container" invisible rect... 
                var approxWidth = parseFloat(this.$svgContent
                        .find("#name-bounding-box")[0].getAttribute("width"));

                dx = Math.floor(approxWidth * (this.$name.text().length/oldName.length));
            }else{
                dx = this.$name.width() - oldNameLength;
            }

            if(dx !== 0){
                this.stretchHorizontal("name", dx);
            }
        }
    };

    /**** Override from SnapEditorWidgetCore ****/
    SVGDecoratorSnapEditorWidget.prototype._renderContent = function () {
        this.$el.attr({"data-id": this._metaInfo[CONSTANTS.GME_ID]});

        /* BUILD UI*/
        //find placeholders
        this.$name = this.$el.find(".name");
        this.$svgContent = this.$el.find(".svg-content");

        this._updateSVGFile();

        //If it has a "name" text id in the svg, use that instead of $name
        var name = this.$svgContent.find("#name");
        if(name[0] !== undefined && name[0].tagName === "text"){
            this.$name.remove();
            this.$name = name;
        }

        this.update();
    };

    /**** Stretching the SVG ****/
    SVGDecoratorSnapEditorWidget.prototype.stretchHorizontal = function (id, dx) {
        var stretchClass = ".x-stretch-" + id,
            shiftClass = ".x-shift-" + id,
            stretchElements = this.$svgContent.find(stretchClass),
            shiftElements = this.$svgContent.find(shiftClass),
            maxWidth = 0,
            width,
            height,
            svgId,
            i;

        
        i = stretchElements.length;
        while(i--){
            svgId = stretchElements[i].getAttribute("id");

            if(!svgId){
                svgId = this.genSVGId();
                stretchElements[i].setAttribute("id", svgId);
            }

            if(!this._transforms[svgId]){//Initialize transform if needed

                if(stretchElements[i].tagName === "line"){
                    width = parseFloat(stretchElements[i].getAttribute("x2")) 
                        - parseFloat(stretchElements[i].getAttribute("x1"));
                    height = parseFloat(stretchElements[i].getAttribute("y2")) 
                        - parseFloat(stretchElements[i].getAttribute("y1"));
                }else if(stretchElements[i].tagName === "rect"){
                    width = parseFloat(stretchElements[i].getAttribute("width"));
                    height = parseFloat(stretchElements[i].getAttribute("height"));
                }else if(stretchElements[i].tagName === "path"){
                    width = null;
                    height = null;
                }
                    this._transforms[svgId] = { shift: { x: 0, y: 0 }, width: width, height: height };
                    this._minDims[svgId] = { width: width, height: height };
            }
        }

        i = shiftElements.length;
        while(i--){
            svgId = shiftElements[i].getAttribute("id");

            if(!svgId){
                svgId = this.genSVGId();
                shiftElements[i].setAttribute("id", svgId);
            }

            if(!this._transforms[svgId]){//Initialize transform if needed

                if(shiftElements[i].tagName === "line"){
                    width = parseFloat(shiftElements[i].getAttribute("x2")) 
                        - parseFloat(shiftElements[i].getAttribute("x1"));
                    height = parseFloat(shiftElements[i].getAttribute("y2")) 
                        - parseFloat(shiftElements[i].getAttribute("y1"));
                }else if(shiftElements[i].tagName === "rect"){
                    width = parseFloat(shiftElements[i].getAttribute("width"));
                    height = parseFloat(shiftElements[i].getAttribute("height"));
                }else if(shiftElements[i].tagName === "path"){
                    width = null;
                    height = null;
                }
                    this._transforms[svgId] = { shift: { x: 0, y: 0 }, width: width, height: height };
                    this._minDims[svgId] = { width: width, height: height };
            }
        }


        //Stretch the SVG by dx
        var displacement = {},
            x,
            y;
        i = stretchElements.length;
        while(i--){
            svgId = stretchElements[i].getAttribute("id");

            if(!svgId)
                throw "SVG should have an ID";

            //Update the stretch of the given svg element
            //this._transforms[svgId].x.stretch += dx/width;
            this._transforms[svgId].width += dx;

            maxWidth = Math.max(maxWidth, this._transforms[svgId].width);

            this._updateSVGTransforms( stretchElements[i], svgId);
        }    

        var pathStart,
            pathFragments,
            k,
            j;

        i = shiftElements.length;
        while(i--){
            svgId = shiftElements[i].getAttribute("id");
            this._transforms[svgId].shift.x += dx;
            this._updateSVGTransforms(shiftElements[i], svgId);
        }    

        //Adjust the overall svg if necessary
        var current_width = parseFloat(this.$svgElement[0].getAttribute("width")) + dx;

        this.$svgElement[0].setAttribute("width", Math.max(current_width, maxWidth));//Expand if needed
    };

    //TODO Refactor this code...
    SVGDecoratorSnapEditorWidget.prototype.stretchVertical = function (id, dy) {
        var stretchClass = ".y-stretch-" + id,
            shiftClass = ".y-shift-" + id,
            stretchElements = this.$svgContent.find(stretchClass),
            shiftElements = this.$svgContent.find(shiftClass),
            maxHeight = 0,
            height,
            svgId,
            i;

        
        i = stretchElements.length;
        while(i--){
            svgId = stretchElements[i].getAttribute("id");

            if(!svgId){
                svgId = this.genSVGId();
                stretchElements[i].setAttribute("id", svgId);
            }

            if(!this._transforms[svgId]){//Initialize transform if needed

                if(stretchElements[i].tagName === "line"){
                    width = parseFloat(stretchElements[i].getAttribute("x2")) 
                        - parseFloat(stretchElements[i].getAttribute("x1"));
                    height = parseFloat(stretchElements[i].getAttribute("y2")) 
                        - parseFloat(stretchElements[i].getAttribute("y1"));
                }else if(stretchElements[i].tagName === "rect"){
                    width = parseFloat(stretchElements[i].getAttribute("width"));
                    height = parseFloat(stretchElements[i].getAttribute("height"));
                }else if(stretchElements[i].tagName === "path"){
                    width = null;
                    height = null;
                }
                    this._transforms[svgId] = { shift: { x: 0, y: 0 }, width: width, height: height };
                    this._minDims[svgId] = { width: width, height: height };
            }
        }

        i = shiftElements.length;
        while(i--){
            svgId = shiftElements[i].getAttribute("id");

            if(!svgId){
                svgId = this.genSVGId();
                shiftElements[i].setAttribute("id", svgId);
            }

            if(!this._transforms[svgId]){//Initialize transform if needed

                if(stretchElements[i].tagName === "line"){
                    width = parseFloat(stretchElements[i].getAttribute("x2")) 
                        - parseFloat(stretchElements[i].getAttribute("x1"));
                    height = parseFloat(stretchElements[i].getAttribute("y2")) 
                        - parseFloat(stretchElements[i].getAttribute("y1"));
                }else if(stretchElements[i].tagName === "rect"){
                    width = parseFloat(stretchElements[i].getAttribute("width"));
                    height = parseFloat(stretchElements[i].getAttribute("height"));
                }else if(stretchElements[i].tagName === "path"){
                    width = null;
                    height = null;
                }
                    this._transforms[svgId] = { shift: { x: 0, y: 0 }, width: width, height: height };
                    this._minDims[svgId] = { width: width, height: height };
            }
        }

        //Stretch the SVG by dy
        var displacement = {},
            x,
            y;
        i = stretchElements.length;
        while(i--){
            svgId = stretchElements[i].getAttribute("id");

            if(!svgId)
                throw "SVG should have an ID";

            //Update the stretch of the given svg element
            //this._transforms[svgId].x.stretch += dx/width;
            this._transforms[svgId].height += dy;

            maxHeight = Math.max(maxHeight, this._transforms[svgId].height);

            this._updateSVGTransforms( stretchElements[i], svgId);
        }    

        var pathStart,
            pathFragments,
            k,
            j;

        i = shiftElements.length;
        while(i--){
            svgId = shiftElements[i].getAttribute("id");
            this._transforms[svgId].shift.y += dy;
            this._updateSVGTransforms(shiftElements[i], svgId);
        }    

        //Adjust the overall svg if necessary
        var current_height = parseFloat(this.$svgElement[0].getAttribute("height")) + dy;

        this.$svgElement[0].setAttribute("height", Math.max(current_height, maxHeight));//Expand if needed
    };

    SVGDecoratorSnapEditorWidget.prototype.genSVGId = function () {
        //Randomly generate ID between 0,10000
        var id = "SVG_" + Math.random()*10000;

        while(this._transforms[id]){
            id = "SVG_" + Math.random()*10000;
        }

        return id;
    };

    SVGDecoratorSnapEditorWidget.prototype._updateSVGTransforms = function (svg, id) {
        var width = Math.max(this._minDims[id].width, this._transforms[id].width),
            height = Math.max(this._minDims[id].height, this._transforms[id].height);

        if(svg.tagName === "line"){
            var x1 = parseFloat(svg.getAttribute("x1")),
                x2 = parseFloat(svg.getAttribute("x2")),
                y1 = parseFloat(svg.getAttribute("y1")),
                y2 = parseFloat(svg.getAttribute("y2"));

            svg.setAttribute("x2", x1+width);
            svg.setAttribute("y2", y1+height);

        }else if(svg.tagName === "rect"){

            svg.setAttribute("width", width);
            svg.setAttribute("height", height);
        }
 
        svg.setAttribute("transform", 
                "translate(" + this._transforms[id].shift.x + "," + this._transforms[id].shift.y + ")");
    };

    /**** Override from SnapEditorWidgetDecoratorBase ****/
    SVGDecoratorSnapEditorWidget.prototype.onRenderGetLayoutInfo = function () {
        this.svgContainerWidth = this.$svgContent.outerWidth(true);
        this.svgWidth = this.$svgContent.find('svg').outerWidth(true);
        this.svgHeight = this.$svgContent.find('svg').outerHeight(true);
        this.svgBorderWidth = parseInt(this.$svgContent.find('svg').css('border-width'), 10);

        SnapEditorWidgetDecoratorBase.prototype.onRenderGetLayoutInfo.call(this);
    };

    SVGDecoratorSnapEditorWidget.prototype.onRenderSetLayoutInfo = function () {
        var xShift = Math.ceil((this.svgContainerWidth - this.svgWidth) / 2 + this.svgBorderWidth),
            connectors = this.$el.find('> .' + SnapEditorWidgetConstants.CONNECTOR_CLASS);

        connectors.css('transform', 'translateX(' + xShift + 'px)');

        this._fixPortContainerPosition(xShift);

        SnapEditorWidgetDecoratorBase.prototype.onRenderSetLayoutInfo.call(this);
    };


    /**** Override from SnapEditorWidgetDecoratorBase ****/
    SVGDecoratorSnapEditorWidget.prototype.getConnectionAreas = function (id/*, isEnd, connectionMetaInfo*/) {
        var result = [],
            edge = 10,
            LEN = 20,
            xShift = (this.svgContainerWidth - this.svgWidth) / 2;

        if (id === undefined || id === this.hostDesignerItem.id) {
            if (this._customConnectionAreas && this._customConnectionAreas.length > 0) {
                //custom connections are defined in the SVG itself
                result = $.extend(true, [], this._customConnectionAreas);
                var i = result.length;
                while (i--) {
                    result[i].x1 += xShift;
                    result[i].x2 += xShift;
                }
            } else {
                //no custom connection area defined in the SVG
                //by default return the bounding box N, S, edges with a little bit of padding (variable 'edge') from the sides
                //North side
                result.push( {"id": "N",
                    "x1": edge + xShift,
                    "y1": 0,
                    "x2": this.svgWidth - edge + xShift,
                    "y2": 0} );

                //South side
                result.push( {"id": "S",
                    "x1": edge + xShift,
                    "y1": this.svgHeight,
                    "x2": this.svgWidth - edge + xShift,
                    "y2": this.svgHeight} );

            }
        } else if (this.ports[id]) {
            //subcomponent
            var portTop = this.ports[id].top,
                isLeft = this.ports[id].isLeft,
                x = this._portContainerXShift + (isLeft ? 1 : this.svgWidth - 1),
                angle = isLeft ? 180 : 0;

                result.push( {"id": id,
                    "x1": x,
                    "y1": portTop + this._PORT_HEIGHT / 2,
                    "x2": x,
                    "y2": portTop + this._PORT_HEIGHT / 2,
                    "angle1": angle,
                    "angle2": angle,
                    "len": LEN} );
        }

        return result;
    };


    /**** Override from SnapEditorWidgetDecoratorBase ****/
    //Shows the 'connectors' - appends them to the DOM
    SVGDecoratorSnapEditorWidget.prototype.showSourceConnectors = function (params) {
        //Show "clickable" areas?
        //TODO
    };

    /**** Override from SnapEditorWidgetDecoratorBase ****/
    //Hides the 'connectors' - detaches them from the DOM
    SVGDecoratorSnapEditorWidget.prototype.hideSourceConnectors = function () {
        //Hide "clickable" areas?
        //TODO
    };


    /**** Override from SnapEditorWidgetDecoratorBase ****/
    //should highlight the connectors for the given elements
    SVGDecoratorSnapEditorWidget.prototype.showEndConnectors = function (params) {
       this.showSourceConnectors(params);
    };


    /**** Override from SnapEditorWidgetDecoratorBase ****/
    //Hides the 'connectors' - detaches them from the DOM
    SVGDecoratorSnapEditorWidget.prototype.hideEndConnectors = function () {
        this.hideSourceConnectors();
    };


    SVGDecoratorSnapEditorWidget.prototype.__onNodeTitleChanged = function (oldValue, newValue) {
        var client = this._control._client;

        client.setAttributes(this._metaInfo[CONSTANTS.GME_ID], nodePropertyNames.Attributes.name, newValue);
    };

    /**** Override from SnapEditorWidgetDecoratorBase ****/
    //called when the designer item's subcomponent should be updated
    SVGDecoratorSnapEditorWidget.prototype.updateSubcomponent = function (portId) {
        this._updatePort(portId);
    };


    /**** Override from ModelDecoratorCore ****/
    SVGDecoratorSnapEditorWidget.prototype.renderChild = function (portId) {
        //Render the children inside of the given svg
        //TODO
        this.__registerAsSubcomponent(portId);

        //return SVGDecoratorCore.prototype.renderPort.call(this, portId);
    };


    /**** Override from ModelDecoratorCore ****/
    SVGDecoratorSnapEditorWidget.prototype.removePort = function (portId) {
        var idx = this.portIDs.indexOf(portId);

        if (idx !== -1) {
            this.__unregisterAsSubcomponent(portId);
        }

        SVGDecoratorCore.prototype.removePort.call(this, portId);
    };

    SVGDecoratorSnapEditorWidget.prototype.__registerAsSubcomponent = function(portId) {
        if (this.hostDesignerItem) {
            this.hostDesignerItem.registerSubcomponent(portId, {"GME_ID": portId});
        }
    };

    SVGDecoratorSnapEditorWidget.prototype.__unregisterAsSubcomponent = function(portId) {
        if (this.hostDesignerItem) {
            this.hostDesignerItem.unregisterSubcomponent(portId);
        }
    };

    /**** Override from SnapEditorWidgetDecoratorBase ****/
    SVGDecoratorSnapEditorWidget.prototype.notifyComponentEvent = function (componentList) {
        var len = componentList.length;
        while (len--) {
            this._updatePort(componentList[len].id);
        }
    };

    return SVGDecoratorSnapEditorWidget;
});
