/*
 * Utility helper functions for the client side
 */

define( [], function(){

    //return utility functions
    return {
        /*
         * Determines if the app runs in debug or release mode
         */
        DEBUG : false,

        /*
         * Port number of socket.io server
         */
        ServerPort : 8081,

        /*
         * Generated a GUID
         */
        guid: function() {
            var S4 = function() {
                return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
            };

            //return GUID
            return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
        },

        /*
         * Loads a CSS file dinamically
         */
        loadCSS : function( filePath ) {
            var css	= document.createElement('link');
            css.rel		= 'stylesheet';
            css.type	= 'text/css';
            css.media	= 'all';
            css.href	= filePath;
            document.getElementsByTagName("head")[0].appendChild(css);
        }
    };
});