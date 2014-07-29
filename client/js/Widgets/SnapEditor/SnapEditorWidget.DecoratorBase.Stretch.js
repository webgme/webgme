/*globals define,_*/
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
        this._transforms = {};//The current abs stretch of any svg element in the SVG
        this._updatedSVGElements = {};//The elements that have been updated since last render
        this._classTransforms = {};//The calculated abs stretch of any class in the SVG
        this._minDims = {};
        this._svgDims = {};

        this.svgContainerWidth = 0;
        this.svgWidth = 0;
        this.svgHeight = 0;
        this.svgBorderWidth = 0;
        this.svgInitialStretch = {};//Initial stretch values to allow for snug fit
    };

    /**
     * Initialize ids of all svg elements.
     *
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._initializeSVGElements = function () {
        var self = this,
            svgId,
            width,
            height,
            x,
            y,
            idCreator = function(key, value){
                svgId = value.getAttribute("id");

                if(!svgId){
                    svgId = self._genSVGId();
                    value.setAttribute("id", svgId);
                }

                if(!self._transforms[svgId]){//Initialize transform if needed

                    if(value.tagName === "line"){
                        x = parseFloat(value.getAttribute("x1"));
                        y = parseFloat(value.getAttribute("y1"));
                        width = parseFloat(value.getAttribute("x2")) - x;
                        height = parseFloat(value.getAttribute("y2")) - y;
                    }else if(value.tagName === "rect"){
                        x = parseFloat(value.getAttribute("x"));
                        y = parseFloat(value.getAttribute("y"));
                        width = parseFloat(value.getAttribute("width"));
                        height = parseFloat(value.getAttribute("height"));
                    }else if(value.tagName === "path"){
                        width = null;
                        height = null;
                    }
                    self._transforms[svgId] = { original: { x: x, y: y }, shift: { x: 0, y: 0 }, width: width, height: height };
                    self._minDims[svgId] = { width: width, height: height };
                }

                //Recurse if applicable
                if (value.children){
                    $.each(value.children, idCreator);
                }
            };

        this.$svgElement.each(idCreator);
    };

    /**
     * Randomly generate ID between 0,10000 for identifying svg elements.
     *
     * @private
     * @return {String} id
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._genSVGId = function () {

        var id = "SVG_" + Math.floor(Math.random()*10000);

        while(this._transforms[id]){
            id = "SVG_" + Math.floor(Math.random()*10000);
        }

        return id;
    };


    /**
     * Apply the stored transformations.
     *
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._applyTransforms = function () {
        var elements = Object.keys(this._updatedSVGElements),
            element;

        while (elements.length){
            element = elements.pop();
            this._updateSVGTransforms(this._updatedSVGElements[element]);
            delete this._updatedSVGElements[element];
        }

        //Set the height/width as needed

        for (var dim in this._svgDims){
            if (this._svgDims.hasOwnProperty(dim)){
                this.$svgElement[0].setAttribute(dim, this._svgDims[dim]);
            }
        }

        this.hostDesignerItem.clearCalculatedSize();
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
                this.stretch(id, AXIS.X, dx);//FIXME
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
                this.stretch(id, AXIS.Y, dy);//FIXME
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

            //this._updateSVGTransforms( stretchElements[i] );//WRITE
            this._updatedSVGElements[svgId] = stretchElements[i];
        }    

        i = shiftElements.length;
        while(i--){
            svgId = shiftElements[i].getAttribute("id");

            this._transforms[svgId].shift[axis] += delta;

            //this._updateSVGTransforms(shiftElements[i] );//WRITE
            this._updatedSVGElements[svgId] = shiftElements[i];
        }    

        //Adjust the overall svg if necessary
        if ( this._svgDims[dim] === undefined){
            this._svgDims[dim] = parseFloat(this.$svgElement[0].getAttribute(dim));
        }

        if(stretchElements.length || shiftElements.length){
            this._svgDims[dim] = Math.max(this._svgDims[dim] + delta, maxSize);
            
            //Update the host item  FIXME
            //this.hostDesignerItem['_' + dim] = this._svgDims[dim];
        }

        return this._svgDims[dim];
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

    /**
     * Apply the current svg transforms to the svg.
     *
     * @param svg
     * @param id
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._updateSVGTransforms = function (svg) {
        //WRITE ONLY
        var id = svg.id,
            width = Math.max(this._minDims[id].width, this._transforms[id].width),
            height = Math.max(this._minDims[id].height, this._transforms[id].height);

        if(svg.tagName === "line"){
            var x = this._transforms.original.x,
                y = this._transforms.original.y;

            svg.setAttribute("x2", x + width);
            svg.setAttribute("y2", y + height);

        }else if(svg.tagName === "rect"){

            svg.setAttribute("width", width);
            svg.setAttribute("height", height);
        }
 
        svg.setAttribute("transform", 
                "translate(" + this._transforms[id].shift.x + "," + this._transforms[id].shift.y + ")");
    };

    return SVGDecoratorSnapEditorWidgetStretch;
});
