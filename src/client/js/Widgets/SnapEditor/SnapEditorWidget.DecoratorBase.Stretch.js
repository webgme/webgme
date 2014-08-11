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

    var AXIS = { X:'x', Y:'y' },
        SPLITTER = '-';

    var SVGDecoratorSnapEditorWidgetStretch = function(){
    };

    /**
     * Initialize variables for stretching.
     *
     * @private
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype.initializeStretchability = function (stretchers) {
        //Stretching stuff
        this._transforms = {};//The current abs stretch of any svg element in the SVG
        this._updatedSVGElements = {};//The elements that have been updated since last render
        this._classTransforms = {};//The calculated abs stretch of any class in the SVG

        this._svgDims = {};
        this._initSvgDims = {};

        this.svgContainerWidth = 0;
        this.svgWidth = 0;
        this.svgHeight = 0;
        this.svgBorderWidth = 0;

        //shifting and stretching
        this.shiftTree = {};
        this.stretchTree = {};
        this.stretchElementsByPointer = {};
        this._newShiftAmounts = {};

        //get all pointers from hostDesignerItem and intialize 
        this.pointerInitialStretch = {};//Initial stretch values to allow for snug fit

        for (var i = stretchers.length-1; i>= 0; i--){
            this.pointerInitialStretch[stretchers[i]] = {};
            this.pointerInitialStretch[stretchers[i]][SNAP_CONSTANTS.STRETCH_TYPE.TEXT] = { x: 0, y: 0 };
            this.pointerInitialStretch[stretchers[i]][SNAP_CONSTANTS.STRETCH_TYPE.SVG] = { x: 0, y: 0 };

            //classTransforms keeps track of the current size of the stuff 
            //associated with the given pointer
            this._classTransforms[stretchers[i]] = {};
            this._classTransforms[stretchers[i]][SNAP_CONSTANTS.STRETCH_TYPE.TEXT] = { x: 0, y: 0 };
            this._classTransforms[stretchers[i]][SNAP_CONSTANTS.STRETCH_TYPE.SVG] = { x: 0, y: 0 };
            //this._classTransforms[stretchers[i]] = _.extend({}, this.pointerInitialStretch[stretchers[i]]);//Clone object

            this.stretchElementsByPointer[stretchers[i]] = {};
            this.stretchElementsByPointer[stretchers[i]][SNAP_CONSTANTS.STRETCH_TYPE.TEXT] = { x: [], y: [] };
            this.stretchElementsByPointer[stretchers[i]][SNAP_CONSTANTS.STRETCH_TYPE.SVG] = { x: [], y: [] };

        }

    };

    /**
     * Initialize ids of all svg elements and create stretch/shift trees
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
                //Set the id
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
                        //FIXME
                        width = null;
                        height = null;
                    }
                    self._transforms[svgId] = { 
                        original: Object.freeze({ x: x, y: y, width: width, height: height }), 
                        shift: { x: 0, y: 0 }, stretch: { width: null, height: null }};
                }
                //initialize shiftTree
                self.shiftTree[svgId] = {};
                self.shiftTree[svgId][AXIS.X] = [];
                self.shiftTree[svgId][AXIS.Y] = [];
                
                //initialize stretchTree
                self.stretchTree[svgId] = {};
                self.stretchTree[svgId][AXIS.X] = {};
                self.stretchTree[svgId][AXIS.Y] = {};

                //Recurse if applicable
                if (value.children){
                    $.each(value.children, idCreator);
                }
            },
            treeCreator = function(key, value){
                var shifts,
                    axis,
                    data,
                    base,
                    type,
                    pointer,
                    svgId = value.getAttribute("id"),
                    i;

                //Create respective entries in shiftTree and stretchTree
                if (value.hasAttribute("data-shift")){
                    data = value.getAttribute("data-shift").split(" ");
                    for (i = data.length-1; i >= 0; i--){
                        axis = data[i].substring(0,1);
                        base = data[i].substring((AXIS.X + SPLITTER).length);

                        //Add svgId to base's shiftTree
                        self.shiftTree[base][axis].push(svgId);
                    }
                }

                //create stretchTree
                if (value.hasAttribute("data-stretch")){
                    data = value.getAttribute("data-stretch").split(' ');

                    for (i = data.length-1; i >= 0; i--){
                        axis = data[i].substring(0,1);
                        pointer = data[i].substring((AXIS.X + SPLITTER).length);
                        type = SNAP_CONSTANTS.STRETCH_TYPE.SVG;

                        if (value.getAttribute("text-stretch-only") === "true"){
                            type = SNAP_CONSTANTS.STRETCH_TYPE.TEXT;
                        }

                        self.stretchTree[svgId][axis][pointer] = self.pointerInitialStretch[pointer][SNAP_CONSTANTS.STRETCH_TYPE.SVG][axis] || 0;

                        //Add element to stretchElementsByPointer
                        self.stretchElementsByPointer[pointer][type][axis].push(svgId);//'text' stores the 'text-only' elements
                    }
                }

                //Recurse if applicable
                if (value.children){
                    $.each(value.children, treeCreator);
                }
            };

        this.$svgElement.each(idCreator);
        this.$svgElement.each(treeCreator);

        this.shiftTree = Object.freeze(this.shiftTree);
        //this.stretchTree = Object.freeze(this.stretchTree);

        //Initialize this._calculatedDims values
        this._initSvgDims.width = parseFloat(this.$svgElement[0].getAttribute('width'));
        this._initSvgDims.height = parseFloat(this.$svgElement[0].getAttribute('height'));

        this._svgDims.width = this._initSvgDims.width;
        this._svgDims.height = this._initSvgDims.height;

    };

    /**
     * Randomly generate ID for identifying svg elements.
     *
     * @private
     * @return {String} id
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._genSVGId = function () {

        var MAX_ID = 10000000,
            id = "SVG_" + Math.floor(Math.random()*MAX_ID);

        while(this._transforms[id]){
            id = "SVG_" + Math.floor(Math.random()*MAX_ID);
        }

        return id;
    };

    SVGDecoratorSnapEditorWidgetStretch.prototype.onRenderGetStretchInfo = function(){
        //shift respective elements
        var ids = Object.keys(this._newShiftAmounts),
            svgId;

        while (ids.length){
            svgId = ids.pop();

            //create shift object
            this._shiftDependentElements(svgId, this._newShiftAmounts[svgId]);
        }

        this._newShiftAmounts = {};

        //Calculate SVG Size
        this._updateSVGSize();
    };

    /**
     * Apply the stored transformations.
     *
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._applyTransforms = function () {
        //WRITE ONLY
        var elements = Object.keys(this._updatedSVGElements),
            element;

        while (elements.length){
            element = elements.pop();
            this._updateSVGTransforms(this._updatedSVGElements[element][0]);
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
        //READ-ONLY wrt the DOM 
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
                return this.stretchTo(stretchId, { x: newWidth }, SNAP_CONSTANTS.STRETCH_TYPE.TEXT);
            }

        }else{
            return this.stretchTo(stretchId, { x: element.width() }, SNAP_CONSTANTS.STRETCH_TYPE.TEXT);
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
     * @param {enum} type optional
     * @return {Boolean} true if the svg has changed in size
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype.stretchTo = function (id, size, type) {
        //READ-ONLY wrt DOM
        //Stretch according to the x,y values where x,y are
        //dimensions of the items pointed to by "id"
        var changed = false,
            x = size.x,
            y = size.y,
            dx,
            dy;

        type = type || SNAP_CONSTANTS.STRETCH_TYPE.SVG;//svg by default

        if (x < 0 || y < 0){
            this.logger.warn("Cannot resize svg to negative size!");
        }

        //stretch x
        if (x !== undefined){//Don't shrink past initial
            x = Math.max(x, this.pointerInitialStretch[id][type].x);
            dx = x - this._classTransforms[id][type].x;

            if (dx){
                this.stretch(id, AXIS.X, dx, type);
                this._classTransforms[id][type].x = x;
                changed = true;
            }
        }

        //stretch y
        if (y !== undefined){

            y = Math.max(y, this.pointerInitialStretch[id][type].y);//Don't shrink past initial
            dy = y - this._classTransforms[id][type].y;

            //update size attached to ptr
            if (dy){
                this.stretch(id, AXIS.Y, dy, type);
                this._classTransforms[id][type].y = y;
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
     * @param {enum} type ("svg"|"text")
     * @return {Number} Current size of the svg along the given axis
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype.stretch = function (id, axis, delta, type) {
        //READ-ONLY
        var stretchElements = [],
            maxSize = 0,
            dim = axis === AXIS.X ? "width" : "height",
            width,
            height,
            svgId,
            stretch = {},
            stretches;

        if (this.stretchElementsByPointer[id][type][axis]){
            stretchElements = this.stretchElementsByPointer[id][type][axis];
        }

        if (type === SNAP_CONSTANTS.STRETCH_TYPE.TEXT){//add the svg elements
            stretchElements = stretchElements.concat(this.stretchElementsByPointer[id][SNAP_CONSTANTS.STRETCH_TYPE.SVG][axis]);
        }

        stretch[axis] = delta;
        this._stretchCustomConnectionHighlightAreas(id, stretch);
        
        //Stretch the SVG to Max(delta, currentStretch)
        var displacement = {},
            ptrs = [],
            oldValue,
            newValue,
            edge,//value of the largest edge of the svg element. Used to see if we need to resize the parent
            x,
            y;

        
        for (var i = stretchElements.length - 1; i >= 0; i--){
            svgId = stretchElements[i];

            if(!svgId){
                this.logger.error("SVG should have an ID");
            }

            //Update pointer width for svg element
            this.stretchTree[svgId][axis][id] += delta;

            //Get new this._transforms
            ptrs = Object.keys(this.stretchTree[svgId][axis]);
            stretches = [];

            while (ptrs.length){
                stretches.push(this.stretchTree[svgId][axis][ptrs.pop()]);
            }

            oldValue = this._transforms[svgId].stretch[dim] || 0;
            newValue = Math.max.apply(null, stretches);

            if (oldValue !== newValue){//If the svg will be changing size

                this._transforms[svgId].stretch[dim] = newValue;

                //Set the svg element to update
                this._updatedSVGElements[svgId] = this.$svgContent.find("#" + svgId);

                //Record the shift
                if (this._newShiftAmounts[svgId] === undefined){
                    this._newShiftAmounts[svgId] = {};
                }

                if (this._newShiftAmounts[svgId][axis] !== undefined){
                    this._newShiftAmounts[svgId][axis] = Math.max(newValue - oldValue, this._newShiftAmounts[svgId][axis]);
                } else {
                    this._newShiftAmounts[svgId][axis] = newValue - oldValue;
                }

                //Take into account the right/bottom most point of the svg element
                edge = this._transforms[svgId].original[axis] + this._transforms[svgId].shift[axis] + 
                    this._transforms[svgId].original[dim] + this._transforms[svgId].stretch[dim];

                maxSize = Math.max(maxSize, edge);//Update entire svg size if necessary

            }
        }    

        //Adjust the overall svg if necessary
        if(stretchElements.length){
            var size = {};
            size[dim] = maxSize;
            this._increaseSVGSize(size);
        }

        return this._svgDims[dim];
    };

    SVGDecoratorSnapEditorWidgetStretch.prototype._updateSVGSize = function(){
        var ids = Object.keys(this._transforms),
            id,
            edge,
            axis,
            size = {};

        size.width = -1;
        size.height = -1;

        for (var dim in size){

            axis = dim === "width" ? AXIS.X : AXIS.Y;

            for (var i = ids.length - 1; i >= 0; i--){
                //Take into account the right/bottom most point of the svg element
                edge = this._transforms[ids[i]].original[axis] + this._transforms[ids[i]].shift[axis] + 
                    this._transforms[ids[i]].original[dim] + this._transforms[ids[i]].stretch[dim];

                if (_.isNumber(edge) && !_.isNaN(edge)){
                    size[dim] = Math.max(edge, size[dim]);
                }
            }

            this._svgDims[dim] = size[dim];

            //Update the host item  
            var calculatedSize = _.extend({}, this._svgDims);
            this.hostDesignerItem.setCalculatedSize(calculatedSize);
        }
    };

    /**
     * Update svg size if necessary
     *
     * @param {Object} size
     * @return {Boolean} updated
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._increaseSVGSize = function (size) {
        var updated = false;

        for (var dim in size){
            if (size.hasOwnProperty(dim) && this._svgDims.hasOwnProperty(dim)){
                //May be a better way to do this
                if (size[dim] > this._svgDims[dim]){
                    this._svgDims[dim] = size[dim];

                    //Update the host item  
                    var calculatedSize = _.extend({}, this._svgDims);
                    this.hostDesignerItem.setCalculatedSize(calculatedSize);
                }
            }
        }

        return updated;
    };

    /**
     * Shift the svg by delta along the coordinate plane, axis, with respect to the id
     *
     * @param {String} id
     * @param {Object} shift
     * @return {Object} extreme edges of the elements
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._shiftDependentElements = function (id, shift) {
        //READ-ONLY

        var shiftElements = {},
            dim,
            edge,
            edges = {},
            svgId;

        this._shiftConnectionAreas(id, shift);

        for (var axis in shift){
            if (shift.hasOwnProperty(axis)){

                dim = axis === AXIS.X ? "width" : "height";
                edges[dim] = -1;

                shiftElements[axis] = [];

                if (this.shiftTree[id] && this.shiftTree[id][axis]){
                    shiftElements[axis] = this.shiftTree[id][axis].slice();
                }

                while(shiftElements[axis].length){
                    svgId = shiftElements[axis].pop();

                    this._transforms[svgId].shift[axis] += shift[axis];
                    
                    //Update svg window if necessary
                    edge = this._transforms[svgId].original[axis] + this._transforms[svgId].shift[axis] +
                        this._transforms[svgId].original[dim] + this._transforms[svgId].stretch[dim];
                    edges[dim] = Math.max(edge, edges[dim]);

                    this._updatedSVGElements[svgId] = this.$svgContent.find("#" + svgId);

                    if (this.shiftTree[svgId] && this.shiftTree[svgId][axis]){
                        shiftElements[axis] = shiftElements[axis].concat(this.shiftTree[svgId][axis]);
                    }
                }    
            }
        }    

        this._increaseSVGSize(edges);
    };

    /**
     * Shift the connection areas by "shift" with respect to id
     *
     * @param {String} id
     * @param {Object} shift
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._shiftConnectionAreas = function (id, shift) {
        if (this._customConnectionAreas){

            var i = this._customConnectionAreas.length;

            while(i--){
                if(this._customConnectionAreas[i].shift && this._customConnectionAreas[i].shift.indexOf(id) !== -1){
                       //shift the connection area
                       this._customConnectionAreas[i].x1 += shift.x || 0;
                       this._customConnectionAreas[i].x2 += shift.x || 0;

                       this._customConnectionAreas[i].y1 += shift.y || 0;
                       this._customConnectionAreas[i].y2 += shift.y || 0;
                   }
            }
        }
        
        //this._shiftCustomConnectionHighlightAreas(id, shift);
    };

    /**
     * Shift the connection highlight areas by "shift" with respect to id
     *
     * @param {String} id
     * @param {Object} shift
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._shiftCustomConnectionHighlightAreas = function (id, shift) {
        if (this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT]){

            var i = this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT].length;

            while(i--){
                if(this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].class && this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].class.indexOf(id) !== -1){
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
            width = this._transforms[id].original.width + this._transforms[id].stretch.width,
            height = this._transforms[id].original.height + this._transforms[id].stretch.height;

        //Don't shrink past original width/height
        width = Math.max(width, this._transforms[id].original.width);
        height = Math.max(height, this._transforms[id].original.height);

        if(svg.tagName === "line"){
            var x = this._transforms[id].original.x,
                y = this._transforms[id].original.y;

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
