VESPER.DWCAMapLeaflet = function (divid) {

	var dims;
    var self = this;
	var dividsub = divid.substring(1);
	
	var exitDur = 400, updateDur = 1000, enterDur = 400;
	
	var keyField, longField, latField;
    var model;

	var dwcaid2Marker = {};

    var curSelLayer;
    var curSelMaskLayer;
    var markerGroup;
    var maskGroup;
    var map;

    var maxIconHeight = 60;
    var heightMultiplier = 5;

    var selIcon = L.icon({
        iconUrl: VESPER.imgbase+'selMarker.png',
        shadowUrl: '../lib/leafletjs/images/marker-shadow.png',

        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],

        shadowAnchor: [4, 62] // the same for the shadow
    });

    var oldIcon = new L.Icon.Default();

    // what a markercluster does when the mouse is over it
    var clusterMouseOverListener = function (a) {
        VESPER.tooltip.updateText (a.latlng,
            a.layer.getChildCount()+" Records"
                +(a.layer.getSelectedChildCount() > 0 ? "<br>" + a.layer.getSelectedChildCount()+' Selected' : ""));
        VESPER.tooltip.updatePosition (a.originalEvent);
    };

    // what a markercluster does when right clicked
    var clusterSelectionListener = function (a) {
        var theseMarkers = [];
        var sel = [];
        a.layer.getAllChildMarkers (theseMarkers);
        if (theseMarkers.length > 0) {
            for (var n = 0; n < theseMarkers.length; n++) {
                sel.push (theseMarkers[n].extId);
            }
            model.getSelectionModel().clear();
            model.getSelectionModel().addAllToMap (sel);
        }
    };

    var markerMouseOverListener = function (e) {
        var eid = e.target.extId;
        var node = model.getNodeFromID (eid);
        VESPER.tooltip.updateText (model.getLabel (node),
            e.latlng+(model.getSelectionModel().contains (eid) ? "<br>Selected" : "")
        );
        VESPER.tooltip.updatePosition (e.originalEvent);
    };

    var markerSelectionListener = function (e) {
        model.getSelectionModel().clear();
        model.getSelectionModel().addToMap (e.target.extId);
    };

    // What the map does when a shape is drawn on it
    var drawListener = function (e) {
        var type = e.layerType,
            layer = e.layer;
        var sel = [];

        if (type === 'circle') {
            VESPER.log ("circle", e);
            var cll = e.layer._latlng;
            var rad = e.layer._mRadius;
            markerGroup.eachLayer(function (layer) {
                var ll = layer.getLatLng();
                if (cll.distanceTo (ll) <= rad) {
                    sel.push(layer.extId);
                    //VESPER.log ("specimen ",model.getTaxaData (model.getNodeFromID (layer.extId)),"within circle");
                }
            });
        }
        else if (type === 'rectangle') {
            VESPER.log ("rectangle", e);
            var clls = e.layer._latlngs;
            var bounds = new L.LatLngBounds (clls[0], clls[2]);
            markerGroup.eachLayer(function (layer) {
                var ll = layer.getLatLng();
                if (bounds.contains (ll)) {
                    sel.push(layer.extId);
                    //VESPER.log ("specimen ",model.getTaxaData (model.getNodeFromID (layer.extId)),"within rectangle");
                }
            });
        }
        else if (type === 'polygon') {
            VESPER.log ("polygon", e);
            var clls = e.layer._latlngs;
            var bb = new L.LatLngBounds (clls);
            markerGroup.eachLayer(function (layer) {
                var ll = layer.getLatLng();
                if (containsLatLng (clls, bb, ll)) {
                    sel.push(layer.extId);
                    //VESPER.log ("specimen ",model.getTaxaData (model.getNodeFromID (layer.extId)),"within polygon");
                }
            });
        }

        //if (curSelLayer) {
        //    map.removeLayer (curSelLayer);
        //}

        VESPER.log (sel.length, "specimens within", type);

        // Do whatever else you need to. (save to db, add to map etc)
        //map.addLayer(layer);
        curSelLayer = layer;

        model.getSelectionModel().clear();
        model.getSelectionModel().addAllToMap (sel);
    };


    this.set = function (fields, mmodel) {
        var ffields = mmodel.makeIndices ([fields.identifyingField, fields.longitude, fields.latitude]);
        keyField = ffields[0];
        longField = ffields[1];
        latField = ffields[2];
        dims = NapVisLib.getDivDims (divid);
        model = mmodel;
        VESPER.log ("set model for map", model);
    };
	
	
	this.go = function () {

        VESPER.log ("map go");
        if (!map) {
            // create the tile layer with correct attribution
            var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            var osmAttrib='Map data � OpenStreetMap contributors';
            var osm = new L.TileLayer(osmUrl, {minZoom: 1, maxZoom: 19, attribution: osmAttrib});

            d3.select(divid).style("overflow", "hidden"); // gets rid of scrollbars when the map tiles go over the edges of the display
            map = L.map(dividsub);//.setView([51.505, -0.09], 13); // set view dependent on markers now, drawControl is for draw toolbar
            map.addLayer (osm);

            // Adds leaflet.draw functionality
            var drawControl = new L.Control.Draw({
                draw: {
                    marker: false,
                    polyline: false
                }
            });
            map.addControl (drawControl);

            map.on('draw:created', drawListener);

            markerGroup = new L.MarkerClusterGroup ({
                iconCreateFunction: function(cluster) {
                    var clog = Math.log (cluster.getChildCount() + 1);
                    var height = 10 + (clog * heightMultiplier);
                    var selHeight = (height * Math.log (cluster.getSelectedChildCount() + 1)) / clog;
                    var unselHeight = height - selHeight;
                    // really small heights due to rounding errors emerge as numbers in scientific notation.
                    // this made them big in the style sheet as they took the mantissa (ooh) as the number so we squash them here.
                    if (unselHeight < 0.5 && (cluster.getChildCount() == cluster.getSelectedChildCount ())) {
                        unselHeight = 0;
                    }

                    return new L.DivIcon({ html: '<div class="unselected" style="height:'+unselHeight+'px">' + cluster.getChildCount() + '</div>'
                            +'<div class="selected" style="height:'+selHeight+'px">' + cluster.getSelectedChildCount()+ '</div>',
                        className: 'vesperMapIcon',
                        iconSize: new L.Point(40, height)
                    });
                }
            });

            markerGroup.on('clustermouseover', clusterMouseOverListener);
            markerGroup.on('clustercontextmenu', clusterSelectionListener);
        }

        var latlngs = [];
		var markers = [];

		var struc = model.getData();
		if (latField && longField) {
             var arr = [], arr2 = [];
			 for (var prop in struc) {
				 if (struc.hasOwnProperty (prop)) {
                     //var lat = +model.getIndexedDataPoint (struc[prop], latField);
                     //var longi = +model.getIndexedDataPoint (struc[prop], longField);

                     arr.length = 0;
                     arr2.length = 0;
                     model.getIndexedDataPoints (struc[prop], latField, arr);
                     model.getIndexedDataPoints (struc[prop], longField, arr2);

                     for (var d = arr.length; --d >= 0;) {
                         var lat = +arr[d];
                         var longi = +arr2[d];
                         if (!isNaN(lat) && !isNaN(longi)) {
                             var coord= [lat, longi];
                             var marker = L.marker(coord)
                                     .on ('mouseover', markerMouseOverListener)
                                     .on ('contextmenu', markerSelectionListener)
                                 ;
                             marker.extId = prop;

                             markers.push (marker);
                             latlngs.push (coord);
                             if (dwcaid2Marker[prop]) {
                                 var val = dwcaid2Marker[prop];
                                 // if stored object is marker make an array from it to add second marker to
                                 if (val.extId) {
                                     var darr = [val];
                                     dwcaid2Marker[prop] = darr;
                                     val = darr;
                                 }
                                 val.push (marker);
                             } else {
                                dwcaid2Marker[prop] = marker;
                             }
                         }
                     }
				 }
			 } 
			 markerGroup.addLayers (markers);
		}

		map.addLayer (markerGroup);
		map.fitBounds ((new L.LatLngBounds (latlngs)).pad(1.05));


        // mask layers
        var maskLayer = L.TileLayer.maskCanvas({opacity: 0.6,
            radius: 5,  // radius in pixels or in meters (see useAbsoluteRadius)
            useAbsoluteRadius: false,  // true: r in meters, false: r in pixels
            color: '#aaf',  // the color of the layer
            noMask: true
        });
        maskLayer.setData (latlngs);

        curSelMaskLayer = L.TileLayer.maskCanvas({opacity: 0.8,
            radius: 5,  // radius in pixels or in meters (see useAbsoluteRadius)
            useAbsoluteRadius: false,  // true: r in meters, false: r in pixels
            color: '#f00',  // the color of the layer
            noMask: true
        });
        curSelMaskLayer.setData ([]);


        maskGroup = L.layerGroup ([maskLayer, curSelMaskLayer]);
        //map.addLayer (maskLayer);
        //map.addLayer (curSelMaskLayer);
		
		L.control.layers ({},{"Marker Group":markerGroup, "Direct Plot":maskGroup}).addTo(map);
		L.control.scale().addTo (map);

		VESPER.log ("group ", markerGroup);
		VESPER.log ("map ", map);

        recalcHeightMultiplier();
    };


    function recalcHeightMultiplier () {
        var cc = markerGroup._topClusterLevel.getChildCount();
        var allHeight = Math.log (cc + 1);
        heightMultiplier = maxIconHeight / allHeight;
    }


	this.update = function () {
        var vals = model.getSelectionModel().values();

        //VESPER.log ("MGROUP COUNT: ", markerGroup._topClusterLevel.getChildCount());

		//if (map.hasLayer (markerGroup)) {
        if (markerGroup !== undefined) {
            recalcHeightMultiplier ();

            markerGroup.eachLayer (function(layer) {
                var sel = model.getSelectionModel().contains(layer.extId);
                //if (layer.options.icon != )
                layer.setIcon (sel ? selIcon : oldIcon);
            });

            //VESPER.log ("vals", vals);

            var lls = [];
            var lastLayer;
            for (var n = 0; n < vals.length; n++) {
                var layer = dwcaid2Marker[vals[n]];
                if (layer) {
                    if (layer.extId) {
                        lls.push (layer.getLatLng());
                        lastLayer = layer;
                    }
                    else {
                        for (var m = layer.length; --m >= 0;) {
                            var llayer = layer[m];
                            lls.push (llayer.getLatLng());
                            lastLayer = llayer;
                        }
                    }
                }
            }

            markerGroup.setAllSelectedChildCounts (model.getSelectionModel());

            if (lls.length == 1) {
                markerGroup.zoomToShowLayer (lastLayer, function () { lastLayer.openPopup()});
            }
            else if (lls.length > 1) {
                var bb = new L.LatLngBounds (lls);
                map.fitBounds(bb);
            }

            curSelMaskLayer.setData (lls);
		}
	};

    this.destroy = function () {
        //DWCAHelper.recurseClearEvents (d3.select(divid));
        map.addLayer (markerGroup); // add it so it gets removed properly. Makes sense to me. And Google Chrome profiler.
        map.addLayer (maskGroup);

        model.removeView (self);
        model = null;

        markerGroup.removeEventListener();
        markerGroup.eachLayer (function(layer) {
            layer.removeEventListener();
        });
        markerGroup.clearLayers();

        curSelMaskLayer.setData ([]);

        var lys = [];
        map.eachLayer (function(layer) {
            lys.push(layer);
        });
        map.removeEventListener();
        for (var n = 0; n < lys.length; n++) {
            map.removeLayer (lys[n]);
        }
        map.remove();

        dwcaid2Marker = {};
        DWCAHelper.twiceUpRemove(divid);
    };


    this.updateVals = this.update;

    // polyLL - array of polygon lat longs
    // bb - bounding box of those polygon lat longs
    // ll - the lat long we wish to see is inside the polygon or not
    function containsLatLng (polyLL, bb, ll) {
        var inside = false, p1, p2, i, len;

        if (!bb.contains (ll)) {
            return false;
        }

        // ray casting algorithm for detecting if point is in polygon
        for (i = 0, len = polyLL.length; i < len; i++) {
            p1 = polyLL[i];
            p2 = polyLL[(i - 1 + len) % len];

            if (((p1.lat > ll.lat) !== (p2.lat > ll.lat)) &&
                (ll.lng < (p2.lng - p1.lng) * (ll.lat - p1.lat) / (p2.lat - p1.lat) + p1.lng)) {
                inside = !inside;
            }
        }

        return inside;
    }


    // extend Leaflet MarkerClusterGroup classes to count selected marker totals at each cluster, mjg

    // Extend MarkerClusterGroup
    // mjg
    L.MarkerClusterGroup.include( {
            //mjg
            setAllSelectedChildCounts: function (selectionModel) {
                return this._topClusterLevel.setAllSelectedChildCounts (selectionModel);
            }
        }
    );

    // Extend MarkerCluster
    //mjg
    L.MarkerCluster.include( {
            _selChildCount: 0, // mjg

            // mjg
            setAllSelectedChildCounts: function (selectionModel) {
                var curCount = 0;

                for (var j = this._markers.length - 1; j >= 0; j--) {
                    if (selectionModel.contains (this._markers[j].extId)) {
                        curCount++;
                    }
                }

                for (var i = this._childClusters.length - 1; i >= 0; i--) {
                    curCount += this._childClusters[i].setAllSelectedChildCounts (selectionModel);
                }

                this._selChildCount = curCount;
                this._updateIcon ();    // seem to need to poke icon to recalc html, doesn't do it dynamically

                return curCount;
            },

            //mjg
            getSelectedChildCount: function () {
                return this._selChildCount;
            }
        }
    );
};
		