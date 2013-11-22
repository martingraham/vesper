vesper
======
Vesper (Visualisation of SPEcies Repositories) is a collection of visualisations for examining Darwin Core Archive files (DWCAs)

DWCAParse.js and DWCAHelper.js are used to examine and produce a basic interface for selecting parts of the DWCA to load into memory (a DWCA is just a zip file so picking and choosing isn't as easy as it first seems)

The other .js files produce the individual visualisations.

A demo is available at http://www.soc.napier.ac.uk/~cs22/vesperDemo/vesper/demoNew.html

Libraries
---------
Vesper uses D3, JQuery, Leaflet and an adpated version of JSZip. And some of our own libraries. We did experiment with a load more libraries but they either didn't add much or we were importing them for just one function (most of which we usually found we could do in JQuery later)
