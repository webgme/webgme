/*globals define,_*/

/*
 * @author brollb / https://github/brollb
 */

define(['js/Constants',
        'common/util/assert',
        'js/Widgets/BlockEditor/BlockEditorWidget.DecoratorBase',
        'js/Widgets/BlockEditor/BlockEditorWidget.DecoratorBase.ConnectionAreas',
        'js/Widgets/BlockEditor/BlockEditorWidget.DecoratorBase.Stretch',
        'js/Widgets/BlockEditor/BlockEditorWidget.Constants',
        'text!../Core/SVGDecorator.html',
        './SVGDecorator.Core',
        'js/Utils/DisplayFormat',
        'css!./SVGDecorator.BlockEditorWidget'], function (CONSTANTS,
                                                          assert,
                                                          BlockEditorWidgetDecoratorBase,
                                                          BlockEditorWidgetDecoratorBaseConnectionAreas,
                                                          BlockEditorWidgetDecoratorBaseStretch,
                                                          BLOCK_CONSTANTS,
                                                          SVGDecoratorTemplate,
                                                          SVGDecoratorCore,
                                                          DisplayFormat) {

    "use strict";

    var SVGDecoratorBlockEditorWidget,
        DECORATOR_ID = "SVGDecoratorBlockEditorWidget",
        SVG_COLOR_ID = "colors",
        EMPTY_STRING = "_",//svg text elements need a value to getBBox
        EMPTY_STYLE = "opacity:0;",//svg text elements need a value to getBBox
        EDIT_TEXT = { VERTICAL_PADDING: 2, HORIZONTAL_PADDING: 5, MIN_WIDTH: 30};

    /**
     * SVGDecoratorBlockEditorWidget
     *
     * @constructor
     * @param {Object} options
     * @return {undefined}
     */
    SVGDecoratorBlockEditorWidget = function (options) {
        var opts = _.extend( {}, options);

        BlockEditorWidgetDecoratorBase.apply(this, [opts]);
        SVGDecoratorCore.apply(this, [opts]);

        this._initializeVariables({ data: [BLOCK_CONSTANTS.CONNECTION_HIGHLIGHT, 
            BLOCK_CONSTANTS.INITIAL_MEASURE, BLOCK_CONSTANTS.INPUT_FIELDS], connectors: false});

        this._selfPatterns = {};

        //stretchers are things that cause an svg stretch (attribute name or ptr name)
        this.initializeStretchability(options.decoratorParams.stretchers);

        //Attributes in text fields
        this._attributes = {};//Only if they have a text field for it
        this._textFieldStyles = {};//initial styles of editable text fields

        this.logger.debug("SVGDecoratorBlockEditorWidget ctor");
    };

    /************************ INHERITANCE *********************/
    _.extend(SVGDecoratorBlockEditorWidget.prototype, BlockEditorWidgetDecoratorBase.prototype);
    _.extend(SVGDecoratorBlockEditorWidget.prototype, BlockEditorWidgetDecoratorBaseConnectionAreas.prototype);
    _.extend(SVGDecoratorBlockEditorWidget.prototype, SVGDecoratorCore.prototype);
    _.extend(SVGDecoratorBlockEditorWidget.prototype, BlockEditorWidgetDecoratorBaseStretch.prototype);

    /**************** OVERRIDE INHERITED / EXTEND ****************/

    /**** Override from BlockEditorWidgetDecoratorBase ****/
    SVGDecoratorBlockEditorWidget.prototype.DECORATORID = DECORATOR_ID;


    /**** Override from BlockEditorWidgetDecoratorBase ****/
    SVGDecoratorBlockEditorWidget.prototype.$DOMBase = $(SVGDecoratorTemplate);

    /**** Override from BlockEditorWidgetDecoratorBase ****/
    /**
     * This is called before the item is added to the canvas DOM. The item must create it's
     * DOM representation.
     *
     * @return {undefined}
     */
    SVGDecoratorBlockEditorWidget.prototype.on_addTo = function () {
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
                     width = Math.max(box.width + EDIT_TEXT.HORIZONTAL_PADDING, EDIT_TEXT.MIN_WIDTH);
                     tempName.css('width', width);
                     tempName.css('height', box.height + EDIT_TEXT.VERTICAL_PADDING);

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
     * @this {SVGDecoratorBlockEditorWidget}
     * @param {String} attributeName
     * @param {String} value
     * @return {undefined} 
     */
    SVGDecoratorBlockEditorWidget.prototype._saveAttributeChange = function(attributeName, value){
        var client = this._control._client;

        client.setAttributes(this._metaInfo[CONSTANTS.GME_ID], attributeName, value);
    };


    /**** Attributes ****/
    SVGDecoratorBlockEditorWidget.prototype.removeAttributeText = function (attr) {
        var fields;

        if (this._attributes.hasOwnProperty( attr )){
            fields = this.$el.find('text').filter('#' + attr);
            fields.remove();
            delete this._attributes[attr];
        }
    };

    SVGDecoratorBlockEditorWidget.prototype.updateAttributeContent = function (attr, value) {
        if (this._attributes.hasOwnProperty(attr)){
            this._attributes[attr].value = value;
        }
    };

    SVGDecoratorBlockEditorWidget.prototype.setAttributeEnabled = function (attr, enabled) {
        if (this._attributes.hasOwnProperty(attr)){
            this._attributes[attr].enabled = enabled;
        }
    };

    /**
     * Update the text in the svg for the attribute specified (or all attributes is none 
     * provided)
     *
     * @param {String} attribute (optional)
     * @return {undefined}
     */
    SVGDecoratorBlockEditorWidget.prototype.updateAttributeText = function (attribute) {
        var attributes,
            textFields = this.$el.find('text'),
            attr,
            enabled,
            options,
            value,
            fields;

        if (this._attributes[attribute] !== undefined){
            attributes = [attribute];
        } else {
            attributes = Object.keys(this._attributes);
        }

        while (attributes.length){
            attr = attributes.pop();
            enabled = this._attributes[attr].enabled;
            value = this._attributes[attr].value;
            fields = textFields.filter("#" + attr);

            //If they are "" or whitespace, the text will not have a BBox
            //and the edit box will be messed up (hence the EMPTY_STRING, EMPTY_STYLE)
            if (!enabled || /^[ ]*$/.test(value)){
                options = { style: EMPTY_STYLE };
                value = EMPTY_STRING;

            } else {
                    options = { style: this._textFieldStyles[attr] || null };
            }

            if (fields.length){
                this._setTextAndStretch(fields, value, attr, options);
            }
        }
    };

    /**
     * Update item's input fields' DOMs as needed.
     *
     * @private
     * @return {undefined}
     */
    SVGDecoratorBlockEditorWidget.prototype.updateInputFields = function () {
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
                    if (this.inputFields[field].type === BLOCK_CONSTANTS.TEXT_FIELD.NAME){
                        //Create a text field
                        input = $('<input>', { id: field, type: "text", text: this.inputFields[field].content });
                    } else if (this.inputFields[field].type === BLOCK_CONSTANTS.DROPDOWN.NAME){
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

    /**** Override from BlockEditorWidgetCore ****/
    SVGDecoratorBlockEditorWidget.prototype._renderContent = function () {
        var client = this._control._client;

        this.$el.attr({"data-id": this._metaInfo[CONSTANTS.GME_ID]});
        this.zIndex = this._metaInfo[CONSTANTS.GME_ID].split("/").length;

        //Set z-index
        this.$el[0].style.zIndex = this.zIndex;

        /* BUILD UI*/
        //find placeholders
        this.$name = this.$el.find("." + BLOCK_CONSTANTS.NAME);
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
        var name = this.$svgContent.find("#" + BLOCK_CONSTANTS.NAME);
        if(name[0] !== undefined && name[0].tagName === "text"){
            this.$name = name;
        }

        var attributes = this.hostDesignerItem.attributes,
            attrList = Object.keys(attributes),
            textFields = this.$el.find("text"),
            editFields,
            attr,
            fields,
            self = this,
            editText,
            getEditText = function(id){//get edit fn for given attribute
                return function (event) {
                    if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                        var element = self.$el.find('#' + id),
                            box,
                            width,
                            fontSize = $(element).css('font-size'),
                            text = "",
                            tempName = $('<div/>', { id: id + '-edit' });

                        if (element[0].getAttribute('style') !== EMPTY_STYLE){
                            text = element.text();
                        }

                        self.$svgContent.append(tempName);
                        tempName.css('position', 'absolute');

                        box = $(element)[0].getBBox();
                        width = Math.max(box.width + EDIT_TEXT.HORIZONTAL_PADDING, EDIT_TEXT.MIN_WIDTH);

                        //Set tempName
                        tempName.css('left', box.x + self._transforms[id].shift.x);
                        tempName.css('top', box.y);
                        tempName.css('width', width);
                        tempName.css('font-size', fontSize);

                        $(tempName).editInPlace({"class": id + "-edit",
                            "enableEmpty": true,
                            "value": text,
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
            };

        for (var i = 0; i < attrList.length; i++){
            attr = attrList[i];
            this._attributes[ attr ] = { enabled: true, value: attributes[attr].value+"" };
            fields = textFields.filter("#" + attr);

            if (attr !== "name"){//name requires double click to edit
                //Make the fields editable
                editText = getEditText(attr);
                fields.on("click", null, editText);

                //Add support for clicking on a box around the text to edit the text
                editFields = this.$el.find(".edit-" + attr);
                editFields.on("click", null, editText);

                //Record the initial styles of every field
                this._textFieldStyles[attr] = [];
                for (var j = 0; j <= fields.length-1; j++){
                    this._textFieldStyles[attr].push(fields[j].getAttribute("style"));
                }
            }

        }

        this.update();
    };

    /**
     *Get the information that this decorator will need to update its input fields
     *
     *@this {SVGDecoratorBlockEditorWidget}
     *@return {Object|null}  Dictionary of input content indexed by target pointer name
     */
    SVGDecoratorBlockEditorWidget.prototype.getInputFieldUpdates = function(){
        if (this.inputFieldUpdates){
            return _.extend({}, this.inputFieldUpdates);
        }
        return null;
    };

    /**
     * Update the input field information
     *
     * @this {SVGDecoratorBlockEditorWidget}
     * @param {String} id
     * @param {String} content
     * @param {Array} [options] Only required for dropdown menus
     * @return {Boolean} return true if changed
     */
    SVGDecoratorBlockEditorWidget.prototype.updateInputField = function(id, content, options){
        var changed = false;

        if (this.inputFields[id].content !== content){
            this.inputFields[id].content = content;
            changed = this._inputFields2Update[id] = true;
        }

            if (options && this.inputFields[id].type === BLOCK_CONSTANTS.DROPDOWN.NAME){
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
     * @this {SVGDecoratorBlockEditorWidget}
     * @param {String} id
     * @param {Boolean} visible
     * @return {undefined}
     */
    SVGDecoratorBlockEditorWidget.prototype.setInputFieldVisibility = function(id, visible){
        this.inputFields[id].visible = visible;
    };

    /**
     * Set the GME id of the decorator and update the z-index
     *
     * @param {String} newId
     * @return {undefined}
     */
    SVGDecoratorBlockEditorWidget.prototype.setGmeId = function (newId) {
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
    SVGDecoratorBlockEditorWidget.prototype.initializeColors = function () {
        var colorGroup = this.$svgElement.find("#" + SVG_COLOR_ID);

        this._colorInfo = {};
        
        //Primary or secondary
        this._colorInfo.currentColor = BLOCK_CONSTANTS.COLOR_PRIMARY;
        this._colorInfo.supportsMultiColors = false;
        this._colorInfo.needsUpdate = false;

        //actual color
        if (colorGroup.length){
            if (colorGroup[0].hasAttribute("style")){

                this._colorInfo.colors = {};
                this._colorInfo.colors[BLOCK_CONSTANTS.COLOR_PRIMARY] = colorGroup[0].getAttribute("style");

                if (colorGroup[0].hasAttribute("data-" + BLOCK_CONSTANTS.COLOR_SECONDARY)){
                    this._colorInfo.supportsMultiColors = true;
                    this._colorInfo.colors[BLOCK_CONSTANTS.COLOR_SECONDARY] = colorGroup[0].getAttribute("data-" + BLOCK_CONSTANTS.COLOR_SECONDARY);

                    this._colorInfo.$el = colorGroup[0];
                }
            }
        }
    };

    SVGDecoratorBlockEditorWidget.prototype._updateColor = function () {
        var newColor = this._colorInfo.colors[this._colorInfo.currentColor];

        if (this._colorInfo.supportsMultiColors){//Change the color
            this._colorInfo.$el.setAttribute("style", newColor);
        }

        this._colorInfo.needsUpdate = false;
    };

    /**
     * Set the color of the current item to it's primary or secondary coloring depending upon the item it is attached to.
     *
     * @param {SVGDecoratorBlockEditorWidget} otherDecorator
     * @return {String} returns the item's color (primary/secondary)
     */
    SVGDecoratorBlockEditorWidget.prototype.setColor = function (otherColor) {
        var changed = false,
            currentColor,
            newColorType;

        if (this._colorInfo.supportsMultiColors){
            currentColor = this.getColor();

            if (otherColor === currentColor){
                newColorType = BLOCK_CONSTANTS.COLOR_PRIMARY;

                if (this._colorInfo.currentColor === BLOCK_CONSTANTS.COLOR_PRIMARY){
                    newColorType = BLOCK_CONSTANTS.COLOR_SECONDARY;
                }

                this._colorInfo.currentColor = newColorType;

                //Needs to update color?
                this._colorInfo.needsUpdate = true;
                changed = true;
            }
        }

        return changed;
    };
    
    SVGDecoratorBlockEditorWidget.prototype.getColor = function () {
        if (this._colorInfo.colors){
            return this._colorInfo.colors[this._colorInfo.currentColor];
        }

        return null;
    };

    /* * * * * * * * * * * * * * * END COLORS * * * * * * * * * * * * * * */

    /* * * * * END of Manipulating the SVG * * * * * */

    /**** Override from BlockEditorWidgetDecoratorBase ****/
    /**
     * Get layout info. All DOM reading must be done here.
     *
     * @return {undefined}
     */
    SVGDecoratorBlockEditorWidget.prototype.onRenderGetLayoutInfo = function () {
        this.svgContainerWidth = this.$svgContent.outerWidth(true);
        this.svgWidth = this.$svgContent.find('svg').outerWidth(true);
        this.svgHeight = this.$svgContent.find('svg').outerHeight(true);
        this.svgBorderWidth = parseInt(this.$svgContent.find('svg').css('border-width'), 10);

        this.onRenderGetStretchInfo();

        BlockEditorWidgetDecoratorBase.prototype.onRenderGetLayoutInfo.call(this);
    };

    /**
     * Set layout info. All DOM editing must be done here.
     *
     * @return {undefined}
     */
    SVGDecoratorBlockEditorWidget.prototype.onRenderSetLayoutInfo = function () {
        var xShift = Math.ceil((this.svgContainerWidth - this.svgWidth) / 2 + this.svgBorderWidth),
            connectors = this.$el.find('> .' + BLOCK_CONSTANTS.CONNECTOR_CLASS);

        connectors.css('transform', 'translateX(' + xShift + 'px)');
        
        //Update the displayed input areas based on newest data
        this.updateInputFields();

        //Apply stretching
        this._applyTransforms();

        if (this._colorInfo.needsUpdate){
            this._updateColor();
        }

        BlockEditorWidgetDecoratorBase.prototype.onRenderSetLayoutInfo.call(this);
    };

    /**** Override from BlockEditorWidgetDecoratorBase ****/
    SVGDecoratorBlockEditorWidget.prototype.getConnectionAreas = function () {
        var result = [],
            edge = 10,
            xShift = (this.svgContainerWidth - this.svgWidth) / 2;

        if (this._customConnectionAreas && this._customConnectionAreas.length > 0) {
            //custom connections are defined in the SVG itself
            result = $.extend(true, [], this._customConnectionAreas);
            var i = result.length;
            while (i--) {
                if(result[i].role === BLOCK_CONSTANTS.CONN_INCOMING){
                    //Incoming connection areas don't specify ptr
                    result[i].ptr = null;
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
                "role": BLOCK_CONSTANTS.CONN_INCOMING} );

            //South side
            result.push( {"id": "S",
                "x1": edge + xShift,
                "y1": this.svgHeight,
                "x2": this.svgWidth - edge + xShift,
                "y2": this.svgHeight,
                "role": BLOCK_CONSTANTS.CONN_OUTGOING,
                "ptr": BLOCK_CONSTANTS.PTR_NEXT} );
        }

        return result;
    };

    /**
     * Remove any connection areas that have ptrs not allowed by META
     *
     * @param {Array} ptrs
     */
    SVGDecoratorBlockEditorWidget.prototype.cleanConnections = function (ptrs) {
        if (this._customConnectionAreas){
            var i = this._customConnectionAreas.length;
            while (i--){
                if (this._customConnectionAreas[i].role === BLOCK_CONSTANTS.CONN_OUTGOING && ptrs.indexOf(this._customConnectionAreas[i].ptr) === -1){
                        this._customConnectionAreas.splice(i, 1);
                    }
            }
        } 
    };

    /**
     * Get a specific connection area.
     *
     * @param {Object} params
     * @return {Object|null} Connection Area
     */
    SVGDecoratorBlockEditorWidget.prototype._getConnectionArea = function (params) {
        return this._filterConnectionAreas(this._customConnectionAreas, params);
    };

    /**
     * Get a specific connection area (cloned).
     *
     * @param {Object} params
     * @return {Object|null} Connection Area
     */
    SVGDecoratorBlockEditorWidget.prototype.getConnectionArea = function (params) {
        return this._filterConnectionAreas(this.getConnectionAreas(), params);
    };

    SVGDecoratorBlockEditorWidget.prototype._filterConnectionAreas = function (areas, params) {
        //Returns the first (and should be only) connection area matching params
        var attributes = Object.keys(params),
            criteria,
            matchCount,
            area,
            j = areas.length;

        while(j--){
            area = areas[j];
            matchCount = 0;
            for (var i = 0; i < attributes.length; i++){

                criteria = params[attributes[i]];
                if (_.isFunction(criteria)){
                    if (criteria(area[attributes[i]])){
                        matchCount++;
                    }
                } else {
                    if (area[attributes[i]] === criteria){
                        matchCount++;
                    }
                }
            }

            if (matchCount === attributes.length){
                return area;
            }
        }

        return null;
    };


    /**** Override from BlockEditorWidgetDecoratorBase ****/
    //Shows the 'connectors' - appends them to the DOM
    SVGDecoratorBlockEditorWidget.prototype.showSourceConnectors = function (/*params*/) {
    };

    /**** Override from BlockEditorWidgetDecoratorBase ****/
    //Hides the 'connectors' - detaches them from the DOM
    SVGDecoratorBlockEditorWidget.prototype.hideSourceConnectors = function () {
    };


    /**** Override from BlockEditorWidgetDecoratorBase ****/
    //should highlight the connectors for the given elements
    SVGDecoratorBlockEditorWidget.prototype.showEndConnectors = function (params) {
       this.showSourceConnectors(params);
    };


    /**** Override from BlockEditorWidgetDecoratorBase ****/
    //Hides the 'connectors' - detaches them from the DOM
    SVGDecoratorBlockEditorWidget.prototype.hideEndConnectors = function () {
        this.hideSourceConnectors();
    };


    /**** Override from BlockEditorWidgetDecoratorBase ****/
    SVGDecoratorBlockEditorWidget.prototype.notifyComponentEvent = function (componentList) {
        var len = componentList.length;
        while (len--) {
            this._updatePort(componentList[len].id);
        }
    };

    /**** Override from BlockEditorWidgetDecoratorBase ****/
    SVGDecoratorBlockEditorWidget.prototype.calculateDimension = function () {
        var width,
            height;

        if (this.hostDesignerItem){
            if (this._svgSize){
                width = this._svgSize.width;
                height = this._svgSize.height;
            } else {
                width = this.$el.outerWidth(true);
                height = this.$el.outerHeight(true);
            }

            //Update the host item  
            this.hostDesignerItem.setSize(width, height);
        }
    };

    /**** Override from BlockEditorWidgetDecoratorBase ****/

    return SVGDecoratorBlockEditorWidget;
});
