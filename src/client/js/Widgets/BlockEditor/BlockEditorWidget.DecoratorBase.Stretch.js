/*globals define,_*/
/*
 * @author brollb / https://github/brollb
 *
 * Stretching functionality for Block SVG Decorator
 */

define(['js/Widgets/BlockEditor/BlockEditorWidget.Constants'], function(SNAP_CONSTANTS){

    /*
     * This SVG was created with Block! (byob) in mind.
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

    var DEBUG = false,
        ID_NUMBER = 0,
        AXIS = { X:'x', Y:'y' },
        SPLITTER = '-';

    var SVGDecoratorBlockEditorWidgetStretch = function(){
    };

    /**
     * Initialize variables for stretching.
     *
     * @private
     * @return {undefined}
     */
    SVGDecoratorBlockEditorWidgetStretch.prototype.initializeStretchability = function (stretchers) {
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
        this.stretchTree = {};//Stores stretch requirements by pointer and type
        this.stretchElementsByPointer = {};
        this.stretchedElements = {};

        //shifting
        this.shiftTree = {};
        this._shiftCoefficients = {};
        this._connAreaShifts = {};
        this._connAreaShiftCoefficients = {};

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
    SVGDecoratorBlockEditorWidgetStretch.prototype._initializeSVGElements = function () {
        var self = this,
            svgId,
            width,
            height,
            shiftX,
            shiftY,
            transforms,
            transform,
            style,
            stroke,
            strokeWidth,
            x,
            y,
            idCreator = function(key, value){
                var canFreeze,
                    shiftCoefficient = 1;
                //Set the id
                svgId = value.getAttribute("id");
                strokeWidth = 0;

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

                    //Add stroke-width
                    style = value.getAttribute('style');
                    if (style){
                        stroke = style.match(/stroke\-width:\d*/);
                        if (stroke){
                            strokeWidth = parseFloat(stroke[0].match(/\d+\.?/)) + 1;
                        }
                    }

                   
                    //If the width/height is still null, we will set it after first render
                    //using getBBox
                    self._transforms[svgId] = { 
                        original: { x: x, y: y, width: width, height: height, 
                            shift: { x: shiftX, y: shiftY } }, 
                        shift: { x: 0, y: 0 }, stretch: { width: null, height: null },
                        stroke: strokeWidth };

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
                for (var axis in AXIS){
                    if (AXIS.hasOwnProperty(axis)){
                        axis = AXIS[axis];
                        self.stretchTree[svgId][axis] = {};
                        self.stretchTree[svgId][axis][SNAP_CONSTANTS.STRETCH_TYPE.SVG] = {};
                        self.stretchTree[svgId][axis][SNAP_CONSTANTS.STRETCH_TYPE.TEXT] = {};
                    }
                }

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

                self._shiftCoefficients[svgId] = {};
                self._shiftCoefficients[svgId][AXIS.X] = {};
                self._shiftCoefficients[svgId][AXIS.Y] = {};

                //Create respective entries in shiftTree and stretchTree
                if (value.hasAttribute("data-shift")){
                    data = value.getAttribute("data-shift").split(" ");
                    for (i = data.length-1; i >= 0; i--){
                        if (data[i].length){
                            axis = data[i].substring(0,1);
                            base = data[i].substring((AXIS.X + SPLITTER).length);

                            //Add svgId to base's shiftTree
                            self.shiftTree[base][axis].push(svgId);

                            //set default shift coefficient
                            self._shiftCoefficients[svgId][axis] = 1;
                        }
                    }
                }

                //Record shift coefficients
                if (value.getAttribute('data-align-center')){
                    data = value.getAttribute("data-align-center").split(' ');

                    for (i = data.length-1; i >= 0; i--){
                        if (data[i].length){
                            axis = data[i].substring(0,1);
                            base = data[i].substring((AXIS.X + SPLITTER).length);

                            //Add svgId to base's shiftTree
                            self.shiftTree[base][axis].push(svgId);

                            //set shift coefficient
                            self._shiftCoefficients[svgId][axis] = 0.5;
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

                            self.stretchTree[svgId][axis][SNAP_CONSTANTS.STRETCH_TYPE.SVG][pointer] = 0;
                            self.stretchTree[svgId][axis][SNAP_CONSTANTS.STRETCH_TYPE.TEXT][pointer] = 0;

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
    SVGDecoratorBlockEditorWidgetStretch.prototype._genSVGId = function () {
        return this._genUniqueId('SVG');
    };

    SVGDecoratorBlockEditorWidgetStretch.prototype._genUniqueId = function (baseId) {
        return baseId + (++ID_NUMBER);
    };

    /**
     * Build a shift tree for the connection areas.
     *
     * @return {undefined}
     */
    SVGDecoratorBlockEditorWidgetStretch.prototype._buildConnectionAreaShiftTree = function () {
        var axis,
            connectionAreas = this._customConnectionAreas,
            data,
            base,
            self = this,
            ids = [],
            initializeShiftData = function (id){
                if (!self._connAreaShifts[id]){
                    self._connAreaShifts[connectionAreas[i].id] = {};
                    self._connAreaShifts[connectionAreas[i].id][AXIS.X] = 0;
                    self._connAreaShifts[connectionAreas[i].id][AXIS.Y] = 0;
                }
            },
            makeUniqueId = function (area){//Get unique connection id
                var baseid = area.ptr + '-' + area.role,
                    id;

                while (ids.indexOf(id) !== -1){
                    id = self._genUniqueId(baseid);
                }
                return id;
            },
            j,
            i;

        this._connAreaShiftParents = {};

        for (i = 0; i < connectionAreas.length; i++){
            ids.push(connectionAreas[i].id);
        };

        for (i = 0; i < connectionAreas.length; i++){

            //Create id if needed
            if(!connectionAreas[i].id){
                connectionAreas[i].id = makeUniqueId(connectionAreas[i]);
            }
            //Initialize shift coefficients
            this._connAreaShiftCoefficients[connectionAreas[i].id] = {};
            this._connAreaShiftCoefficients[connectionAreas[i].id][AXIS.X] = 1;
            this._connAreaShiftCoefficients[connectionAreas[i].id][AXIS.Y] = 1;
            this._connAreaShiftParents[connectionAreas[i].id] = {};

            if (connectionAreas[i].shift){
                initializeShiftData(connectionAreas[i].id);

                data = connectionAreas[i].shift.split(" ");
                for (j = 0; j < data.length; j++){
                    if (data[j].length){
                        axis = data[j].substring(0,1);
                        base = data[j].substring((AXIS.X + SPLITTER).length);

                        this._connAreaShiftParents[connectionAreas[i].id][axis] = base;
                    }
                }
                delete connectionAreas[i].shift;
            }

            if (connectionAreas[i].alignCenter){
                initializeShiftData(connectionAreas[i].id);

                data = connectionAreas[i].alignCenter.split(" ");
                for (j = 0; j < data.length; j++){
                    if (data[j].length){
                        axis = data[j].substring(0,1);

                        base = data[j].substring((AXIS.X + SPLITTER).length);

                        this._connAreaShiftParents[connectionAreas[i].id][axis] = base;

                        this._connAreaShiftCoefficients[connectionAreas[i].id][axis] = 0.5;
                    }
                }
                delete connectionAreas[i].alignCenter;
            }

        }
    };

    SVGDecoratorBlockEditorWidgetStretch.prototype.onRenderGetStretchInfo = function(){
        this._fixNullDimensions();
        this.updateSize();//Updates the boundary box
    };

    /**
     * Update shifts of the elements.
     *
     * @return {undefined}
     */
    SVGDecoratorBlockEditorWidgetStretch.prototype.updateShifts = function(){
        var ids = Object.keys(this.stretchedElements),
            id,
            stretch;

        this._clearShifts();

        while (ids.length){
            id = ids.pop();
            stretch = this._transforms[id].stretch;

            this._shiftDependentElements(id, AXIS.X, stretch.width || 0);
            this._shiftDependentElements(id, AXIS.Y, stretch.height || 0);
        }

        this._shiftConnectionAreas();
    };

    SVGDecoratorBlockEditorWidgetStretch.prototype._clearShifts = function(){
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

                        //shift the highlight
                        this._shiftCustomConnectionHighlightAreas(area.ptr, area.role, axis, -shift[axis]);
                    }
                    this._connAreaShifts[id][axis] = 0;
                }
            }
        }
    };

    /**
     * Shift the svg's dependents by delta along the coordinate plane
     *
     * @param {String} id
     * @param {enum} axis 'x' or 'y'
     * @param {Number} shift
     * @return {Object} extreme edges of the elements
     */
    SVGDecoratorBlockEditorWidgetStretch.prototype._shiftDependentElements = function (id, axis, originalShift) {
        var shiftElements = {},
            dim,
            shift = originalShift,
            svgId;

        dim = axis === AXIS.X ? "width" : "height";

        shiftElements[axis] = [];

        if (this.shiftTree[id] && this.shiftTree[id][axis]){
            shiftElements[axis] = this.shiftTree[id][axis].slice();
        }

        while(shiftElements[axis].length){
            svgId = shiftElements[axis].pop();

            shift = originalShift*this._shiftCoefficients[svgId][axis];

            this._transforms[svgId].shift[axis] += shift;

            this._shiftDependentElements(svgId, axis, shift);
        }    
    };

    /**
     * Shift the connection areas by "shift" with respect to id
     *
     * @param {String} id
     * @param {String} axis
     * @param {Number} shift
     */
    SVGDecoratorBlockEditorWidgetStretch.prototype._shiftConnectionAreas = function () {
        var areas,
            svgId,
            originalShift,
            shift,
            axis,
            dim,
            i;

        if (this._customConnectionAreas){

            areas = this._customConnectionAreas;

            for (var a in AXIS){
                if (AXIS.hasOwnProperty(a)){
                    axis = AXIS[a];
                    dim = axis === AXIS.X ? 'width' : 'height';

                    for (i = areas.length-1; i >= 0; i--){
                        //shift the connection areas
                        svgId = this._connAreaShiftParents[areas[i].id][axis];//Get the element determining shift
                        if (svgId){
                            originalShift = this._transforms[svgId].stretch[dim] + 
                                this._transforms[svgId].shift[axis];

                            shift = originalShift * this._connAreaShiftCoefficients[areas[i].id][axis];
                            areas[i][axis + "1"] += shift;
                            areas[i][axis + "2"] += shift;

                            //Shift any custom connection highlight areas
                            this._shiftCustomConnectionHighlightAreas(areas[i].ptr, areas[i].role, axis, shift);

                            this._connAreaShifts[areas[i].id][axis] += shift || 0;
                        }
                    }
                }
            }
        }
    };

    /**
     * Shift the connection highlight areas by "shift" with respect to id
     *
     * @param {String} id
     * @param {Object} shift
     */
    SVGDecoratorBlockEditorWidgetStretch.prototype._shiftCustomConnectionHighlightAreas = function (ptr, role, axis, shift) {
        if (this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT]){

            var i = this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT].length;

            while(i--){
                if(this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].ptr === ptr && 
                   this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].role === role){
                       //shift the connection area highlight
                       this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i][axis + '1'] += shift || 0;
                       this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i][axis + '2'] += shift || 0;
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
    SVGDecoratorBlockEditorWidgetStretch.prototype._stretchCustomConnectionHighlightAreas = function (stretchClass, stretch) {
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
    SVGDecoratorBlockEditorWidgetStretch.prototype._applyTransforms = function () {
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

            // Set the height of the container
            this.$el.css(dim, this._svgSize[dim]);
        }

        if (DEBUG){
            this.displayAllConnectionAreas();
        }

    };

    /**
     * Apply the current svg transforms to the svg.
     *
     * @param svg
     * @param id
     * @return {undefined}
     */
    SVGDecoratorBlockEditorWidgetStretch.prototype._updateSVGTransforms = function (svg) {
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
    SVGDecoratorBlockEditorWidgetStretch.prototype._setTextAndStretch = function (element, newText, stretchId, extra) {
        //READ-ONLY wrt the DOM
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
    SVGDecoratorBlockEditorWidgetStretch.prototype.stretchTo = function (id, size, type) {
        //Doesn't READ or WRITE to DOM
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
    SVGDecoratorBlockEditorWidgetStretch.prototype.stretch = function (id, axis, delta, type) {
        //Doesn't READ or WRITE to DOM
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
            this.stretchTree[svgId][axis][type][id] += delta;

            //Get new this._transforms
            stretches = [];
            for (var t in this.stretchTree[svgId][axis]){
                if (this.stretchTree[svgId][axis].hasOwnProperty(t)){
                    ptrs = Object.keys(this.stretchTree[svgId][axis][t]);
                    while (ptrs.length){
                        stretches.push(this.stretchTree[svgId][axis][t][ptrs.pop()]);
                    }
                }
            }

            oldValue = this._transforms[svgId].stretch[dim] || 0;
            newValue = Math.max.apply(null, stretches);

            if (oldValue !== newValue){//If the svg will be changing size

                this._transforms[svgId].stretch[dim] = newValue;

                //Record the stretch id if stretch is non-zero
                if (newValue !== 0){
                    if (!this.stretchedElements[svgId]){
                        this.stretchedElements[svgId] = {};
                    }

                    this.stretchedElements[svgId][axis] = 1;
                } else {
                    delete this.stretchedElements[svgId][axis];

                    if (Object.keys(this.stretchedElements[svgId]) === 0){
                        delete this.stretchedElements[svgId];
                    }
                }

            }
        }    

    };

    //Some svg elements have unknown dimensions until the svg is actually rendered 
    //on the screen. I have stored "null" for those elements and we will calculate 
    //them on render (using the following function)
    SVGDecoratorBlockEditorWidgetStretch.prototype._fixNullDimensions = function(){//fixes null dimensions
        //READ-ONLY wrt DOM
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

    SVGDecoratorBlockEditorWidgetStretch.prototype.updateSize = function(){
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
                    this._transforms[ids[i]].original[dim] + this._transforms[ids[i]].stretch[dim] + 
                    this._transforms[ids[i]].stroke;

                if (_.isNumber(edge) && !_.isNaN(edge)){
                    size[dim] = Math.max(edge, size[dim]);
                }
            }

            this._svgSize[dim] = size[dim];

            this.hostDesignerItem.setSize(this._svgSize.width, this._svgSize.height);
        }
    };


    return SVGDecoratorBlockEditorWidgetStretch;
});
