define('webgme.classes',
  [
    'client',
    'blob/BlobClient',
    'plugin/PluginManagerBase',
    'plugin/PluginResult',
  ], function (Client, BlobClient, PluginManagerBase, PluginResult) {
    WebGMEGlobal.classes.Client = Client;
    WebGMEGlobal.classes.BlobClient = BlobClient;
    WebGMEGlobal.classes.PluginManagerBase = PluginManagerBase;
    WebGMEGlobal.classes.PluginResult = PluginResult;
  });
