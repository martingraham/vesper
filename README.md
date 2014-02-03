vesper
======
Vesper (Visualisation of SPEcies Repositories) is a collection of visualisations for examining Darwin Core Archive files (DWCAs), including taxonomic, geographic and temporal views.

A demo is available at http://www.soc.napier.ac.uk/~cs22/vesperDemo/vesper/demoNew.html with instructions.

Libraries
---------
Vesper uses D3, JQuery, Leaflet and an adapted version of JSZip. And some of our own libraries. We did experiment with a load more libraries but they either didn't add much or we were importing them for just one function (most of which we usually found we could do in JQuery later).

Runnables
---------
A minimised version sits in the build dir (demoMinNew.html) and uses minimized library files found in lib

NPMness
-------
A Package.json is present, and npm install will download the appropriate modules. Unfortunately it isn't nicely browserified or anything yet, as some of the libraries are on npm, some on github, some don't have their own package.json's etc etc, so I pulled everything into the lib folder for running.

If you install grunt, then the grunt file will produce the minimised vesper versions in the build folder from the src folder.
