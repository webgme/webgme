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
     * Stretching and shifting of components in the svg
     * are specified as follows.
     *
     * Stretching: 
     *      data-stretch="x-next"
     *
     * This means that the given element will stretch wrt
     * the x coordinate when the 'next' pointer is stretched.
     *      
     * Shifting: 
     *      data-shift="x-rect1"
     *
     * This means that the given element will shift wrt
     * the x coordinate when the element with id "rect1"
     * is shifted/stretched horizontally.
     *
     * That is, it will follow the right-most coord of 
     * "rect1" as "rect1" shifts/stretches.
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
        //this._updatedSVGElements = {};//The elements that have been updated since last render
        this._classTransforms = {};//The calculated abs stretch of any class in the SVG

        this._svgSize = {};

        this.svgContainerWidth = 0;
        this.svgWidth = 0;
        this.svgHeight = 0;
        this.svgBorderWidth = 0;

        //stretching
        this.stretchTree = {};
        this.stretchElementsByPointer = {};
        this.stretchedElements = {};

        //shifting
        this.shiftTree = {};
        this._connAreaShifts = {};

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
            shiftX,
            shiftY,
            transforms,
            transform,
            x,
            y,
            idCreator = function(key, value){
                var canFreeze;
                //Set the id
                svgId = value.getAttribute("id");

                if(!svgId){
                    svgId = self._genSVGId();
                    value.setAttribute("id", svgId);
                }

                if(!self._transforms[svgId]){//Initialize transform if needed

                    x = null;
                    y = null;
                    width = null;
                    height = null;
                    shiftX = 0;
                    shiftY = 0;
                    canFreeze = true;

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
                    } else {//Will need to get x,y,width,height later using getBBox()
                        canFreeze = false;
                    }

                    //Get the initial shift
                    if (value.transform){
                        transforms = value.transform.baseVal;
                        for (var i = transforms.length-1; i >= 0; i--){
                            transform = transforms.getItem(i);
                            if (transform.type === SVGTransform.SVG_TRANSFORM_TRANSLATE){
                                shiftX = transform.matrix.e;
                                shiftY = transform.matrix.f;
                            }
                        }
                    }

                    //If the width/height is still null, we will set it after first render
                    //using getBBox
                    self._transforms[svgId] = { 
                        original: { x: x, y: y, width: width, height: height, 
                            shift: { x: shiftX, y: shiftY } }, 
                        shift: { x: 0, y: 0 }, stretch: { width: null, height: null }};

                    //Freeze the original measurements if possible
                    if (canFreeze){
                        Object.freeze(self._transforms[svgId].original);
                    } else {
                        Object.freeze(self._transforms[svgId].original.shift);
                    }
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
                var axis,
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
                        if (data[i].length){
                            axis = data[i].substring(0,1);
                            base = data[i].substring((AXIS.X + SPLITTER).length);

                            //Add svgId to base's shiftTree
                            self.shiftTree[base][axis].push(svgId);
                        }
                    }
                }

                //create stretchTree
                if (value.hasAttribute("data-stretch")){
                    data = value.getAttribute("data-stretch").split(' ');

                    for (i = data.length-1; i >= 0; i--){
                        if (data[i].length){
                            axis = data[i].substring(0,1);
                            pointer = data[i].substring((AXIS.X + SPLITTER).length);
                            type = SNAP_CONSTANTS.STRETCH_TYPE.SVG;

                            if (value.getAttribute("text-stretch-only") === "true"){
                                type = SNAP_CONSTANTS.STRETCH_TYPE.TEXT;
                            }

                            self.stretchTree[svgId][axis][pointer] = 0;//self.pointerInitialStretch[pointer][SNAP_CONSTANTS.STRETCH_TYPE.SVG][axis] || 0;

                            //Add element to stretchElementsByPointer
                            if (!self.stretchElementsByPointer[pointer]){
                                self.logger.error("SVG does not have the pointer " + pointer);
                            } else {
                                //'text' stores the 'text-only' elements
                                self.stretchElementsByPointer[pointer][type][axis].push(svgId);
                            }
                        }
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
        
        //Create connection area shift tree
        this._buildConnectionAreaShiftTree();

        //Initialize this._calculatedDims values
        this._svgSize.width = parseFloat(this.$svgElement[0].getAttribute('width'));
        this._svgSize.height = parseFloat(this.$svgElement[0].getAttribute('height'));

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

    /**
     * Build a shift tree for the connection areas.
     *
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._buildConnectionAreaShiftTree = function () {
        var axis,
            connectionAreas = this.getConnectionAreas(),
            data,
            base;

        this._connAreaShiftTree = {};

        for (var i = 0; i < connectionAreas.length; i++){
            if (connectionAreas[i].shift){
                this._connAreaShifts[connectionAreas[i].id] = {};
                this._connAreaShifts[connectionAreas[i].id][AXIS.X] = 0;
                this._connAreaShifts[connectionAreas[i].id][AXIS.Y] = 0;

                data = connectionAreas[i].shift.split(" ");
                for (var j = 0; j < data.length; j++){
                    if (data[j].length){
                        axis = data[j].substring(0,1);
                        base = data[j].substring((AXIS.X + SPLITTER).length);

                        if (this._connAreaShiftTree[base] === undefined){
                            this._connAreaShiftTree[base] = {};
                            this._connAreaShiftTree[base][AXIS.X] = [];
                            this._connAreaShiftTree[base][AXIS.Y] = [];
                        }

                        this._connAreaShiftTree[base][axis].push(connectionAreas[i].id);
                    }
                }
            }
        }
    };

    SVGDecoratorSnapEditorWidgetStretch.prototype.onRenderGetStretchInfo = function(){
        this._fixNullDimensions();
        this.updateSize();//Updates the boundary box
    };

    /**
     * Update shifts of the elements.
     *
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype.updateShifts = function(){
        var ids = Object.keys(this.stretchedElements);

        this._clearShifts();

        while (ids.length){
            this._shiftDependentElements(ids.pop());
        }
    };

    SVGDecoratorSnapEditorWidgetStretch.prototype._clearShifts = function(){
        var area,
            ids = Object.keys(this._transforms),
            id,
            shift;

        //clear svg element shifts
        while (ids.length){
            id = ids.pop();

            this._transforms[id].shift[AXIS.X] = this._transforms[id].original.shift[AXIS.X];
            this._transforms[id].shift[AXIS.Y] = this._transforms[id].original.shift[AXIS.Y];
        }

        ids = Object.keys(this._connAreaShifts);
        while (ids.length){
            id = ids.pop();
            shift = this._connAreaShifts[id];
            for (var axis in shift){
                if (shift.hasOwnProperty(axis)){
                    area = this._getConnectionArea({ id: id });//get area by reference
                    if (area){
                        //shift the connection area
                        area[axis + "1"] -= shift[axis] || 0;
                        area[axis + "2"] -= shift[axis] || 0;
                    }
                    this._connAreaShifts[id][axis] = 0;
                }
            }
        }
    };

    /**
     * Shift the svg by delta along the coordinate plane, axis, with respect to the id
     *
     * @param {String} id
     * @param {Object} shift
     * @return {Object} extreme edges of the elements
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._shiftDependentElements = function (id) {
        var shiftElements = {},
            dim,
            stretch = this._transforms[id].stretch,
            shift = {},
            svgId;

        shift[AXIS.X] = stretch.width;
        shift[AXIS.Y] = stretch.height;

        this._shiftConnectionAreas(id, shift);

        for (var axis in shift){
            if (shift.hasOwnProperty(axis) && shift[axis] !== 0){

                dim = axis === AXIS.X ? "width" : "height";

                shiftElements[axis] = [];

                if (this.shiftTree[id] && this.shiftTree[id][axis]){
                    shiftElements[axis] = this.shiftTree[id][axis].slice();
                }

                while(shiftElements[axis].length){
                    svgId = shiftElements[axis].pop();

                    this._shiftConnectionAreas(svgId, shift);

                    this._transforms[svgId].shift[axis] += shift[axis];
                    
                    if (this.shiftTree[svgId] && this.shiftTree[svgId][axis]){
                        shiftElements[axis] = shiftElements[axis].concat(this.shiftTree[svgId][axis]);
                    }
                }    
            }
        }    

    };

    /**
     * Shift the connection areas by "shift" with respect to id
     *
     * @param {String} id
     * @param {Object} shift
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._shiftConnectionAreas = function (id, shift) {
        var area,
            areas,
            i;

        if (this._customConnectionAreas && this._connAreaShiftTree[id]){

            for (var axis in shift){
                if (shift.hasOwnProperty(axis)){
                    areas = this._connAreaShiftTree[id][axis];
                    i = areas.length;

                    while (i--){
                        area = this._getConnectionArea({ id: areas[i] });//get area by reference
                        if (area){
                            //shift the connection area
                            area[axis + "1"] += shift[axis] || 0;
                            area[axis + "2"] += shift[axis] || 0;

                            this._connAreaShifts[area.id][axis] += shift[axis] || 0;

                        }
                    }

                }
            }
        }
        
        this._shiftCustomConnectionHighlightAreas(id, shift);//TODO
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
     * Apply the stored transformations.
     *
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._applyTransforms = function () {
        //WRITE ONLY
        var elements = Object.keys(this._transforms),
            element,
            svg;

        this.updateSize();
        while (elements.length){
            element = elements.pop();
            svg = this.$svgElement.find("#" + element)[0];//Store this somewhere TODO
            if (svg){
                this._updateSVGTransforms(svg);
            }
        }

        //Set the height/width as needed

        for (var dim in this._svgSize){
            if (this._svgSize.hasOwnProperty(dim)){
                this.$svgElement[0].setAttribute(dim, this._svgSize[dim]);
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

    /**
     * Set the text of a DOM element and stretch by the change in size
     *
     * @param {DOM Element} element
     * @param {String} newText
     * @param {String} stretchId
     * @return {Boolean} return true if size has changed
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype._setTextAndStretch = function (element, newText, stretchId, extra) {
        //READ-ONLY wrt the DOM FIXME
        var oldText = element.text(),
            oldWidth = element.width(),
            width = 0,
            newWidth,
            i;

        //make sure newText is a string
        newText += "";

        element.text(newText);
        width = element.width();//NOTE: if newText is empty or whitespace, width will be zero

        //Set the extra options
        if (extra){
            for (var tag in extra){
                if (extra.hasOwnProperty(tag) && extra[tag]){
                    if (extra[tag] instanceof Array){//needs refactor
                        for (i = 0; i < element.length; i++){
                            element[i].setAttribute(tag, extra[tag][i]);
                        }
                    } else {
                        for (i = 0; i < element.length; i++){
                            element[i].setAttribute(tag, extra[tag]);
                        }
                    }
                }
            }
        }

        return this.stretchTo(stretchId, { x: width }, SNAP_CONSTANTS.STRETCH_TYPE.TEXT);
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
     * @return {undefined}
     */
    SVGDecoratorSnapEditorWidgetStretch.prototype.stretch = function (id, axis, delta, type) {
        //READ-ONLY
        var stretchElements = [],
            dim = axis === AXIS.X ? "width" : "height",
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
        var ptrs = [],
            oldValue,
            newValue;

        
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
                //this._updatedSVGElements[svgId] = this.$svgContent.find("#" + svgId);

                //Record the stretch id if stretch is non-zero
                if (newValue !== 0){
                    this.stretchedElements[svgId] = 1;
                } else {
                    delete this.stretchedElements[svgId];
                }

            }
        }    

        //return this._svgSize[dim];
    };

    //Some svg elements have unknown dimensions until the svg is actually rendered 
    //on the screen. I have stored "null" for those elements and we will calculate 
    //them on render (using the following function)
    SVGDecoratorSnapEditorWidgetStretch.prototype._fixNullDimensions = function(){//fixes null dimensions
        var ids = Object.keys(this._transforms),
            element,
            box;

        for (var i = ids.length - 1; i >= 0; i--){
            //Take into account the right/bottom most point of the svg element
            
            //Get the width/height if undefined
            if (this._transforms[ids[i]].original.x === null &&
                this._transforms[ids[i]].original.y === null &&
                this._transforms[ids[i]].original.width === null &&
                this._transforms[ids[i]].original.height === null){
                //Set the original width/height if null
                element = this.$svgContent.find("#" + ids[i])[0];
                if (_.isFunction(element.getBBox)){
                    box = element.getBBox();
                    //box = element.getBBox();
                    this._transforms[ids[i]].original.x = box.x;
                    this._transforms[ids[i]].original.y = box.y;
                    this._transforms[ids[i]].original.width = box.width;
                    this._transforms[ids[i]].original.height = box.height;
                }
            } 
        }

    };

    SVGDecoratorSnapEditorWidgetStretch.prototype.updateSize = function(){
        var ids = Object.keys(this._transforms),
            edge,
            axis,
            size = {};

        size.width = -1;
        size.height = -1;

        this.updateShifts();

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

            this._svgSize[dim] = size[dim];

            this.hostDesignerItem.setSize(this._svgSize.width, this._svgSize.height);
        }
    };


    return SVGDecoratorSnapEditorWidgetStretch;
});
