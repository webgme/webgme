define('webgme.classes',
  [
    'client',
    'blob/BlobClient',
    'js/Utils/InterpreterManager'
  ], function (Client, BlobClient, InterpreterManager) {
    WebGMEGlobal.classes.Client = Client;
    WebGMEGlobal.classes.BlobClient = BlobClient;
    WebGMEGlobal.classes.InterpreterManager = InterpreterManager;
  });
