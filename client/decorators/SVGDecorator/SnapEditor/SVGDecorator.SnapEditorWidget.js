/*globals define,_*/

/*
 * @author brollb / https://github/brollb
 */

define(['js/Constants',
        'util/assert',
        'js/NodePropertyNames',
        'js/Widgets/SnapEditor/SnapEditorWidget.DecoratorBase',
        'js/Widgets/SnapEditor/SnapEditorWidget.DecoratorBase.ConnectionAreas',
        'js/Widgets/SnapEditor/SnapEditorWidget.Constants',
        'text!../Core/SVGDecorator.html',
        './SVGDecorator.Core',
        'css!./SVGDecorator.SnapEditorWidget'], function (CONSTANTS,
                                                          assert,
                                                          nodePropertyNames,
                                                          SnapEditorWidgetDecoratorBase,
                                                          SnapEditorWidgetDecoratorBaseConnectionAreas,
                                                          SNAP_CONSTANTS,
                                                          SVGDecoratorTemplate,
                                                          SVGDecoratorCore) {

    "use strict";
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
        DECORATOR_ID = "SVGDecoratorSnapEditorWidget",
        SVG_COLOR_ID = "colors",
        SVG_SECONDARY_COLOR_ID = "secondary",
        AXIS = { X:'x', Y:'y' };//constants for stretching

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
        
        //Stretching stuff
        this._transforms = {};//The current abs stretch of any svg element in the SVG
        this._classTransforms = {};//The current abs stretch of any class in the SVG
        this._minDims = {};

        this.svgContainerWidth = 0;
        this.svgWidth = 0;
        this.svgHeight = 0;
        this.svgBorderWidth = 0;
        this.svgInitialStretch = {};//Initial stretch values to allow for snug fit

        //Stuff about contained info
        this.childIds = [];
        this.children = {};

        this.logger.debug("SVGDecoratorSnapEditorWidget ctor");
    };

    /************************ INHERITANCE *********************/
    _.extend(SVGDecoratorSnapEditorWidget.prototype, SnapEditorWidgetDecoratorBase.prototype);
    _.extend(SVGDecoratorSnapEditorWidget.prototype, SnapEditorWidgetDecoratorBaseConnectionAreas.prototype);
    _.extend(SVGDecoratorSnapEditorWidget.prototype, SVGDecoratorCore.prototype);

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

        // set title editable on double-click if editable
        if (this.$name.attr('data-editable')){
            this.$name.on("dblclick.editOnDblClick", null, function (event) {
                if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                    var id = $(this).attr('id'),
                    tempName = $('<div/>', { id: id + '-edit', 
                                 text: $(this).text()});

                                 self.$el.append(tempName);
                                 tempName.css('left', $(this).attr('x'));
                                 tempName.css('top', $(this).attr('y'));

                                 $(tempName).editInPlace({"class": id + "-edit",
                                                         "value": self.name,
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

        //Update the displayed input areas based on newest data
        this.updateInputFields();

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

    };

    /**
     * Update item's input fields' DOMs as needed.
     *
     * @private
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidget.prototype.updateInputFields = function () {
        var fields = Object.keys(this._inputFields2Update),
            container,
            input,
            field;

        for (var i = fields.length-1; i >= 0; i--) {
            //Get the div containing this input field or create one
            field = fields[i];
            input = null;
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
                //Register event listener
                //TODO
                /*
                 *input.click(function(e){
                 *    console.log("CLICKED ON " + field + " Field");
                 *});
                 */
                container.append(input);
            }

            delete this._inputFields2Update[field];
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

        //If it has a "name" text id in the svg, use that instead of $name
        //This allows for the svg to fall back to a separate name div if
        //no spot for it in the svg
        var name = this.$svgContent.find("#" + SNAP_CONSTANTS.NAME);
        if(name[0] !== undefined && name[0].tagName === "text"){
            this.$name.remove();
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
                    tempName = $('<div/>', { id: id + '-edit', 
                         text: $(this).text()}),
                    element = $(this);

                    self.$el.append(tempName);
                    tempName.css('left', $(this).attr('x'));
                    tempName.css('top', $(this).attr('y'));

                    $(tempName).editInPlace({"class": id + "-edit",
                        "value": $(this).text(),
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
    SVGDecoratorSnapEditorWidget.prototype.updateAttributeText = function(attribute){
        var textFields = this.$el.find("text"),
            fields = textFields.filter("#" + attribute),
            item;

        this._setTextAndStretch(fields, item.getAttribute(attribute), attribute);
    };

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
     * Set the text of a DOM element and stretch by the change in size
     *
     * @param {DOM Element} element
     * @param {String} newText
     * @param {String} stretchId
     * @return {Boolean} return true if size has changed
     */
    SVGDecoratorSnapEditorWidget.prototype._setTextAndStretch = function (element, newText, stretchId) {
        var oldText = element.text(),
            oldWidth = element.width(),
            newWidth;

        if (oldText === newText){
            return false;
        }

        element.text(newText);

        if(element.width() === 0 && oldWidth === 0){
            //Assume that it hasn't been drawn yet.
            //Approx the pixel length by relative name change
            //FIXME Find a better way to approximate this...
            //I could add a "name container" invisible rect... 
            var bBox = this.$svgContent.find("#" + stretchId +"-bounding-box"),
                approxWidth;

            if (bBox.length){
                bBox = bBox[0];
                approxWidth = parseFloat(bBox.getAttribute("width"));
                newWidth = approxWidth * (element.text().length/oldText.length);
                return this.stretchTo(stretchId, { x: newWidth });
            }

        }else{
            return this.stretchTo(stretchId, { x: element.width() });
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

    /* * * * Manipulating the SVG * * * */
    //Stretching
    /**
     * Stretch the svg to a given x,y with respect to a stretching id
     *
     * @param {String} id
     * @param {Object} size {x: x, y: y}
     * @return {Boolean} true if the svg has changed in size
     */
    SVGDecoratorSnapEditorWidget.prototype.stretchTo = function (id, size) {
        //Stretch according to the x,y values where x,y are
        //dimensions of the items pointed to by "id"
        var changed = false,
            x = size.x,
            y = size.y,
            dx,
            dy;

        if (x < 0 || y < 0){
            this.logger.warn("Cannot resize svg to negative size!");
        }

        //classTransforms keeps track of the current size of the stuff 
        //associated with the given pointer
        if (!this._classTransforms[id]){
            if (this.svgInitialStretch[id]){
                this._classTransforms[id] = { x: this.svgInitialStretch[id].x,
                    y: this.svgInitialStretch[id].y };
            } else {
                this._classTransforms[id] = { x: 0, y: 0 };
            }
        }

        //Set initial stretch values if undefined
        if (!this.svgInitialStretch[id]){
            this.svgInitialStretch[id] = { x: 0, y: 0 };
        } 

        //stretch x
        if (x !== undefined){//Don't shrink past initial
            x = Math.max(x, this.svgInitialStretch[id].x);
            dx = x - this._classTransforms[id].x;

            if (dx){
                this.stretch(id, AXIS.X, dx);
                this._classTransforms[id].x = x;
                changed = true;
            }
        }


        //stretch y
        if (y !== undefined){

            y = Math.max(y, this.svgInitialStretch[id].y);//Don't shrink past initial
            dy = y - this._classTransforms[id].y;

            //update size attached to ptr
            if (dy){
                this.stretch(id, AXIS.Y, dy);
                this._classTransforms[id].y = y;
                changed = true;
            }
        }

        return changed;
    };

    /**
     * Stretch the svg by delta along the coordinate plane, axis, with respect to the id
     *
     * @param {String} id
     * @param {String} axis
     * @param {Number} delta
     * @return {Number} Current size of the svg along the given axis
     */
    SVGDecoratorSnapEditorWidget.prototype.stretch = function (id, axis, delta) {
        var stretchClass = axis + "-stretch-" + id,
            shiftClass = axis + "-shift-" + id,
            stretchElements = this.$svgContent.find("." + stretchClass),
            shiftElements = this.$svgContent.find("." + shiftClass),
            maxSize = 0,
            dim = axis === AXIS.X ? "width" : "height",
            width,
            height,
            svgId,
            shift = {},
            stretch = {},
            i;

        shift[axis] = delta;
        this._shiftConnectionAreas(shiftClass, shift);

        stretch[axis] = delta;
        this._stretchCustomConnectionHighlightAreas(stretchClass, stretch);
        
        //Initialize elements as needed
        this._initializeSvgElements(stretchElements);
        this._initializeSvgElements(shiftElements);
        //Done initializing


        //Stretch the SVG by delta
        var displacement = {},
            x,
            y;

        i = stretchElements.length;
        while(i--){
            svgId = stretchElements[i].getAttribute("id");

            if(!svgId){
                this.logger.error("SVG should have an ID");
            }

            //Update the stretch of the given svg element
            this._transforms[svgId][dim] += delta;
            maxSize = Math.max(maxSize, this._transforms[svgId][dim]);

            this._updateSVGTransforms( stretchElements[i], svgId);
        }    

        i = shiftElements.length;
        while(i--){
            svgId = shiftElements[i].getAttribute("id");

            this._transforms[svgId].shift[axis] += delta;

            this._updateSVGTransforms(shiftElements[i], svgId);
        }    

        //Adjust the overall svg if necessary
        var currentSVGSize = parseFloat(this.$svgElement[0].getAttribute(dim)) + delta;

        if(stretchElements.length || shiftElements.length){
            this.$svgElement[0].setAttribute(dim, Math.max(currentSVGSize, maxSize));//Expand if needed
            return Math.max(currentSVGSize, maxSize);
        }

        return currentSVGSize;
    };

    /**
     * Initialize variables
     *
     * @param {Array} elements
     */
    SVGDecoratorSnapEditorWidget.prototype._initializeSvgElements = function (elements) {
        var svgId,
            width,
            height,
            i = elements.length;

        while(i--){
            svgId = elements[i].getAttribute("id");

            if(!svgId){
                svgId = this._genSVGId();
                elements[i].setAttribute("id", svgId);
            }

            if(!this._transforms[svgId]){//Initialize transform if needed

                if(elements[i].tagName === "line"){
                    width = parseFloat(elements[i].getAttribute("x2")) - parseFloat(elements[i].getAttribute("x1"));
                    height = parseFloat(elements[i].getAttribute("y2")) - parseFloat(elements[i].getAttribute("y1"));
                }else if(elements[i].tagName === "rect"){
                    width = parseFloat(elements[i].getAttribute("width"));
                    height = parseFloat(elements[i].getAttribute("height"));
                }else if(elements[i].tagName === "path"){
                    width = null;
                    height = null;
                }
                    this._transforms[svgId] = { shift: { x: 0, y: 0 }, width: width, height: height };
                    this._minDims[svgId] = { width: width, height: height };
            }
        }
    };

    /**
     * Shift the connection areas by "shift" with respect to shiftClass
     *
     * @param {String} shiftClass
     * @param {Number} shift
     */
    SVGDecoratorSnapEditorWidget.prototype._shiftConnectionAreas = function (shiftClass, shift) {
        if (this._customConnectionAreas){

            var i = this._customConnectionAreas.length;

            while(i--){
                if(this._customConnectionAreas[i].shift && this._customConnectionAreas[i].shift.indexOf(shiftClass) !== -1){
                       //shift the connection area
                       this._customConnectionAreas[i].x1 += shift.x || 0;
                       this._customConnectionAreas[i].x2 += shift.x || 0;

                       this._customConnectionAreas[i].y1 += shift.y || 0;
                       this._customConnectionAreas[i].y2 += shift.y || 0;
                   }
            }
        }
        
        this._shiftCustomConnectionHighlightAreas(shiftClass, shift);
    };

    /**
     * Shift the connection highlight areas by "shift" with respect to shiftClass
     *
     * @param {String} shiftClass
     * @param {Number} shift
     */
    SVGDecoratorSnapEditorWidget.prototype._shiftCustomConnectionHighlightAreas = function (shiftClass, shift) {
        if (this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT]){

            var i = this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT].length;

            while(i--){
                if(this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].class && this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].class.indexOf(shiftClass) !== -1){
                       //shift the connection area highlight
                       this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].x1 += shift.x || 0;
                       this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].x2 += shift.x || 0;

                       this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].y1 += shift.y || 0;
                       this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].y2 += shift.y || 0;
                   }
            }
        }
    };

    /**
     * Stretch custom connection highlight areas of the item.
     *
     * @private
     * @param {String} stretchClass
     * @param {Number} stretch
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidget.prototype._stretchCustomConnectionHighlightAreas = function (stretchClass, stretch) {
        if (this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT]){

            var i = this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT].length;

            while(i--){
                if(this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].class && this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].class.indexOf(stretchClass) !== -1){
                       //stretch the connection area highlight
                       this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].x2 += stretch.x || 0;
                       this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].y2 += stretch.y || 0;
                   }
            }
        }
    };

    /**
     * Set the color of the item to it's primary or secondary coloring depending upon the item it is attached to.
     *
     * @param {SVGDecoratorSnapEditorWidget} otherDecorator
     * @param {SVGDecoratorSnapEditorWidget} otherColor
     * @return {String} returns the item's color (primary/secondary)
     */
    SVGDecoratorSnapEditorWidget.prototype.setColor = function (otherDecorator, otherColor) {
        //Check to see if it has a filter
        //If so, 
        var areSameColor = false,
            secondary = this.$svgElement.find("#" + SVG_SECONDARY_COLOR_ID),
            color = SNAP_CONSTANTS.COLOR_PRIMARY,
            filterName = SVG_SECONDARY_COLOR_ID,
            colorGroup = this.$svgElement.find("#" + SVG_COLOR_ID),
            colors = colorGroup.data(),
            otherColorGroup = otherDecorator.$svgElement.find("#" + SVG_COLOR_ID),
            i = secondary.length;

        //Figure out if the decorators are the same color
        if (colorGroup.length && otherColorGroup.length){
            colorGroup = colorGroup[0];
            otherColorGroup = otherColorGroup[0];

            areSameColor = colorGroup.getAttribute("style") === otherColorGroup.getAttribute("style");
        }

        var filter = null;
        while (i-- && !filter){//find the filter
            if (secondary[i].tagName === "filter"){
                filter = secondary[i];
            }
        }

        var hasFilter = filter !== null,
            hasColors = colors instanceof Object ? Object.keys(colors).length > 0 : false;

        if (areSameColor && (hasFilter || hasColors)){//has filter and color group

            switch(otherColor){
                case SNAP_CONSTANTS.COLOR_PRIMARY:
                    if (hasFilter){
                        colorGroup.setAttribute("filter", "url(#" + SVG_SECONDARY_COLOR_ID + ")");
                    } else if (hasColors){//Change the color
                        if (!colorGroup.hasAttribute("data-" + SNAP_CONSTANTS.COLOR_PRIMARY)){
                            colorGroup.setAttribute("data-" + SNAP_CONSTANTS.COLOR_PRIMARY,
                                    colorGroup.getAttribute("style"));
                        }
                        colorGroup.setAttribute("style", colorGroup.getAttribute("data-" + SNAP_CONSTANTS.COLOR_SECONDARY));

                    }

                    color = SNAP_CONSTANTS.COLOR_SECONDARY;
                    break;

                case SNAP_CONSTANTS.COLOR_SECONDARY:
                    if (hasFilter){
                        if (colorGroup.hasAttribute("filter")){
                            colorGroup.removeAttribute("filter");
                        }
                    } else if (hasColors){//Set the color
                        if (colorGroup.hasAttribute("data-" + SNAP_CONSTANTS.COLOR_PRIMARY)){
                            colorGroup.setAttribute("style", colorGroup.getAttribute("data-" + SNAP_CONSTANTS.COLOR_PRIMARY));
                        }
                    }
                    break;

                default:
                    //ERROR - COLOR NOT RECOGNIZED
                    this.logger.debug("Decorator color not recognized: " + otherColor);
            }
        }

        return color;
    };

    /* * * * * END of Manipulating the SVG * * * * * */

    /**
     * Randomly generate ID between 0,10000 for identifying svg elements.
     *
     * @private
     * @return {String} id
     */
    SVGDecoratorSnapEditorWidget.prototype._genSVGId = function () {
        //
        var id = "SVG_" + Math.random()*10000;

        while(this._transforms[id]){
            id = "SVG_" + Math.random()*10000;
        }

        return id;
    };

    //Drawing the internal objects
    //OVERRIDE FROM BASE
    SVGDecoratorSnapEditorWidget.prototype._updateExtras = function () {
        //Update the internal objects...
        //May require redrawing of the current svg

        //TODO
    };

    SVGDecoratorSnapEditorWidget.prototype._updateChildIDList = function () {
        //Update children ID's
        //TODO
    };

    SVGDecoratorSnapEditorWidget.prototype.renderChild = function () {
        //Return the svg to be drawn...
        //TODO
        //return new SVGDecoratorSnapEditorWidget();
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
            connectors = this.$el.find('> .' + SNAP_CONSTANTS.CONNECTOR_CLASS);

        connectors.css('transform', 'translateX(' + xShift + 'px)');

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
