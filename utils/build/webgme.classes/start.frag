// define global GME variable
var GME = GME || {};

// property to access GME class definitions
GME.classes = GME.classes || {};

var clientLoaded,
    timeout = 5000,
    waitCounter = 0,
    i,
    success,
    // list all classes that are expected to appear on the GME.classes global variable
    usedClasses = ["Client", "BlobClient", "ExecutorClient", "InterpreterManager"],
    interval = 200,
    waitForLoadId = setInterval(function () {
        if (window.GME &&
            window.GME.classes) {
            // check for all classes that we use
            clearInterval(waitForLoadId);
            success = true;

            for (i = 0; i < usedClasses.length; i += 1) {
                if (window.GME.classes.hasOwnProperty(usedClasses[i])) {
                    console.log('WebGME ' + usedClasses[i] + ' is available.');
                } else {
                    console.error('WebGME ' + usedClasses[i] + ' was not found.');
                    success = false;
                }
            }

            if (success) {
                console.log('WebGME client library is ready to use.');
                clientLoaded();
            }
        } else {
            console.log('Waiting for WebGME client library to load.');
            waitCounter += 1;
            if (waitCounter >= timeout / interval) {
                clearInterval(waitForLoadId);
                console.error('WebGME client library was not loaded within a reasonable time. (' + (timeout / 1000) + ' s)');
            }
        }
    }, interval);

clientLoaded = function () {
    if (document.body.getAttribute("on-gme-init")) {
        window[document.body.getAttribute("on-gme-init")](GME);
    } else {
        console.warning('Please define a javascript function for the body element\'s on-gme-init property.');
    }
};

(function(){