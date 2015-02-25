# GME Model Statistics

Extracts some information from desktop GME models and creates a similar scale WebGME model from it.

Preserved properties of the model during transformation

- Project name
- Meta model name
- Size of the mga file
- Size of the xme file
- GUID of the objects in the domain model
- MetaRef ids for meta objects
- Containment tree
- Inheritance tree

## Prerequisites

- Visual Studio 2013 with NuGet installed
- webgme is checked out and functional

## Build

Run the `make.bat`, or build the solution from Visual Studio 2013.

## Usage

1) Call the GME Model Statistics Exporter from command line. It will generate a file called `[OriginalFileName]_stat.json`
 
`GMEModelStatisticsExporter.exe input.xme`

OR

`GMEModelStatisticsExporter.exe input.mga`

2) To create a webgme model run `genprojectjson.js`, it will generate a file called `[inputStatFile]_out.json`

`genprojectjson.js stat.json` 

OR

`genprojectjson.js stat.json projectName [mongoip] [mongoport] [mongodb]`

which will import the project to the default mongodb or (as set in optional argvars). N.B. any existing project named projectName will be lost

