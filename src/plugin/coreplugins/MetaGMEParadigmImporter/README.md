# MetaGMEParadigmImporter

Imports an existing paradigm file (.xmp) from GME to WebGME.
The importer has many limitations, but will give a good starting point for your language.

## Usage

Follow the steps below to import and existing meta-model (.xmp) file.
 
1. Create a new empty project – this step is important
2. Double click on the root object
3. Expand the META properties in the property editor
4. Add to the ValidPlugins attribute: MetaGMEParadigmImporter
5. Click on the play button on the toolbar to execute the plugin.
6. The dialog box will ask you for an xmp file (keep in mind the xmp will be uploaded to the server, and anybody can see/download it, unless you use a local webgme instance)
7. Click on OK.
8. Right click on the root object and create a ‘RootFolder’ if the import process was successful.
9. Add objects as needed.
10. If you select the Meta view then there will be 2 tabs META and the name of your paradigm. You can look at the result of the import process in the second tab.

## Limitations

Below a few known limitations are listed:

### Hard Limitations
 - paradigm cannot have an object named FCO
 - roles are not imported
 - kinds are used all the time instead of roles
 - constraints are not imported
 - cardinality information is not imported
 - if an object is a port in at least one aspect it becomes a port globally in ALL models and in ALL aspects

### Soft limitations: (could be implemented in a certain extent)
 - aspects are not imported
 - no visual properties are imported
 