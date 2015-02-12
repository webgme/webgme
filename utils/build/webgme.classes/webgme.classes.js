/*globals define, document, console, eval, GME*/

define('webgme.classes',
    [
        'client',
        'blob/BlobClient',
        'executor/ExecutorClient',
        'js/Utils/InterpreterManager'
    ], function (Client, BlobClient, ExecutorClient, InterpreterManager) {
        GME.classes.Client = Client;
        GME.classes.BlobClient = BlobClient;
        GME.classes.ExecutorClient = ExecutorClient;
        GME.classes.InterpreterManager = InterpreterManager;

        if (document.body.getAttribute("on-gme-init")) {
            eval(document.body.getAttribute("on-gme-init"));
        } else {
            console.warn('To use GME, define a javascript function and set the body element\'s on-gme-init property.');
        }
    });
