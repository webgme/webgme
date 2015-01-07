define('webgme.classes',
  [
    'client',
    'blob/BlobClient',
    'js/Utils/InterpreterManager'
  ], function (Client, BlobClient, InterpreterManager) {
    GME.classes.Client = Client;
    GME.classes.BlobClient = BlobClient;
    GME.classes.InterpreterManager = InterpreterManager;
  });
