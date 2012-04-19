/*
 * WIDGET ModelEditor based on SVG
 */
define( [ './util.js', '/common/logmanager.js', 'raphael.amd' ], function( util, logManager ) {

    //load its own CSS file (css/ModelEditorSVGWidget.css)
    //util.loadCSS( 'css/ModelEditorSVGWidget.css' );

    var ModelEditorSVGWidget = function (containerId) {
        //save this for later use
        var self = this;

        //get logger instance for this component
        var logger = logManager.create("ModelEditorSVGWidget");

        //by default use visual animation to reflect changes in the editor
        var animation = true;

        //save parentcontrol
        var containerControl = $("#" + containerId);

        if (containerControl.length === 0) {
            logger.error("ModelEditorSVGWidget's container control with id:'" + containerId + "' could not be found");
            return undefined;
        }

        //generate unique id for control
        var guid = util.guid();

        //generate control dynamically
        var modelEditorE = $('<div/>', {
            id:"modelEditor_" + guid
        });

        //add control to parent
        containerControl.append(modelEditorE);

        //create Raphael paper
        var paper = Raphael( modelEditorE.attr("id"), 2000, 1500 );

        var paperCanvas = $(paper.canvas);

        var titleText = null;

        /* PUBLIC FUNCTIONS */
        this.clear = function() {
            paper.clear();
        };

        this.setTitle = function( title ) {
            if ( titleText ) {
                titleText.remove();
            }
            titleText = paper.text(5, 15, title);
            titleText.attr("text-anchor", "start");
            titleText.attr("font-size", 16 );
            titleText.attr("font-weight", "bold" );
            titleText.attr("fill", "#ff0000" );
        }

        this.createObject = function( objDescriptor ) {
            logger.debug( "Creating object with parameters: " + JSON.stringify( objDescriptor ) );

            var st = paper.set();

            var rect = paper.rect(objDescriptor.posX, objDescriptor.posY, 100, 100, 10);
            rect.attr( "fill" , "#d0d0d0" );
            //rect.data( "id", objDescriptor.id );

            var text = paper.text( objDescriptor.posX, objDescriptor.posY , objDescriptor.title );
            text.transform("t50,30");
            //text.data( "id", objDescriptor.id );

            if ( objDescriptor.title === "Loading..." ) {
                rect.attr("opacity", 0.1);
            }

            st.push(rect);
            st.push(text);


            return st;
        };

        this.updateObject = function( modelObject, objDescriptor ) {
            logger.debug( "Updating object with parameters: " + JSON.stringify( objDescriptor ) );

            if ( modelObject.attr("x") !== objDescriptor.posX  ) {
                modelObject.attr("x", objDescriptor.posX );
            }

            if ( modelObject.attr("y") !== objDescriptor.posY  ) {
                modelObject.attr("y", objDescriptor.posY );
            }

            if ( objDescriptor.title !== "Loading..." ) {
                modelObject.attr("opacity", 1.0);
            }

            var text = modelObject[1];
            if ( text.attr("text") !== objDescriptor.title  ) {
                text.attr("text", objDescriptor.title);
            }
        };

        this.deleteObject = function( modelObject ) {
            logger.debug( "Deleting object with parameters: " + modelObject );

            modelObject.forEach( function(obj) {
                obj.remove();
            }, null );

            delete modelObject;
        };
    };

    return ModelEditorSVGWidget;
});