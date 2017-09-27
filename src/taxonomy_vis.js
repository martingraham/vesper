// Tree

VESPER.Tree = function (divid) {

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

    var colorScale = d3.scale.category20c();
    var colorMode = false;
    //var colourScale = d3.scale.linear().domain([0, 1]).range(["#ffcccc", "#ff6666"]);

    var cstore = {}, pstore = {};
    var patternName = "hatch", patternID = "hatch";

    //var allowedRanks = {"superroot": true, "ROOT": true, "FAM": true, "ORD": true, "ABT": true, "KLA": true, "GAT": true, "SPE": true};
	var sortOptions = {
		"Alpha": function (a,b) { var n1 = model.getLabel(a), n2 = model.getLabel(b);
								return ( n1 < n2 ) ? -1 : ( n1 > n2 ? 1 : 0 );},
		"Descendants": function (a,b) {
            var s1 = self.containsCount (a, model) || 0;
            var s2 = self.containsCount (b, model) || 0;
            return s1 > s2 ? -1 : ((s1 < s2) ? 1 : 0);
		},
        "Selected": function (a,b) {
            var sModel = model.getSelectionModel();
            var sel1 = sModel.contains(model.getIndexedDataPoint (a,keyField));
            var sel2 = sModel.contains(model.getIndexedDataPoint (b,keyField));
            return (sel1 === sel2) ? 0 :  (sel1 === true ? -1 : 1);
        },
        "SelectedDesc": function (a,b) {
            //console.log (a,b);
            var sel1 = model.getSelectedObjectCount(a);
            var sel2 = model.getSelectedObjectCount(b);
            return (sel1 === sel2) ? 0 :  (sel1 === undefined ? 1 : (sel2 === undefined ? -1 : (sel2 - sel1)));
        }
	};
    var sortOptionLabels = {"Alpha": $.t("tree.sortAlpha"), "Descendants": $.t("tree.sortDesc"),
        "Selected": $.t("tree.sortSel"), "SelectedDesc": $.t("tree.sortDescSel")};


    this.ttipNumFormat = d3.format (",");
    this.tooltipString = function () {
        return "Placeholder";
    };



    var spaceAllocationOptions = {
        bottomUp: MGNapier.AdaptedD3.bottomUp()
            .sort (null)
            .value(function(d) { return model.getLeafValue (d); }) // having a value for err value, makes the layout append .value fields to each node, needed when doing bottom-up layouts
            .children (function (d) { return model.getSubTaxa(d); })
            .nodeId (function (d) { return model.getIndexedDataPoint (d,keyField); })
        ,

        bottomUpLog: MGNapier.AdaptedD3.logPartition()
            .sort (null)
            .value (function(d) { return model.getLeafValue (d); })
            .children (function (d) { return model.getSubTaxa(d); })
            .nodeId (function (d) { return model.getIndexedDataPoint (d,keyField); })
        ,

        topDown: MGNapier.AdaptedD3.topDown()
            .sort (null)
            .value (null)
            .children (function (d) { return model.getSubTaxa(d); })
            .nodeId (function (d) { return model.getIndexedDataPoint (d,keyField); })
           // .filter (function (d) { return allowedRanks[model.getTaxaData(d)[rankField]]; })
    };
    var spaceAllocationLabels = {"bottomUp": $.t("tree.sizeBottomUp"), "bottomUpLog": $.t("tree.sizeBottomUpLog"), "topDown": $.t("tree.sizeTopDown")};


    function patternFill (nodeId) {
        if (nodeId !== undefined && nodeId.charAt(0) === '*') {
            //return "#000";
            return ("url(#"+patternID+")");
        }
        return null;
    }

    function colourFill (nodeId) {
        if (!colorMode) {
            return null;
        }
        var node = getNode (nodeId);
        var val = model.getIndexedDataPoint (node, rankField);
        return colorScale (val);
    }

    // try pattern fill and colour fill together. Pattern fill has priority i.e. if non-null colourFill won't be asked
    function jointFill (nodeId) {
        return patternFill (nodeId) || colourFill (nodeId);
    }


    this.colourByRanks = function (ords) {
        colorScale.domain (ords);
        colorMode = !colorMode;
        layout.updateFills (treeG.selectAll(".treeNode"));
    };


    this.containsCount = function (node) {
        return (model.getDescendantCount(node) || 0);// + (model.getSynonymCount(node) || 0);
    };


    function logSelProp (node) {
        var containCount = model.getObjectCount (node);
        var sdcount = model.getSelectedObjectCount(node);
        var prop = sdcount > 0 && containCount > 0 ? Math.log (sdcount + 1) / Math.log (containCount + 1) : 0;
        return prop;
    }

    var margin = 20;

    var partitionLayout = {

        cutoffVal: 4,

        sizeBounds: function () {
            return [dims[1] - margin, dims[0] - margin];
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
            return logSelProp (node) * d.dy;
        },

        xFunc: function (d) {
            var node = getNode (d.id);
            var prop = logSelProp (node);
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
                return d.dx > d.dy && elem.getComputedTextLength() < d.dx - 4;
            }

            sel
                .attr ("transform", function (d) {
                    var rot = rotate (d, this);

                    if (rot) {
                        var sl = this.getComputedTextLength();
                        var mg = Math.max (0, (d.dx - sl) / 2);
                        return "translate ("+ (d.y)+","+d.x+") "
                            + " rotate (90 0 0)"
                            + " translate ("+mg+", -"+(d.dy/2)+")"
                        ;
                    } else {
                        return "translate ("+ (d.y)+","+(d.x + Math.max (((d.dx - 14) / 2) + 14, 14))+") " ;
                    }
                })
                .attr ("clip-path", function (d) { return rotate(d, this) ? null : "url("+divid+"depthclipR0)";})
            ;
        },

        prep: function (coordSet) {
            treeG.attr("transform", "translate("+margin/2+","+margin/2+")");
            partitionLayout.makeTextClips (coordSet);
        },

        removeOld: function (exitSel) {
            clearMouseController (exitSel);
            MGNapier.NapVisLib.d3fadeAndRemoveGroups ([exitSel], exitDur, 0);
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
                .style ("fill", function(d) { return jointFill (d.id); })
            ;

            newNodes.append ("svg:rect")
                .style ("opacity", 0.75)
                .call (partitionLayout.propSharedAttrs, this.xFunc, this.widthLogFunc)
            ;

            newNodes.append ("svg:text")
                .text (function(d) { return model.getLabel (getNode (d.id)); })
                //.style ("visibility", function (d) { return d.dx > 15 && d.dy > 15 ? "visible": textHide; })
                .style ("display", function (d) { return d.dx > 15 && d.dy > 15 ? null: "none"; })
                .call (partitionLayout.sharedTextAttrs)
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
                .transition()
                .delay (delay)
                .duration (updateDur)
                .call (partitionLayout.sharedTextAttrs)
            ;
        },

        updateFills: function (groupElems) {
            groupElems.select("rect:not(.holdsSelected)")
                .style ("fill", function(d) { return jointFill (d.id); })
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
                .selectAll (".napierClipR")
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
                .attr ("class", "napierClipR")
                .attr ("id", function(d) { return noHashID+"depthclipR"+d.depth; })
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

            sel
                .attr ("transform", function (d) {
                    var node = getNode (d.id);
                    if (node.depth === 0) {
                        return "translate (0,0)" ;
                    }

                    var ang = (d.x + (d.dx/2)) * (360 / (2 * Math.PI)) - 90;
                    return "rotate ("+ang+" 0 0) "
                        + "translate ("+Math.sqrt(d.y)+",0) "
                    ;
                 })
                .style ("text-anchor", function (d) { return getNode(d.id).depth === 0 ? "middle" : null; })
                .style ("display", function (d) { return d.dx > 0.1 && (Math.sqrt(d.y+ d.dy) - Math.sqrt(d.y)) > 20 ? null: "none"; })
                .attr ("clip-path", function (d) { return "url("+divid+"depthclip"+getNode(d.id).depth+")";})
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
                var node = getNode (d.id);
                var prop = logSelProp (node);
                /*
                var oRad = Math.sqrt(d.y + d.dy);
                var area = oRad - Math.sqrt (d.y);
                prop *= prop; // square cos area of ring is square of radius
                var propArea = area * prop;
                return oRad - propArea;
                */

                var x = Math.sqrt ((d.y + d.dy) - (prop * d.dy));
                return x;
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
            treeG.attr("transform", "translate(" + dims[0] / 2 + "," + dims[1] / 2 + ")");
            sunburstLayout.makeTextClips (coordSet);
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
            MGNapier.NapVisLib.d3fadeAndRemoveGroups ([exitSel], exitDur, 0);
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
                .style ("fill", function(d) { return jointFill (d.id); })
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

            newNodes
                .append("svg:text")
                    .text (function(d) { return model.getLabel (getNode (d.id)); })
                    .call (sunburstLayout.sharedTextAttrs)
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

            var endFunc = function () {
                d3.select(this)
                    .call (sunburstLayout.sharedTextAttrs)
                ;
            };

            group.select("text")
                .style ("display", "none")
                .transition()
                .delay (delay)
                .duration (updateDur)
                .each ("end", endFunc)
            ;
        },

        updateFills: function (groupElems) {
            groupElems.select("path:not(.holdsSelected)")
                .style ("fill", function(d) { return jointFill (d.id); })
            ;
        },

        makeTextClips: function (viewableNodes) {
            //var height = svg.node().getBoundingClientRect().height;
            //var width = svg.node().getBoundingClientRect().width;
            var depths = [];
            for (var n = 0; n < viewableNodes.length; n++) {
                var coord = viewableNodes[n];
                var node = getNode (coord.id);
                if (!depths [node.depth]) {
                    depths [node.depth] = {depth: node.depth, inner: Math.sqrt(coord.y), outer: Math.sqrt(coord.y + coord.dy)};
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

            // hnng. 'r' is related to the difference between inner and outer radii and not just the outer radius
            // this appears to be because the text elements all start at (0,0) and are transformed from there
            // rather than given x,y values as direct attributes
            var sharedClipAttrs = function (group) {
                group
                    .attr ("cx", 0)
                    .attr ("cy", 0)
                    .attr ("r", function(d) { return d.outer - d.inner; })
                ;
            };

            clipBind.exit().remove();

            clipBind
                .select ("circle")
                .call (sharedClipAttrs)
            ;

            clipBind.enter()
                .append ("clipPath")
                .attr ("class", "napierClip")
                .attr ("id", function(d) { return noHashID+"depthclip"+d.depth; })
                .append ("circle")
                .call (sharedClipAttrs)
            ;
        }
    };

    var layoutOptions = {Icicle: partitionLayout, Sunburst: sunburstLayout};
    var layoutOptionLabels = {Icicle:$.t("tree.layoutIcicle"), Sunburst: $.t("tree.layoutSunburst")};

    this.set = function (fields, mmodel) {

        ffields = mmodel.makeIndices ([fields.identifyingField, fields.rankField]);
        VESPER.log ("FIELDS", fields, mmodel, ffields);
        keyField = ffields[0];
        rankField = ffields[1];
        //VESPER.log ("FFIELDS", ffields);
        dims = [$(divid).width(), $(divid).height()];
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
        var root = (vals.length === 1) ? getNode(vals[0]) : self.getRoot(model);
        if (root === undefined) {
            VESPER.log ("no root defined for tree", self.getRoot(model), root, vals);
            return;
        }

        absRoot = root;

        spaceAlloc = spaceAllocationOptions.bottomUpLog;
		curSort = sortOptions.Alpha;
        layout = layoutOptions.Sunburst;

		//depthCharge (root);
        setupControls ();

        this.doExtra ();
		this.update ();
	};
    
    
    this.resized = function () {
        d3.select(divid).style("height", "95%");
        dims = [$(divid).width(), $(divid).height()];
        reroot(curRoot);
    };


    this.doExtra = function () {};



    function setupControls () {
        var cpanel = d3.select(divid)
            .append("div")
            .attr ("class", "visControl")
            .attr ("id", noHashID+"controls")
        ;
        var idFunc = function(d) { return noHashID + d.key; };

        VESPER.DWCAHelper.addDragArea (cpanel);

        var accPanel = cpanel.append("div").attr("id", noHashID+"accordion");

        var headers = [$.t("tree.sizeLabel"),$.t("tree.layoutLabel"),$.t("tree.sortLabel")];
        accPanel.selectAll("h3").data(headers)
            .enter()
            .append ("h3")
            .text (function(d) { return d; })
        ;

        accPanel.selectAll("div.accordSection").data(["Space", "Layout", "Sort"])
            .enter()
            .insert ("div", function(d,i) {
                // from d3 docs: the before selector may be specified as a selector string or a function which returns a *DOM element* (not d3 selection)
                return accPanel.select("h3:nth-of-type("+(i + 2)+")").node();
            })
            .attr ("class", "accordSection")
            .attr ("id", function(d) { return noHashID+"controls"+d;  })
        ;

        var section = d3.select(divid+"controlsSpace");
        VESPER.DWCAHelper.addRadioButtons (section, d3.entries (spaceAllocationOptions), "fieldGroup",
            noHashID+"alloc", idFunc, function(d) { return spaceAllocationLabels[d.key];} );
        section.selectAll("input")
            .property ("checked", function(d) { return spaceAlloc === d.value; })
            .on ("change", function(d) {
                spaceAlloc = d.value;
                reroot (curRoot);
                return false;
            })
        ;

        section = d3.select(divid+"controlsLayout");
        VESPER.DWCAHelper.addRadioButtons (section, d3.entries (layoutOptions), "fieldGroup",
            noHashID+"layout", idFunc, function(d) { return layoutOptionLabels[d.key];} );
        section.selectAll("input")
            .property ("checked", function(d) { return layout === d.value; })
            .on ("change", function(d) {
                layout = d.value;
                var nodeBind = treeG.selectAll(".treeNode");
                clearMouseController (nodeBind);
                nodeBind.remove();
                reroot (curRoot);
                return false;
            })
        ;

        section = d3.select(divid+"controlsSort");
        VESPER.DWCAHelper.addRadioButtons (section, d3.entries (sortOptions), "fieldGroup",
            noHashID+"sort", idFunc, function(d) { return sortOptionLabels[d.key];} );
        section.selectAll("input")
            .property ("checked", function(d) { return curSort === d.value; })
            .on ("change", function(d) {
                curSort = d.value;
                reroot (curRoot);
                return false;
            })
        ;

        $(divid+"accordion").accordion({
            heightStyle: "content",
            collapsible: true,
            active: false
        });

        $(divid+"controls").draggable({handle:"div.dragHandle", containment:divid});
    }


	function getNode (id) {
        var node = model.getNodeFromID (id);
        if (node == undefined && id) {
            node = model.getNodeFromID (id.substring(1));
        }
        return node;
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
            .data(coordSet, function(d) { return d.id /*d[model.getParser().TDATA][keyField]*/; })
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
        MGNapier.NapVisLib.d3fadeInNewGroups ([newNodes], enterDur, cumDelay);
    }


	this.update = function () {
        var vals = model.getSelectionModel().values();
        var root = (vals.length === 1) ? getNode(vals[0]) : self.getRoot(model);
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
        if (!model.getSelectedDescendantCount(node) || model.getSelectionModel().contains (nid)) {
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
                else if (model.getSelectedDescendantCount(child) > 0) {
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


    this.getModel = function () {
        return model;
    };


    this.destroy = function () {
        clearMouseController (treeG.selectAll(".treeNode"));
        treeG.selectAll(".treeNode").remove();
        $(divid+"controls").draggable("destroy");
        $(divid+"accordion").accordion("destroy");
        model.removeView (self);
        // null model and roots, basically any var that points to the data. Help GC along.
        // Google chrome profiler says it does so ner
        model = null;
        absRoot = null;
        curRoot = null;
        cstore = {};
        pstore = {};

        VESPER.DWCAHelper.twiceUpRemove(divid);
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
            reroot ((node === curRoot && node.parent != undefined) ? node.parent : node);
        })
        .on("mouseover", function(d) {
            d3.select(this).selectAll("*").classed("highlight", true);
            //handle mouse over
            var node = getNode (d.id) /*d*/;
            var val = self.tooltipString (node, model, ffields);
            VESPER.tooltip
                .updateText (model.getLabel(node), val)
                .updatePosition (d3.event)
            ;
        })
        .on ("mouseout", function() {
            VESPER.tooltip.setToFade();
            d3.select(this).selectAll("*").classed("highlight", false);
        })
        .on("contextmenu", function(d) {
            //handle right click
            model.selectSubTree (getNode (d.id), keyField);
            //stop showing browser menu
            d3.event.preventDefault();
        });

    }
};

VESPER.ImplicitTaxonomy = function (div) {
    var tree = new VESPER.Tree (div);
    tree.type = "impTree";

    tree.getRoot = function (mod) {
        return mod.getImplicitRoot();
    };

    tree.tooltipString = function (node, model, ffields) {
        console.log ("tooltip node", node);
        var desc = model.getDescendantCount (node);
        var sdesc = model.getSelectedDescendantCount(node);
        var subt = model.getSubTaxa(node);

        var tooltipStr = "";

        for (var n = 0; n < ffields.length; n++) {
            if (ffields[n]) {
                tooltipStr += ((n > 0) ? "<br>" : "")+ffields[n].fieldType+": "+model.getIndexedDataPoint (node, ffields[n]);
            }
        }

        tooltipStr += (subt === undefined ? "" : "<hr>"+$.t("tree.taxaTooltip", {count: desc}))
            + (sdesc > 0 ?
                (subt === undefined ? "" : "<br>"+$.t("tree.taxaSelTooltip", {count: sdesc}))
            : "")
        ;

        var synCount = model.getSynonymCount (node);
        if (synCount) {
            tooltipStr+="<hr>"+$.t("tree.synTooltip", {count: synCount});
            var synSelCount = model.getSelectedSynonymCount (node);
            if (synSelCount) {
                tooltipStr+="<br>"+$.t("tree.synSelTooltip", {syn: synSelCount});
            }
        }

        var syn = model.getSynonyms(node);
        if (syn) {
            tooltipStr += "<hr><i>"+$.t("tree.synLabel")+"</i>";
            for (n = 0; n < syn.length; n++) {
                var id = model.getIndexedDataPoint(syn[n], ffields[0]);
                var klass = model.getSelectionModel().contains (id) ? "selected" : "";
                tooltipStr += "<br><span class=\""+klass+"\">" + id+"</span>: "+model.getLabel (syn[n]);
            }
        }

        return tooltipStr;
    };

    tree.doExtra = function () {
        var cpanel = d3.select(div+"controls");
        var accPanel = cpanel.select("div"+div+"accordion");

        accPanel.append ("h3")
            .text ($.t("tree.rankLabel"))
        ;
        var section = accPanel.append ("div")
            .attr ("class", "accordSection")
            .attr ("id", div.substring(1)+"controlsRanks")
        ;

        section.append("button")
            .text ($.t("tree.flagKnownRankLabel"))
            .on ("click", function() {
                tree.getModel().getSelectionModel().clear();
                VESPER.Filters.standardRankFilter (tree.getModel());
            })
        ;

        var cboxgroup = VESPER.DWCAHelper.addCheckboxes (section, [{title:$.t("tree.colourRanksLabel")}], null);
        cboxgroup
            .on ("click", function() {
                var index = tree.getModel().makeIndex ("taxonRank");
                var mdata = tree.getModel().getMetaData();
                var rowType = mdata.fileData[index.rowType];
                var fieldData = rowType.fieldData[index.fieldType];
                var discretes = fieldData.discreteTermList;

                //console.log ("rr", rowType, fieldData, discretes);
                tree.colourByRanks (d3.keys(discretes));
            })
        ;

        // re-apply accordion
        $(div+"accordion").accordion ("destroy");
        $(div+"accordion").accordion ({
            heightStyle: "content",
            collapsible: true,
            active: false
        });
    };

    return tree;
};



VESPER.ExplicitTaxonomy = function (div) {
    var tree = new VESPER.Tree (div);
    tree.type = "expTree";

    tree.getRoot = function (mod) {
        return mod.getExplicitRoot();
    };

    tree.containsCount = function (node, model) {
        return (model.getSpecimenCount (node) || 0);
    };

    tree.tooltipString = function (node, model, ffields) {
        console.log ("tooltip node", node);
        var specs = model.getSpecimens(node);
        var tooltipStr = "";
        var limit = 10;

        for (var n = 0; n < ffields.length; n++) {
            if (ffields[n]) {
                tooltipStr += ((n > 0) ? "<br>" : "")+ffields[n].fieldType+": "+model.getIndexedDataPoint (node, ffields[n]);
            }
        }

        var specCount = model.getSpecimenCount(node);
        if (specCount) {
            tooltipStr += "<hr>"+$.t("tree.specTooltip", {count: specCount});
            var SspecCount = model.getSelectedSpecimenCount (node);
            if (SspecCount) {
                tooltipStr += "<br>"+$.t("tree.specSelTooltip", {count: SspecCount});
            }
        }

        // specimens directly attached to node
        if (specs) {
            tooltipStr += "<hr><i>"+$.t("tree.specLabel")+"</i>";
            for (n = 0; n < Math.min(specs.length, limit); n++) {
                var spec = specs[n];
                var id = model.getIndexedDataPoint(spec, ffields[0]);
                var klass = model.getSelectionModel().contains (id) ? "selected" : "";
                tooltipStr += "<br><span class=\""+klass+"\">" + id+"</span>, "+model.getLabel(spec);
            }
            if (specs.length - limit > 0) {
                tooltipStr += "<br>"+$.t("tree.andMore", {count: specs.length - limit});
            }
        }

        return tooltipStr;
    };

    return tree;
};