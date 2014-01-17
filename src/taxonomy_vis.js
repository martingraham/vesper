// Tree

VESPER.Tree = function(divid) {

    var self = this;

	var svg;	// top level svg
	var treeG; // matrix rectangle (i.e. not the axes)
	
	var dims;

    var absRoot;
    var curRoot;
    var spaceAlloc;
    var layout;
	var curSort;

    var thisView;
    var model;
    var noHashID;

    var ffields;

    var zoomObj = d3.behavior.zoom();	// zoom object, need to keep as we reference it later. calling d3.behavior.zoom() again gets us a different object/function
    zoomObj.scaleExtent ([1.0, 4.0]); // constrain zooming

    var exitDur = 400, updateDur = 1000, enterDur = 400;
    var keyField, rankField;
    var firstLayout = true;
    var color = d3.scale.category20c();
    var colourScale = d3.scale.linear().domain([0, 1]).range(["#ffcccc", "#ff6666"]);
    var cstore = {}, pstore = {};
    var textHide = "collapse";
    var patternName = "hatch";
    var patternID = "hatch";

    var allowedRanks = {"superroot": true, "ROOT": true, "FAM": true, "ORD": true, "ABT": true, "KLA": true, "GAT": true, "SPE": true};
	var sortOptions = {
		"Alpha": function (a,b) { var n1 = model.getLabel(a); var n2 = model.getLabel(b);
								return ( n1 < n2 ) ? -1 : ( n1 > n2 ? 1 : 0 );},
		"Descendants": function (a,b) {
            var s1 = containsCount (a);
            var s2 = containsCount (b);
            s1 = s1 || 0;
            s2 = s2 || 0;
            return s1 > s2 ? -1 : ((s1 < s2) ? 1 : 0);
		},
        "Selected": function (a,b) {
            var sModel = model.getSelectionModel();
            //console.log (a,b);
            var sel1 = sModel.contains(model.getIndexedDataPoint (a,keyField));
            var sel2 = sModel.contains(model.getIndexedDataPoint (b,keyField));
            return (sel1 === sel2) ? 0 :  (sel1 === true ? -1 : 1);
        },
        "Selected Desc": function (a,b) {
            var sModel = model.getSelectionModel();
            //console.log (a,b);
            var sel1 = a.sdcount;
            var sel2 = b.sdcount
            return (sel1 === sel2) ? 0 :  (sel1 === undefined ? 1 : (sel2 === undefined ? -1 : (sel1 - sel2)));
        }
	};

    function tooltipString (node, model) {
        var specs = model.getSpecimens(node);
        var desc = model.getDescendantCount(node);
        var sdesc = model.getSelectedDescendantCount(node);
        var subt = model.getSubTaxa(node);

        var tooltipStr = "";

        for (var n = 0; n < ffields.length; n++) {
            if (ffields[n]) {
                tooltipStr += ((n > 0) ? "<br>" : "")+ffields[n].fieldType+": "+model.getIndexedDataPoint (node, ffields[n]);
            }
        }

        tooltipStr += (subt === undefined ?
                (specs ? "<hr>"+specs.length+" specimens" : "")
                : "<hr>"+desc+" descendants")
            + (sdesc > 0 ?
                (subt === undefined ?
                (specs ? "<br>"+sdesc+" selected specimens" : "")
                : "<br>"+sdesc+" selected descendants")
            : "")
        ;

        var syn = model.getSynonyms(node);
        if (syn) {
            tooltipStr += "<hr><i>Synonymy</i>";
            for (var n = 0; n < syn.length; n++) {
               tooltipStr += "<br>" + model.getIndexedDataPoint(syn[n], keyField)+": "+model.getLabel (syn[n]);
            }
        }

        return tooltipStr;
    }


    var spaceAllocationOptions = {
        bottomUp: AdaptedD3.bottomUp()
            .sort (null)
            //.value(function(d) { return 1; })// having a value for err value, makes the layout append .value fields to each node, needed when doing bottom-up layouts
            .value(function(d) { return model.getLeafValue (d); }) // having a value for err value, makes the layout append .value fields to each node, needed when doing bottom-up layouts
            .children (function (d) { return model.getSubTaxa(d); })
            .nodeId (function (d) { return model.getIndexedDataPoint (d,keyField); })
        ,

        bottomUpLog: AdaptedD3.logPartition()
            .sort (null)
            .value (function(d) { return model.getLeafValue (d); })
            .children (function (d) { return model.getSubTaxa(d); })
            .nodeId (function (d) { return model.getIndexedDataPoint (d,keyField); })
        ,

        topDown: AdaptedD3.topDown()
            .sort (null)
            .value (null)
            .children (function (d) { return model.getSubTaxa(d); })
            .nodeId (function (d) { return model.getIndexedDataPoint (d,keyField); })
           // .filter (function (d) { return allowedRanks[model.getTaxaData(d)[rankField]]; })
    };

    function patternFill (nodeId) {
        if (nodeId !== undefined && nodeId.charAt(0) == '*') {
            //return "#000";
            return ("url(#"+patternID+")");
        }
        return null;
    }


    var partitionLayout = {

        cutoffVal: 4,

        sizeBounds: function () {
            return [dims[1], dims[0]];
        },

        booleanSelectedAttrs: function (group) {
            group
                .attr ("class", function(d) { return model.getSelectionModel().contains(d.id) ? "selected" : "unselected"; })
                .attr ("y", function (d) { return d.x; })
                .attr ("x", function (d) { return d.y; })
                .attr("width", function (d) { return d.dy; })
                .attr("height", function (d) { return d.dx; })
            ;
        },

        widthLogFunc: function (d) {
            var node = getNode (d.id);
            var containCount = containsCount (node);
            var prop = node.sdcount > 0 && containCount > 0 ? Math.log (node.sdcount + 1) / Math.log (containCount + 1) : 0;
            return prop * d.dy;
        },

        xFunc: function (d) {
            var node = getNode (d.id);
            var containCount = containsCount (node);
            var prop = node.sdcount > 0 && containCount > 0 ? Math.log (node.sdcount + 1) / Math.log (containCount + 1) : 0;
            return d.y + ((1.0 - prop) * d.dy);
        },

        propSharedAttrs: function (group, xFunc, widthFunc) {
            group
                .attr ("class", "holdsSelected")
                .attr ("y", function (d) { return d.x; })
                .attr ("x", xFunc)
                .attr("height", function (d) { return d.dx; })
                .attr("width", widthFunc)
            ;
        },

        sharedTextAttrs: function (sel) {
            function rotate (d, elem) {
                return d.dx > d.dy && d3.select(elem).node().getComputedTextLength() < d.dx - 4;
            }

            sel
                .attr ("transform", function (d) {
                return "translate ("+ (d.y)+","+(d.x + Math.max (((d.dx - 14) / 2) + 14, 14))+")"
                    + " rotate ("+(rotate(d, this) ? 90 : 0)+" "+(d.dy/2)+" 0)"
                    //: "rotate (0 0,0)"
                    ;
                })
                .attr ("clip-path", function (d) { var node = getNode (d.id); return rotate(d, this) ? null : "url(#depthclip0)"; /*"url(#depthclip"+node.depth+")";*/})
            ;
        },

        prep: function (coordSet) {
            treeG.attr("transform", "translate(0,0)");
            partitionLayout.makeTextClips (coordSet);
        },

        removeOld: function (exitSel) {
            clearMouseController (exitSel);
            NapVisLib.d3fadeAndRemoveGroups ([exitSel], exitDur, 0);
        },

        makeNew: function (enterSel) {
            var newNodes = enterSel
                .append ("svg:g")
                .attr("class", "treeNode")
                .style("opacity", 0)
                .call (mouseController)
            ;

            newNodes.append ("svg:rect")
                .call (partitionLayout.booleanSelectedAttrs)
                .style ("fill", function(d) { return patternFill (d.id); })
            ;

            newNodes.append ("svg:rect")
                .style ("opacity", 0.75)
                .call (partitionLayout.propSharedAttrs, this.xFunc, this.widthLogFunc)
            ;

            newNodes.append ("svg:text")
                .text (function(d) { var node = getNode (d.id); return model.getLabel(node); })
                //.style ("visibility", function (d) { return d.dx > 15 && d.dy > 15 ? "visible": textHide; })
                .style ("display", function (d) { return d.dx > 15 && d.dy > 15 ? null: "none"; })
                .call (partitionLayout.sharedTextAttrs)
                //.attr ("clip-path", function (d) { var node = getNode (d.id) /*d*/; return "url(#depthclip"+node.depth+")"; })
            ;

            return newNodes;
        },

        redrawExistingNodes: function (group, delay) {
            group.select("rect:not(.holdsSelected)")
                .transition()
                .delay (delay)
                .duration (updateDur)
                .call (partitionLayout.booleanSelectedAttrs)
            ;

            group.select("rect.holdsSelected")
                .transition()
                .delay (delay)
                .duration (updateDur)
                .call (partitionLayout.propSharedAttrs, this.xFunc, this.widthLogFunc)
            ;

            group.select("text")
                //.style ("visibility", function (d) { return d.dx > 15 && d.dy > 15 ? "visible": textHide; })
                .style ("display", function (d) { return d.dx > 15 && d.dy > 15 ? null: "none"; })
                //.attr ("clip-path", function (d) { var node = getNode (d.id) /*d*/; return "url(#depthclip"+node.depth+")"; })
                .transition()
                .delay (delay)
                .duration (updateDur)
                .call (partitionLayout.sharedTextAttrs)
            ;
        },

        makeTextClips: function (viewableNodes) {
            var height = svg.node().getBoundingClientRect().height;
            var depths = [];
            for (var n = 0; n < viewableNodes.length; n++) {
                var coord = viewableNodes[n];
                var node = getNode (coord.id);
                if (!depths [node.depth]) {
                    // right, right, right. Because these are text clips I have to offset the clips so they actually show the text
                    // that's what the -20 on y is doing
                    depths [node.depth] = {depth: node.depth, x: coord.y, y: -20, width: coord.dy, height: height + 20}; // y/x swap - horizontal icicle remember
                    //depths [node.depth] = {depth: node.depth, x: node.cd[1], y: 0, width: node.cd[3], height: height}; // y/x swap - horizontal icicle remember
                }
            }
            //VESPER.log ("depths", depths);

            // aaargh, webkit has a bug that means camelcase elements can't be selected
            // which meant I spent a fruitless morning trying to select "clipPath" elements.
            // Instead you have to add a class type to the clipPaths and select by that class.
            // http://stackoverflow.com/questions/11742812/cannot-select-svg-foreignobject-element-in-d3
            // https://bugs.webkit.org/show_bug.cgi?id=83438

            var clipBind = svg
                .select ("defs")
                .selectAll (".napierClip")
                .data (depths)
            ;


            var sharedClipAttrs = function (group) {
                group
                    .attr ("x", function(d) { return d.x; })
                    .attr ("y", function(d) { return d.y; })
                    .attr ("width", function(d) { return d.width; })
                    .attr ("height", function(d) { return d.height; })
                ;
            };

            clipBind.exit().remove();

            clipBind
                .select ("rect")
                .call (sharedClipAttrs)
            ;

            clipBind.enter()
                .append ("clipPath")
                .attr ("class", "napierClip")
                .attr ("id", function(d) { return noHashID+"depthclip"+d.depth; })
                .append ("rect")
                .call (sharedClipAttrs)
            ;
        }
    };

    var sunburstLayout = {

        cutoffVal: 0.05,

        sizeBounds: function () {
            var radius = d3.min(dims) / 2;
            VESPER.log ("DIMS", dims, radius);
            return [2 * Math.PI, radius * radius];
        },

        booleanSelectedAttrs: function (group) {
            group
                 .attr ("class", function(d) { return model.getSelectionModel().contains(d.id) ? "selected" : "unselected"; })
            ;
        },

        propSelectedAttrs: function (group) {
            group.attr ("class", "holdsSelected") ;
        },

        sharedTextAttrs: function (sel) {
            function rotate (d, elem) {
                return d.dx > d.dy && d3.select(elem).node().getComputedTextLength() < d.dx - 4;
            }

            sel
                .attr ("transform", function (d) {
                return "translate ("+ (d.x)+","+ d.y+")"
                   // + " rotate ("+(rotate(d, this) ? 90 : 0)+" "+(d.dy/2)+" 0)"
                    //: "rotate (0 0,0)"
                    ;
                })
                //.attr ("clip-path", function (d) { var node = getNode (d.id) /*d*/; return rotate(d, this) ? null : "url(#"+noHashID+"depthclip0)"; /*"url(#"+noHashID+"depthclip"+node.depth+")";*/})
            ;
        },

        arc: d3.svg.arc()
            .startAngle(function(d) { return d.x; })
            .endAngle(function(d) { return d.x + d.dx; })
            .innerRadius(function(d) { return Math.sqrt(d.y); })
            .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); })
        ,

        parc: d3.svg.arc()
            .startAngle(function(d) { return d.x; })
            .endAngle(function(d) { return d.x + d.dx; })
            .innerRadius(function(d) {
                var oRad = Math.sqrt(d.y + d.dy);
                var diff = oRad - Math.sqrt (d.y);
                var node = getNode (d.id);
                var prop = 0;
                var containCount = containsCount (node);
                if (containCount > 0 && node.sdcount > 0) {
                    prop = Math.log (node.sdcount + 1) / Math.log (containCount + 1);
                    prop *= prop; // square cos area of ring is square of radius
                }
                return oRad - (prop * diff);
            })
            .outerRadius(function(d) {
                return Math.sqrt(d.y + d.dy);
            })
        ,


        // Stash the old values for transition.
        cstash: function (d) {
            cstore[d.id] = {x0: d.x, dx0: d.dx, y0: d.y, dy0: d.dy};
        },
        pstash: function (d) {
            pstore[d.id] = {x0: d.x, dx0: d.dx, y0: d.y, dy0: d.dy};
        },

        // Interpolate the arcs in data space.
        arcTween: function (a) {
            //VESPER.log ("a", a, a.dx0);
            var cs = cstore [a.id];
            if (cs === undefined) {
                VESPER.log ("No STORE", a.id, a);
            }
            if (cs) {
                var i = d3.interpolate({x: cs.x0, dx: cs.dx0, y: cs.y0, dy: cs.dy0}, a);
                return function(t) {
                    var b = i(t);
                    cs.x0 = b.x;
                    cs.dx0 = b.dx;
                    cs.y0 = b.y;
                    cs.dy0 = b.dy;
                    return sunburstLayout.arc(b);
                };
            }
        },

        parcTween: function (a) {
            //VESPER.log ("a", a, a.dx0);
            var ps = pstore [a.id];
            var i = d3.interpolate({x: ps.x0, dx: ps.dx0, y: ps.y0, dy: ps.dy0}, a);
            return function(t) {
                var b = i(t);
                ps.x0 = b.x;
                ps.dx0 = b.dx;
                ps.y0 = b.y;
                ps.dy0 = b.dy;
                return sunburstLayout.parc(b);
            };
        },

        prep: function (coordSet) {
            treeG.attr("transform", "translate(" + dims[0] / 2 + "," + dims[1] * .52 + ")");
           // partitionLayout.makeTextClips (coordSet);
        },

        removeOld: function (exitSel) {
            clearMouseController (exitSel);
            exitSel
                .transition()
                .delay(0)
                .duration(0)
                .each ("end", function() {
                    var id = d3.select(this).datum().id;
                    cstore[id] = undefined;
                    pstore[id] = undefined;
                })
            ;
            NapVisLib.d3fadeAndRemoveGroups ([exitSel], exitDur, 0);
        },

        makeNew: function (enterSel) {

            var newNodes = enterSel
                .append ("svg:g")
                .attr("class", "treeNode")
                .style("opacity", 0)
                 .call (mouseController)
            ;

            newNodes
                .append("path")
                //.attr("display", function(d) { var node = getNode (d.id); return node.depth ? null : "none"; }) // hide inner ring
                .attr("d", sunburstLayout.arc)
                //.attr ("id", function(d) { return "arc"+ d.id; })
                .call (sunburstLayout.booleanSelectedAttrs)
                .style ("fill", function(d) { return patternFill (d.id); })
                .each(sunburstLayout.cstash)
            ;

            newNodes
                .append("path")
                //.attr("display", function(d) { var node = getNode (d.id); return node.depth ? null : "none"; }) // hide inner ring
                .attr("d", sunburstLayout.parc)
                //.attr ("id", function(d) { return "parc"+ d.id; })
                .style ("opacity", 0.75)
                .call (sunburstLayout.propSelectedAttrs)
                .each(sunburstLayout.pstash)
            ;

            return newNodes;
        },

        redrawExistingNodes: function (group, delay) {
           group
               .select("path:not(.holdsSelected)")
               .call (sunburstLayout.booleanSelectedAttrs)
                .transition()
                .delay (delay)
                .duration(updateDur)
                .attrTween("d", sunburstLayout.arcTween)
                .each ("end", sunburstLayout.cstash)
            ;

            group
                .select("path.holdsSelected")
                .call (sunburstLayout.propSelectedAttrs)
                .transition()
                .delay (delay)
                .duration(updateDur)
                .attrTween("d", sunburstLayout.parcTween)
                .each ("end", sunburstLayout.pstash)
            ;

            group.select("text")
                .style ("visibility", function (d) { return d.dx > 1 ? "visible": "collapse"; })
            ;
        }
    };

    var layoutOptions = {Icicle: partitionLayout, Sunburst: sunburstLayout};

    this.set = function (fields, mmodel) {
        ffields = mmodel.makeIndices ([fields.identifyingField, fields.rankField]);
        keyField = ffields[0];
        rankField = ffields[1];
        //VESPER.log ("FFIELDS", ffields);
        dims = NapVisLib.getWidthHeight (d3.select(divid).node());
        model = mmodel;
    };

	
	this.go = function () {
		thisView = this;

        // stop annoying scrollbar even when svg is same height as parent div
        d3.select(divid).style("overflow", "hidden");
        noHashID = divid.substring(1);

        // make patternid unique to view, as having the same id in different views caused problems
        // i.e. the pattern would be regarded as undisplayable in other taxonomies if the view it was first connected to was hidden
        patternID = patternName + noHashID;

		svg = d3.select(divid)
			.append("svg:svg")
			.attr("class", "visContainer")
			.attr("pointer-events", "all")
		;
		
		svg.append ("defs");
        var hatchPattern = svg.select("defs")
            .append("pattern")
            .attr("id", patternID)
        ;
        hatchPattern
            .attr ("x", 0)
            .attr ("y", 0)
            .attr ("width", 4)
            .attr ("height", 4)
            .attr ("patternUnits", "userSpaceOnUse")
            .attr ("viewBox", "0 0 4 4 ")
        ;

        var hatch = [0,2];
        hatchPattern.selectAll("rect").data(hatch)
            .enter()
            .append("rect")
                .attr ("x", function(d,i) { return i * 2; })
                .attr ("y", function(d,i) { return i * 2; })
                .attr ("width", 2)
                .attr ("height", 2)
                .attr ("class", "indHatch")
                .classed ("unselected", true)
        ;

		
		treeG = svg
			.append ("svg:g")
			.attr("class", "treeSVG")
		;

        var vals = model.getSelectionModel().values();
        var root = (vals.length == 1) ? getNode(vals[0]) : self.getRoot(model);
        if (root === undefined) {
            VESPER.log ("no root defined for tree", self.getRoot());
            return;
        }

        absRoot = root;

        var spaceAllocs = d3.values(spaceAllocationOptions);
        for (var n = 0; n < spaceAllocs.length; n++) {
            var indAlloc = spaceAllocs[n];
            //indAlloc.size ([dims[1], dims[0]]);
            //indAlloc.size (partitionLayout.sizeBounds());
        }
        spaceAlloc = spaceAllocationOptions.bottomUpLog;
		curSort = sortOptions.Alpha;
        layout = layoutOptions.Sunburst;

		//depthCharge (root);
        setupControls ();

        //$('[title!=""]').qtip();
		
		this.update ();
	};



    function setupControls () {
        var cpanel = d3.select(divid)
            .append("div")
            .attr ("class", "visControl")
            .attr ("id", noHashID+"controls")
        ;

        //NapVisLib.addHRGrooves (cpanel);
        DWCAHelper.addDragArea (cpanel);

        NapVisLib.makeSectionedDiv (cpanel,
            [{"header":"Space Allocation", "sectionID":"Space"},{"header":"Layout Style", "sectionID":"Layout"},
                {"header":"Sort", sectionID:"Sort"}],
        "section");

        //var spaceDiv = cpanel.append("div").attr("class", "taxaControlsSpaceAlloc");
        //spaceDiv.append("p").html("Space Allocation");
        //var allocBinds = spaceDiv.selectAll("button.allocChoice")
        //    .data(d3.entries (spaceAllocationOptions), function(d) { return d.key; });
        var allocBinds = d3.select(divid+"controlsSpace").selectAll("button.allocChoice")
            .data(d3.entries (spaceAllocationOptions), function(d) { return d.key; });
        var aHolders = allocBinds.enter()
            .append ("span")
            .attr ("class", "fieldGroup")
        ;
        aHolders.append("input")
            .attr ("class", "allocChoice")
            .attr ("type", "radio")
            .attr ("id", function(d) { return noHashID+ d.key; })
            .attr ("name", function(d) { return noHashID+"alloc"; })
            .property ("checked", function(d) { return spaceAlloc === d.value; })
            .on ("change", function(d) {
               // if (spaceAlloc !== d.value) {
                    spaceAlloc = d.value;
                    reroot (curRoot);
                    //thisView.update();
               // }
                return false;
            })
        ;
        aHolders.append("label")
            .attr ("for", function(d) { return noHashID+ d.key; })
            .html (function(d) { return d.key; })
        ;

        /*
        var layoutDiv = cpanel.append("div").attr("class", "taxaControlsLayout");
        layoutDiv.append("p").html("Layout Style");
        var layoutBinds = layoutDiv.selectAll("button.layoutChoice")
            .data(d3.entries (layoutOptions), function(d) { return d.key; });
            */
        var layoutBinds = d3.select(divid+"controlsLayout").selectAll("button.layoutChoice")
            .data(d3.entries (layoutOptions), function(d) { return d.key; });
        var lHolders = layoutBinds.enter()
            .append ("span")
            .attr ("class", "fieldGroup")
        ;
        lHolders.append ("input")
            .attr ("class", "layoutChoice")
            .attr ("type", "radio")
            .attr ("id", function(d) { return noHashID+ d.key; })
            .attr ("name", function(d) { return noHashID+"layout"; })
            .property ("checked", function(d) { return layout === d.value; })
            .on ("change", function(d) {
               // if (layout !== d.value) {
                    layout = d.value;
                    var nodeBind = treeG.selectAll(".treeNode");
					clearMouseController (nodeBind);
                    nodeBind.remove();
                    reroot (curRoot);
               // }
                return false;
            })
            .html (function(d) { return d.key; })
        ;
        lHolders.append ("label")
            .attr("for", function(d) { return noHashID+ d.key; })
            .html (function(d) { return d.key; })
        ;

        /*
        var sortDiv = cpanel.append("div").attr("class", "taxaControlsSort");
		sortDiv.append("p").html("Sort");
        var sortBinds = sortDiv.selectAll("button.sortChoice")
            .data(d3.entries (sortOptions), function(d) { return d.key; });
            */
        var sortBinds = d3.select(divid+"controlsSort").selectAll("button.sortChoice")
            .data(d3.entries (sortOptions), function(d) { return d.key; });
        var sHolders = sortBinds.enter()
            .append ("span")
            .attr ("class", "fieldGroup")
        ;
        sHolders.append ("input")
            .attr ("class", "sortChoice")
            .attr ("type", "radio")
            .attr ("id", function(d) { return noHashID+ d.key; })
            .attr ("name", function(d) { return noHashID+"sort"; })
            .property ("checked", function(d) { return curSort === d.value; })
            .on ("change", function(d) {
               // if (layout !== d.value) {
                    curSort = d.value;
                    reroot (curRoot);
               // }
                return false;
            })
            .html (function(d) { return d.key; })
        ;
        sHolders.append ("label")
            .attr("for", function(d) { return noHashID+ d.key; })
            .html (function(d) { return d.key; })
        ;

        $("#"+noHashID+"controls").draggable();
    }


	function getNode (id) {
        var node = model.getNodeFromID (id);
        if (node == undefined) {
            node = model.getNodeFromID (id.substring(1));
        }
        return node;
    }

    function containsCount (node) {
        var cc = node.dcount;
        if (!cc) {
            var specs = model.getSpecimens(node);
            if (specs) {
                cc = specs.length;
            }
        }
        return cc;
    }


    function reroot (root) {
        if (firstLayout) {
            if (VESPER.alerts) { alert ("about to calc layout"); }
            firstLayout = false;
        }

        spaceAlloc
            .size (layout.sizeBounds())
            .cutoff (layout.cutoffVal)
			.sort (curSort)
        ;
        VESPER.log ("what alloc reports ",spaceAlloc.size());
        VESPER.log ("root", root);
        var coordSet = spaceAlloc.nodes (root);
        VESPER.log (coordSet.length, coordSet);
        curRoot = root;

        var nodeBind = treeG
            .selectAll(".treeNode")
            .data(coordSet, function(d) { return d.id /*d[DWCAParser.TDATA][keyField]*/; })
        ;

        layout.prep (coordSet);

        // remove old nodes
        layout.removeOld (nodeBind.exit());
        var cumDelay = (nodeBind.exit().empty() ? 0 : exitDur);

        // process existing nodes
        layout.redrawExistingNodes (nodeBind, cumDelay);
        cumDelay += (nodeBind.empty()) ? 0 : updateDur;

        // add new nodes
        var newNodes = layout.makeNew (nodeBind.enter());
        //VESPER.log (newNodes);
        NapVisLib.d3fadeInNewGroups ([newNodes], enterDur, cumDelay);
    }


	this.update = function () {
        var vals = model.getSelectionModel().values();
        var root = (vals.length == 1) ? getNode(vals[0]) : self.getRoot(model);
        VESPER.log ("Root", root, vals[0]);

        model.countSelectedDesc (self.getRoot(model), keyField);
        root = firstBranch (self.getRoot(model));
        reroot (root);
	};


    this.getRoot = function (mod) {
        return mod.getImplicitRoot();
    };

    this.updateVals = this.update;


    // calculate suitable root for vis
    // suitable root is first node who has more than one child either holding selected descendants or is selected
    function firstBranch (node) {
        var nid = model.getIndexedDataPoint (node, keyField);
        if (node.sdcount == undefined || node.sdcount == 0 || model.getSelectionModel().contains (nid)) {
            return node;
        }
        var children = model.getSubTaxa (node);
        if (children) {
            var splitCount = 0;
            var singleNode;
            for (var n = 0; n < children.length; n++) {
                var child = children[n];
                var cid = model.getIndexedDataPoint (child, keyField);
                if (model.getSelectionModel().contains (cid)) {
                    splitCount++;
                }
                else if (child.sdcount > 0) {
                    splitCount++;
                    singleNode = child;
                }
            }
            // is a split if more than one child is selected or has selected descendants, so make root here
            if (splitCount > 1) {
                return node;
            }

            // if just one child holds selected descendants (and isn't selected itself, guaranteed by else if above) then pursue that path recursively
            if (singleNode) {
                node = firstBranch (singleNode);
            }
            /*
            else {
                node = node; // otherwise return the current node (parent to single selected node)
            }
            */
        }
        return node;
    }


    this.redraw = function () {
        var nodes = treeG.selectAll(".treeNode");
        layout.redrawExistingNodes (nodes, 0);
    };


    this.destroy = function () {
        clearMouseController (treeG.selectAll(".treeNode"));
        treeG.selectAll(".treeNode").remove();
        $(divid+"controls").draggable("destroy");
        model.removeView (self);
        // null model and roots, basically any var that points to the data. Help GC along.
        // Google chrome profiler says it does so ner
        model = null;
        absRoot = null;
        curRoot = null;
        cstore = {};
        pstore = {};

        DWCAHelper.twiceUpRemove(divid);
    };


    function clearMouseController (group) {
        group
            .on ("click", null)	// remove event handler
            .on ("mouseover", null)	// remove event handler
            .on ("mouseout", null)	// remove event handler
            .on ("contextmenu", null) // remove event handler
        ;
    }

	function mouseController (group) {
        group
        .on("click", function (d) {
            var node = getNode (d.id) /*d*/;
            reroot ((node == curRoot && node.parent != undefined) ? node.parent : node);
        })
        .on("mouseover", function(d) {
            d3.select(this).selectAll("*").classed("highlight", true);
            //handle mouse over
            var node = getNode (d.id) /*d*/;
            var val = tooltipString (node, model);
            VESPER.tooltip.updateText (model.getLabel(node), val);
            VESPER.tooltip.updatePosition (d3.event);
        })
        .on ("mouseout", function(d) {
            d3.select(this).selectAll("*").classed("highlight", false);
        })
        .on("contextmenu", function(d) {
            //handle right click
            selectSubTree (getNode (d.id));
            //stop showing browser menu
            d3.event.preventDefault();
        });

    }

    function selectSubTree (node) {
        model.getSelectionModel().clear();
        var ids = [];
        selectSubTreeR (node, ids);
        model.getSelectionModel().addAllToMap(ids);
    }

    function selectSubTreeR (node, ids) {
        //var id = model.getTaxaData(node)[keyField];
        var id = model.getIndexedDataPoint (node, keyField);
        ids.push(id);

        var taxa = model.getSubTaxa (node);
        if (taxa != undefined) {
            for (var n = 0; n < taxa.length; n++) {
                selectSubTreeR (taxa[n], ids);
            }
        }
        var specs = model.getSpecimens (node);
        if (specs != undefined) {
            for (var n = 0; n < specs.length; n++) {
                selectSubTreeR (specs[n], ids);
            }
        }
    }


	function reset() {
		d3.event.scale = 1.0;
		d3.event.translate = [0,0];
		zoomObj.translate([0,0]).scale(1);
		//redraw ();
	}
};

VESPER.ImplicitTaxonomy = function (div) {
    var tree = new VESPER.Tree (div);
    tree.type = "impTree";
    tree.getRoot = function (mod) {
        return mod.getImplicitRoot();
    };
    return tree;
};

VESPER.ExplicitTaxonomy = function (div) {
    var tree = new VESPER.Tree (div);
    tree.type = "expTree";
    tree.getRoot = function (mod) {
        return mod.getExplicitRoot();
    };
    return tree;
};