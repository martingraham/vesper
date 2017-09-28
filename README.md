vesper
======
Vesper (Visualisation of SPEcies Repositories) is a collection of visualisations for examining Darwin Core Archive files (DWCAs), including taxonomic, geographic and temporal views.

A demo is available at http://www.vesper.org.uk/vesperDemo/vesper/demoNew.html with instructions.

Libraries
---------
Vesper uses D3, JQuery, JQuery-UI, Leaflet (and plug-ins) and an adapted version of JSZip. And one of our own general purpose libraries.

Runnables
---------
A minimised version sits in the build dir (demoMinNew.html) and uses minimized library files found in lib. You can export this along with the source using github's repository download function and run Vesper on your own local server if desired. (Which is basically how the demo above is produced.)

NPMness
-------
A Package.json is present, and npm install will download the appropriate modules. Unfortunately it isn't nicely browserified or anything yet, as some of the libraries are on npm, some on github, some don't have their own package.json's, there are .css and image files in the mix etc etc so I pulled everything into the lib folder for running.

If you install grunt, then running the grunt file will produce the minimised vesper versions in the build folder from the src folder. Same with gulp.
