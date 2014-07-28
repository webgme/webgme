## Plugins ##

### TODO ###

- call one plugin from another one


### Requirements ###

1. Plugins cannot have an interactive UI during its execution.
* Plugins can run on client side (in the browser) or on server side.
* Plugins can have a configuration.
* Plugin configuration can specify default values.
* Plugin configuration can be serialized and deserialized.
* Plugin configuration can be changed before execution by the user.
* Common UI for the plugin configuration.
* Plugins can generate messages that are linked to objects.
* Plugin messages can be serialized and deserialized.
* Plugins can retrieve assets.
* Plugins can add assets.
* Plugins can generate artifacts.
* Plugins have a single entry point.
* Plugins have access to a logger.
* Plugins can have results.
* Plugin results can be serialized and deserialized.

### Design ###

#### Plugin ####

- `PluginBase` is the base class of all plugins.
- `PluginResult`
- `PluginMessage`
- `PluginNodeDescription`

#### Plugin manager ####

- `PluginManagerBase`
- `PluginManagerConfiguration`


