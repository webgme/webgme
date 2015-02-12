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
  });
