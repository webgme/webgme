Creating the Result Visualizer
=======================


Generating the Template Code
-----------------------------
See interpreter. Not as much detailed needed. Just mention widget/panel.

Change display name to Result View or something.


Registering the Visualizer
--------------------------
Short video editing valid visualizers for circuit.

ModelEditor
MSPlotter


Including chart.js
-----------------------------

npm install chart.js --save

config.requirejspaths['chartjs'] = `.node_modules/..`;

define('charjs/chartjs`, ....);


Visualizing the Results
-------------------------
Change the visualizer s.t. it reads an asset attribute: 'simRes' and downloads the csv file.