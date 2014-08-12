/*globals define,_*/

/*
 * @author brollb / https://github/brollb
 */

define(['js/Constants',
        'util/assert',
        'js/NodePropertyNames',
        'js/Widgets/SnapEditor/SnapEditorWidget.DecoratorBase',
        'js/Widgets/SnapEditor/SnapEditorWidget.DecoratorBase.ConnectionAreas',
        'js/Widgets/SnapEditor/SnapEditorWidget.DecoratorBase.Stretch',
        'js/Widgets/SnapEditor/SnapEditorWidget.Constants',
        'text!../Core/SVGDecorator.html',
        './SVGDecorator.Core',
        'css!./SVGDecorator.SnapEditorWidget'], function (CONSTANTS,
                                                          assert,
                                                          nodePropertyNames,
                                                          SnapEditorWidgetDecoratorBase,
                                                          SnapEditorWidgetDecoratorBaseConnectionAreas,
                                                          SnapEditorWidgetDecoratorBaseStretch,
                                                          SNAP_CONSTANTS,
                                                          SVGDecoratorTemplate,
                                                          SVGDecoratorCore) {

    "use strict";

    var SVGDecoratorSnapEditorWidget,
        DECORATOR_ID = "SVGDecoratorSnapEditorWidget",
        SVG_COLOR_ID = "colors",
        SVG_SECONDARY_COLOR_ID = "secondary",
        EDIT_TEXT = { PADDING: 5, MIN_WIDTH: 30};

    /**
     * SVGDecoratorSnapEditorWidget
     *
     * @constructor
     * @param {Object} options
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidget = function (options) {
        var opts = _.extend( {}, options);

        SnapEditorWidgetDecoratorBase.apply(this, [opts]);
        SVGDecoratorCore.apply(this, [opts]);

        this._initializeVariables({ data: [SNAP_CONSTANTS.CONNECTION_HIGHLIGHT, 
                                  SNAP_CONSTANTS.INITIAL_MEASURE, SNAP_CONSTANTS.INPUT_FIELDS], "connectors": false});

        this._selfPatterns = {};
        
        this.initializeStretchability(options.decoratorParams.stretchers);//stretchers are things that cause an svg stretch (attribute name or ptr name)

        //Attributes in text fields
        this._attributes = {};//Only if they have a text field for it

        this.logger.debug("SVGDecoratorSnapEditorWidget ctor");
    };

    /************************ INHERITANCE *********************/
    _.extend(SVGDecoratorSnapEditorWidget.prototype, SnapEditorWidgetDecoratorBase.prototype);
    _.extend(SVGDecoratorSnapEditorWidget.prototype, SnapEditorWidgetDecoratorBaseConnectionAreas.prototype);
    _.extend(SVGDecoratorSnapEditorWidget.prototype, SVGDecoratorCore.prototype);
    _.extend(SVGDecoratorSnapEditorWidget.prototype, SnapEditorWidgetDecoratorBaseStretch.prototype);

    /**************** OVERRIDE INHERITED / EXTEND ****************/

    /**** Override from SnapEditorWidgetDecoratorBase ****/
    SVGDecoratorSnapEditorWidget.prototype.DECORATORID = DECORATOR_ID;


    /**** Override from SnapEditorWidgetDecoratorBase ****/
    SVGDecoratorSnapEditorWidget.prototype.$DOMBase = $(SVGDecoratorTemplate);

    /**** Override from SnapEditorWidgetDecoratorBase ****/
    /**
     * This is called before the item is added to the canvas DOM. The item must create it's
     * DOM representation.
     *
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidget.prototype.on_addTo = function () {
        var self = this;

        this._renderContent();

        this.$svgContent.css('position', 'relative');
        // set title editable on double-click if editable
        if (this.$name.attr('data-editable')){
            this.$name.on("dblclick.editOnDblClick", null, function (event) {
                if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                    var id = $(this).attr('id'),
                        box = {},
                        width,
                        tempName = $('<div/>', { id: id + '-edit', 
                                             text: $(this).text()});

                     self.$svgContent.append(tempName);

                     tempName.css('position', 'absolute');
                     box = self.$name[0].getBBox();
                     tempName.css('left', box.x + self._transforms[id].shift.x);
                     tempName.css('top', box.y);
                     width = Math.max(box.width + EDIT_TEXT.PADDING, EDIT_TEXT.MIN_WIDTH);
                     tempName.css('width', width);

                     $(tempName).editInPlace({"class": id + "-edit",
                                             "value": self.name,
                                             "css": { 'z-index': 10000 },
                                             "onChange": function (oldValue, newValue) {
                                                 self._saveAttributeChange(id, newValue);
                                             },
                                             "onFinish": function () {
                                                 $(this).remove();
                                             }

                     });
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }
    };

    /**
     * Save changes to any node attributes made through clicking on the node.
     *
     * @this {SVGDecoratorSnapEditorWidget}
     * @param {String} attributeName
     * @param {String} value
     * @return {undefined} 
     */
    SVGDecoratorSnapEditorWidget.prototype._saveAttributeChange = function(attributeName, value){
        var client = this._control._client;

        client.setAttributes(this._metaInfo[CONSTANTS.GME_ID], attributeName, value);
    };


    /**** Override from SnapEditorWidgetDecoratorBase ****/
    /**
     * Update the svg image and attributes.
     *
     * @return {Boolean} return true if the decorator changed size
     */
    SVGDecoratorSnapEditorWidget.prototype.update = function () {
        var oldNameLength = this.$name.width(),
            oldName = this.$name.text(),
            dx,
            changed = false;

        this._update();

        //Resize the svg as needed
        if(this.$name[0].tagName === "text"){
            if(this.$name.width() === 0 && oldNameLength === 0){
                //Assume that it hasn't been drawn yet.
                //Approx the pixel length by relative name change
                //FIXME Find a better way to approximate this...
                //I could add a "name container" invisible rect... 
                var approxWidth = parseFloat(this.$svgContent
                        .find("#name-bounding-box")[0].getAttribute("width")),
                    newX = approxWidth * (this.$name.text().length/oldName.length);

                dx = Math.floor(approxWidth * (this.$name.text().length/oldName.length));
                //this.stretchTo(SNAP_CONSTANTS.NAME, newX, 0);
            }else{
                dx = this.$name.width() - oldNameLength;
                //this.stretchTo(SNAP_CONSTANTS.NAME, this.$name.width(), 0);
            }

            if (dx !== 0){
                this.stretchTo(SNAP_CONSTANTS.NAME, { x: dx });
                changed = "decorator resized";
            }
        }
        
        //Apply latest stretch transformation info
        //May not be the right spot for this FIXME
        //this._applyTransforms();

    };

    SVGDecoratorSnapEditorWidget.prototype.removeAttributeText = function (attr) {
        var fields;

        if (this._attributes.hasOwnProperty( attr )){
            fields = this.$el.find('text').filter('#' + attr);
            fields.remove();
            delete this._attributes[attr];
        }
    };

    SVGDecoratorSnapEditorWidget.prototype.updateAttributeContent = function (attr, value) {
        if (this._attributes.hasOwnProperty(attr)){
            this._attributes[attr].value = value + "";
        }
    };

    SVGDecoratorSnapEditorWidget.prototype.setAttributeEnabled = function (attr, enabled) {
        if (this._attributes.hasOwnProperty(attr)){
            this._attributes[attr].enabled = enabled;
        }
    };

    SVGDecoratorSnapEditorWidget.prototype.updateAttributeText = function () {
        var attributes = Object.keys(this._attributes),
            textFields = this.$el.find('text'),
            attr,
            enabled,
            fields;

        while (attributes.length){
            attr = attributes.pop();
            enabled = this._attributes[attr].enabled;
            if (enabled){
                fields = textFields.filter("#" + attr);
                this._setTextAndStretch(fields, this._attributes[attr].value, attr);
            }
        }
    };

    /**
     * Update item's input fields' DOMs as needed.
     *
     * @private
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidget.prototype.updateInputFields = function () {
        //WRITE
        var fields = Object.keys(this._inputFields2Update),
            container,
            input,
            field;

            for (var i = fields.length-1; i >= 0; i--) {
                //Get the div containing this input field or create one
                field = fields[i];
                input = null;
                if (this.inputFields[field].visible === true){
                    //container = this.$inputFields.find("#"+field+ "-container");
                    container = this.$el.find("#"+field+ "-container");
                    if (!container.length){
                        container = $('<div id="' + field + '-container" />');
                        //this.$inputFields.append(container);
                        this.$el.append(container);
                    } else {//Remove any old info
                        container.empty();
                    }

                    //Update field
                    if (this.inputFields[field].type === SNAP_CONSTANTS.TEXT_FIELD.NAME){
                        //Create a text field
                        input = $('<input>', { id: field, type: "text", text: this.inputFields[field].content });
                    } else if (this.inputFields[field].type === SNAP_CONSTANTS.DROPDOWN.NAME){
                        input = $('<select>', { id: field, class: "input-small" });
                        if (this.inputFields[field].options){//If it has options

                            for (var j = 0; j < this.inputFields[field].options.length; j++){
                                input.append($('<option>', { text: this.inputFields[field].options[j] }));
                            }
                        }
                    }

                    if (input){
                        container.css("left", this.inputFields[field].x);
                        container.css("top", this.inputFields[field].y);
                        container.css("position", "absolute");

                        input.css("width", this.inputFields[field].width);
                        input.css("height", this.inputFields[field].height);

                        input.css("z-index", this.zIndex+1);
                        container.append(input);
                    }

                    delete this._inputFields2Update[field];
                }
            }

        this.$el.css("position", "relative");
        this.$el.append(this.$inputFields);
    };

    /**** Override from SnapEditorWidgetCore ****/
    SVGDecoratorSnapEditorWidget.prototype._renderContent = function () {
        this.$el.attr({"data-id": this._metaInfo[CONSTANTS.GME_ID]});
        this.zIndex = this._metaInfo[CONSTANTS.GME_ID].split("/").length;

        //Set z-index
        this.$el[0].style.zIndex = this.zIndex;

        /* BUILD UI*/
        //find placeholders
        this.$name = this.$el.find("." + SNAP_CONSTANTS.NAME);
        this.$svgContent = this.$el.find(".svg-content");

        this._updateSVGFile();

        this._initializeSVGElements();//ID all svg elements

        //Colors
        this.initializeColors();

        //Update the displayed input areas based on newest data
        this.updateInputFields();

        //If it has a "name" text id in the svg, use that instead of $name
        //This allows for the svg to fall back to a separate name div if
        //no spot for it in the svg
        this.$name.remove();
        var name = this.$svgContent.find("#" + SNAP_CONSTANTS.NAME);
        if(name[0] !== undefined && name[0].tagName === "text"){
            this.$name = name;
        }

        var attributes = this.hostDesignerItem.attributes,
            attrList = Object.keys(attributes),
            textFields = this.$el.find("text"),
            attr,
            fields,
            self = this,
            editText = function (event) {
                if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                    var id = $(this).attr('id'),
                        box,
                        width,
                        fontSize = $(this).css('font-size'),
                        tempName = $('<div/>', { id: id + '-edit', 
                                                 text: $(this).text()}),
                        element = $(this);

                    self.$svgContent.append(tempName);
                    tempName.css('position', 'absolute');

                    box = $(this)[0].getBBox();
                    width = Math.max(box.width + EDIT_TEXT.PADDING, EDIT_TEXT.MIN_WIDTH);

                    //Set tempName
                    tempName.css('left', box.x + self._transforms[id].shift.x);
                    tempName.css('top', box.y);
                    tempName.css('width', width);
                    tempName.css('font-size', fontSize);

                    $(tempName).editInPlace({"class": id + "-edit",
                        "value": $(this).text(),
                        "css": { 'z-index': 10000, 'font-size': fontSize },
                        "onChange": function (oldValue, newValue) {
                            self._saveAttributeChange(id, newValue);
                        },
                        "onFinish": function () {
                            $(this).remove();
                        }
                    });
                }
                event.stopPropagation();
                event.preventDefault();
            };

        for (var i = 0; i < attrList.length; i++){
            attr = attrList[i];
            if (attr !== 'name'){
                this._attributes[ attr ] = { enabled: true, value: attributes[attr].value+"" };
                fields = textFields.filter("#" + attr);

                this._setTextAndStretch(fields, attributes[attr].value, attr);

                //Make the fields editable
                fields.on("click", null, editText);

                //Add support for clicking on a box around the text to edit the text
                //TODO
            }
        }

        this.update();
    };

    //May remove this TODO
/*
 *    SVGDecoratorSnapEditorWidget.prototype.updateAttributeText = function(attribute){
 *        var textFields = this.$el.find("text"),
 *            fields = textFields.filter("#" + attribute),
 *            item;
 *
 *        this._setTextAndStretch(fields, item.getAttribute(attribute), attribute);
 *    };
 */

    /**
     *Get the information that this decorator will need to update its input fields
     *
     *@this {SVGDecoratorSnapEditorWidget}
     *@return {Object|null}  Dictionary of input content indexed by target pointer name
     */
    SVGDecoratorSnapEditorWidget.prototype.getInputFieldUpdates = function(){
        if (this.inputFieldUpdates){
            return _.extend({}, this.inputFieldUpdates);
        }
        return null;
    };

    /**
     * Update the input field information
     *
     * @this {SVGDecoratorSnapEditorWidget}
     * @param {String} id
     * @param {String} content
     * @param {Array} [options] Only required for dropdown menus
     * @return {Boolean} return true if changed
     */
    SVGDecoratorSnapEditorWidget.prototype.updateInputField = function(id, content, options){
        var changed = false;

        if (this.inputFields[id].content !== content){
            this.inputFields[id].content = content;
            changed = this._inputFields2Update[id] = true;
        }

            if (options && this.inputFields[id].type === SNAP_CONSTANTS.DROPDOWN.NAME){
                assert(options.indexOf(content) !== -1, "Selected option must be one of the available dropdown options");
                if (this.inputFields[id].options !== options){
                    this.inputFields[id].options = options;
                    changed = this._inputFields2Update[id] = true;
                }
            }

        return changed;
    };

    /**
     * Show or hide the given input field visibility
     *
     * @this {SVGDecoratorSnapEditorWidget}
     * @param {String} id
     * @param {Boolean} visible
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidget.prototype.setInputFieldVisibility = function(id, visible){
        this.inputFields[id].visible = visible;
    };

    /**
     * Update the text of the svg if needed (and present).
     *
     * @param {String} attribute Attribute name to update
     * @param {String} newText new text of the attribute
     * @return {Boolean} return true if svg changed in size
     */
    SVGDecoratorSnapEditorWidget.prototype.updateText = function (attribute, newText) {
    //Change this to record the text and not WRITE to the DOM FIXME
        var element = this.$el.find('#' + attribute),
            currentText;

        if (element.length){
            currentText = element.text();
            if (currentText !== newText){
                return this._setTextAndStretch(element, newText, attribute);
            }
        }

        return false;
    };

    /**
     * Set the GME id of the decorator and update the z-index
     *
     * @param {String} newId
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidget.prototype.setGmeId = function (newId) {
        this._metaInfo[CONSTANTS.GME_ID] = newId;
        this.$el.attr("data-id", newId);

        //Update the z-index
        this.zIndex = newId.split("/").length;
        this.$el[0].style.zIndex = this.zIndex;
    };

    /* * * * * * * * * * * * * * * COLORS * * * * * * * * * * * * * * */
    /**
     * Store color info in the decorator.
     *
     * @private
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidget.prototype.initializeColors = function () {
        var colorGroup = this.$svgElement.find("#" + SVG_COLOR_ID);

        this._colorInfo = {};
        
        //Primary or secondary
        this._colorInfo.currentColor = SNAP_CONSTANTS.COLOR_PRIMARY;
        this._colorInfo.supportsMultiColors = false;
        this._colorInfo.needsUpdate = false;

        //actual color
        if (colorGroup.length){
            if (colorGroup[0].hasAttribute("style")){

                this._colorInfo.colors = {};
                this._colorInfo.colors[SNAP_CONSTANTS.COLOR_PRIMARY] = colorGroup[0].getAttribute("style");

                if (colorGroup[0].hasAttribute("data-" + SNAP_CONSTANTS.COLOR_SECONDARY)){
                    this._colorInfo.supportsMultiColors = true;
                    this._colorInfo.colors[SNAP_CONSTANTS.COLOR_SECONDARY] = colorGroup[0].getAttribute("data-" + SNAP_CONSTANTS.COLOR_SECONDARY);

                    this._colorInfo.$el = colorGroup[0];
                }
            }
        }
    };

    SVGDecoratorSnapEditorWidget.prototype._updateColor = function () {
        var newColor = this._colorInfo.colors[this._colorInfo.currentColor];

        if (this._colorInfo.supportsMultiColors){//Change the color
            this._colorInfo.$el.setAttribute("style", newColor);
        }

        this._colorInfo.needsUpdate = false;
    };

    /**
     * Set the color of the current item to it's primary or secondary coloring depending upon the item it is attached to.
     *
     * @param {SVGDecoratorSnapEditorWidget} otherDecorator
     * @return {String} returns the item's color (primary/secondary)
     */
    SVGDecoratorSnapEditorWidget.prototype.setColor = function (otherColor) {
        var changed = false,
            currentColor,
            newColorType;

        if (this._colorInfo.supportsMultiColors){
            currentColor = this.getColor();

            if (otherColor === currentColor){
                newColorType = SNAP_CONSTANTS.COLOR_PRIMARY;

                if (this._colorInfo.currentColor === SNAP_CONSTANTS.COLOR_PRIMARY){
                    newColorType = SNAP_CONSTANTS.COLOR_SECONDARY;
                }

                this._colorInfo.currentColor = newColorType;

                //Needs to update color?
                this._colorInfo.needsUpdate = true;
                changed = true;
            }
        }

        return changed;
    };
    
    SVGDecoratorSnapEditorWidget.prototype.getColor = function () {
        if (this._colorInfo.colors){
            return this._colorInfo.colors[this._colorInfo.currentColor];
        }

        return null;
    };

    /* * * * * * * * * * * * * * * END COLORS * * * * * * * * * * * * * * */

    /* * * * * END of Manipulating the SVG * * * * * */

    /**** Override from SnapEditorWidgetDecoratorBase ****/
    /**
     * Get layout info. All DOM reading must be done here.
     *
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidget.prototype.onRenderGetLayoutInfo = function () {
        this.svgContainerWidth = this.$svgContent.outerWidth(true);
        this.svgWidth = this.$svgContent.find('svg').outerWidth(true);
        this.svgHeight = this.$svgContent.find('svg').outerHeight(true);
        this.svgBorderWidth = parseInt(this.$svgContent.find('svg').css('border-width'), 10);

        this.onRenderGetStretchInfo();

        SnapEditorWidgetDecoratorBase.prototype.onRenderGetLayoutInfo.call(this);
    };

    /**
     * Set layout info. All DOM editing must be done here.
     *
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidget.prototype.onRenderSetLayoutInfo = function () {
        var xShift = Math.ceil((this.svgContainerWidth - this.svgWidth) / 2 + this.svgBorderWidth),
            connectors = this.$el.find('> .' + SNAP_CONSTANTS.CONNECTOR_CLASS);

        connectors.css('transform', 'translateX(' + xShift + 'px)');
        
        //Update the displayed input areas based on newest data
        this.updateInputFields();

        //Update attribute text fields
        this.updateAttributeText();

        //Apply stretching
        this._applyTransforms();

        if (this._colorInfo.needsUpdate){
            this._updateColor();
        }

        SnapEditorWidgetDecoratorBase.prototype.onRenderSetLayoutInfo.call(this);
    };

    /**** Override from SnapEditorWidgetDecoratorBase ****/
    SVGDecoratorSnapEditorWidget.prototype.getConnectionAreas = function (/*, isEnd, connectionMetaInfo*/) {
        var result = [],
            edge = 10,
            xShift = (this.svgContainerWidth - this.svgWidth) / 2;

        if (this._customConnectionAreas && this._customConnectionAreas.length > 0) {
            //custom connections are defined in the SVG itself
            result = $.extend(true, [], this._customConnectionAreas);
            var i = result.length;
            while (i--) {
                if(result[i].role === SNAP_CONSTANTS.CONN_ACCEPTING){
                    //Accepting areas can have multiple possibilities for roles
                    result[i].ptr = result[i].ptr.split(' ');
                }

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
                "y2": 0,
                "role": SNAP_CONSTANTS.CONN_ACCEPTING,
                "ptr": SNAP_CONSTANTS.PTR_NEXT} );

            //South side
            result.push( {"id": "S",
                "x1": edge + xShift,
                "y1": this.svgHeight,
                "x2": this.svgWidth - edge + xShift,
                "y2": this.svgHeight,
                "role": SNAP_CONSTANTS.CONN_PASSING,
                "ptr": SNAP_CONSTANTS.PTR_NEXT} );
        }

        return result;
    };

    /**
     * Remove any connection areas that have ptrs not allowed by META
     *
     * @param {Array} ptrs
     */
    SVGDecoratorSnapEditorWidget.prototype.cleanConnections = function (ptrs) {
        if (this._customConnectionAreas){
            var i = this._customConnectionAreas.length;
            while (i--){
                if (this._customConnectionAreas[i].role === SNAP_CONSTANTS.CONN_PASSING && ptrs.indexOf(this._customConnectionAreas[i].ptr) === -1){
                        this._customConnectionAreas.splice(i, 1);
                    }
            }
        } 
    };

    /**
     * Get a specific connection area
     *
     * @param {String} ptr
     * @param {String} role
     * @return {Object|null} Connection Area
     */
    SVGDecoratorSnapEditorWidget.prototype.getConnectionArea = function (ptr, role) {
        //Returns the first (and should be only) connection area of the given type
        var areas = this.getConnectionAreas(),
            area;

        while(areas.length){
            area = areas.pop();
            //If the area has the role or is unspecified
            if((!role || area.role === role) && (!ptr || area.ptr === ptr || (area.ptr instanceof Array && area.ptr.indexOf(ptr) !== -1))){
                return area;
            }
        }

        return null;
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


    /**** Override from SnapEditorWidgetDecoratorBase ****/
    SVGDecoratorSnapEditorWidget.prototype.notifyComponentEvent = function (componentList) {
        var len = componentList.length;
        while (len--) {
            this._updatePort(componentList[len].id);
        }
    };

    return SVGDecoratorSnapEditorWidget;
});
