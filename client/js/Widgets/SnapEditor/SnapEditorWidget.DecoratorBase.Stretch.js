/*globals define*/
/*
 * @author brollb / https://github/brollb
 *
 * Stretching functionality for Snap SVG Decorator
 */

define(['js/Widgets/SnapEditor/SnapEditorWidget.Constants'], function(SNAP_CONSTANTS){

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

    "use strict";

    var AXIS = { X:'x', Y:'y' };//constants for stretching

    var SVGDecoratorSnapEditorWidgetStretch = function(){
    };

    /**
     * Initialize variables for stretching.
     *
     * @private
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype.initializeStretchability = function () {
        //Stretching stuff
        this._calculatedTransforms = {};//The calculated abs stretch of any svg element in the SVG TODO
        this._transforms = {};//The current abs stretch of any svg element in the SVG

        this._classTransforms = {};//The calculated abs stretch of any class in the SVG
        this._minDims = {};

        this.svgContainerWidth = 0;
        this.svgWidth = 0;
        this.svgHeight = 0;
        this.svgBorderWidth = 0;
        this.svgInitialStretch = {};//Initial stretch values to allow for snug fit
    };


    /**
     * Apply the stored transformations.
     *
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._applyTransforms = function () {
        //Stored transformations: this._transforms
        //Current transformations: this._currentTransforms
        //TODO
    };

    /**
     * Set the text of a DOM element and stretch by the change in size
     *
     * @param {DOM Element} element
     * @param {String} newText
     * @param {String} stretchId
     * @return {Boolean} return true if size has changed
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._setTextAndStretch = function (element, newText, stretchId) {
        //TODO Change this to a READ-ONLY function wrt the DOM FIXME
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

    /* * * * Manipulating the SVG * * * */
    //Stretching
    /**
     * Stretch the svg to a given x,y with respect to a stretching id
     *
     * @param {String} id
     * @param {Object} size {x: x, y: y}
     * @return {Boolean} true if the svg has changed in size
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype.stretchTo = function (id, size) {
        //TODO Change this to a READ-ONLY function wrt the DOM FIXME
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
    SVGDecoratorSnapEditorWidgetStretch.prototype.stretch = function (id, axis, delta) {
        //WILL WRITE TO THE DOM
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
    SVGDecoratorSnapEditorWidgetStretch.prototype._initializeSvgElements = function (elements) {
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
    SVGDecoratorSnapEditorWidgetStretch.prototype._shiftConnectionAreas = function (shiftClass, shift) {
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
    SVGDecoratorSnapEditorWidgetStretch.prototype._shiftCustomConnectionHighlightAreas = function (shiftClass, shift) {
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
    SVGDecoratorSnapEditorWidgetStretch.prototype._stretchCustomConnectionHighlightAreas = function (stretchClass, stretch) {
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

    SVGDecoratorSnapEditorWidgetStretch.prototype._updateSVGTransforms = function (svg, id) {
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


    return SVGDecoratorSnapEditorWidgetStretch;
});
