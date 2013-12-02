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

    var zoomObj = d3.behavior.zoom();	// zoom object, need to keep as we reference it later. calling d3.behavior.zoom() again gets us a different object/function
    zoomObj.scaleExtent ([1.0, 4.0]); // constrain zooming

    var exitDur = 400, updateDur = 1000, enterDur = 400;
    var keyField, rankField;
    var firstLayout = true;
    var color = d3.scale.category20c();
    var colourScale = d3.scale.linear().domain([0, 1]).range(["#ffcccc", "#ff6666"]);
    var cstore = {};

    var allowedRanks = {"superroot": true, "ROOT": true, "FAM": true, "ORD": true, "ABT": true, "KLA": true, "GAT": true, "SPE": true};
	var sortOptions = {
		"alpha": function (a,b) { var n1 = model.getLabel(a); var n2 = model.getLabel(b);
								return ( n1 < n2 ) ? -1 : ( n1 > n2 ? 1 : 0 );},
		"descendants": function (a,b) { var s1 = model.getDescendantCount(a); var s2 = model.getDescendantCount(b); 
										//VESPER.log (s1,s2);
										if (s1 === undefined && s2 === undefined) {
											var sp1 = model.getSpecimens(a);
											s1 = sp1 ? sp1.length : 0;
											var sp2 = model.getSpecimens(b);
											s2 = sp2 ? sp2.length : 0;
										}
										s1 = s1 || 0;
										s2 = s2 || 0;
										//s1 = s1 || model.getSpecimens(a);
										//s2 = s2 || model.getSpecimens(b);
										//s1 = (s1 === undefined) ? 0 : s1.length;
										//s2 = (s2 === undefined) ? 0 : s2.length;
										return s1 > s2 ? 1 : ((s1 < s2) ? -1 : 0);
		},
        "selected": function (a,b) {
            var sModel = model.getSelectionModel();
            //console.log (a,b);
            var sel1 = sModel.contains(model.getIndexedDataPoint (a,keyField));
            var sel2 = sModel.contains(model.getIndexedDataPoint (b,keyField));
            return (sel1 === sel2) ? 0 :  (sel1 === true ? 1 : -1);
        }
	};

    function tooltipString (node, model) {
        var specs = model.getSpecimens(node);
        var desc = model.getDescendantCount(node);
        var sdesc = model.getSelectedDescendantCount(node);
        var subt = model.getSubTaxa(node);

        return model.getLabel(node)+": "+model.getIndexedDataPoint(node, rankField)
        + (subt === undefined ?
                (specs ? "<br>"+specs.length+" specimens" : "")
                : "<br>"+desc+" descendants")
        + (sdesc > 0 ?
                (subt === undefined ?
                (specs ? "<br>"+sdesc+" selected specimens" : "")
                : "<br>"+sdesc+" selected descendants")
            : "")
        ;
    }

    var spaceAllocationOptions = {
        bottomUp: AdaptedD3.partition3()
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

        topDown: AdaptedD3.topdown()
            .sort (null)
            .value (null)
            .children (function (d) { return model.getSubTaxa(d); })
            .nodeId (function (d) { return model.getIndexedDataPoint (d,keyField); })
           // .filter (function (d) { return allowedRanks[model.getTaxaData(d)[rankField]]; })
    };


    var partitionLayout = {

        cutoffVal: 4,

        sizeBounds: function () {
            return [dims[1], dims[0]];
        },

        sharedAttrs: function (group) {
            group
                .attr ("class", function(d) { var node = getNode (d.id) /*d*/; return model.getSelectionModel().contains(d.id) ? "selected" : (node.sdcount > 0 ? "holdsSelected" : "unselected"); })
                .attr ("y", function (d) { return d.x; })
                .attr ("x", function (d) { return d.y; })
                .attr("width", function (d) { return d.dy; })
                .attr("height", function (d) { return d.dx; })
                //.style("fill", function(d) { var node = getNode (d.id) /*d*/; return model.getSelectionModel().contains(d.id) ? "#ff0000" : (node.sdcount > 0 ? "#ffa080" : null /*"#00ff00"*/); })
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
                .attr ("clip-path", function (d) { var node = getNode (d.id) /*d*/; return rotate(d, this) ? null : "url(#depthclip0)"; /*"url(#depthclip"+node.depth+")";*/})
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
            ;

            newNodes.append ("svg:rect")
                .style ("visibility", function (d) { return d.dx >= partitionLayout.cutoffVal ? "visible": "hidden"; })
                .call (partitionLayout.sharedAttrs)
                .call (mouseController)
                //.append("svg:title")
               // .text(function(d) {
                //    return tooltipString (getNode (d.id), model);
               // })
            ;

            newNodes.append ("svg:text")
                .text (function(d) { var node = getNode (d.id) /*d*/; return model.getLabel(node); })
                .style ("visibility", function (d) { return d.dx > 15 && d.dy > 15 ? "visible": "hidden"; })
                .call (partitionLayout.sharedTextAttrs)
                //.attr ("clip-path", function (d) { var node = getNode (d.id) /*d*/; return "url(#depthclip"+node.depth+")"; })
            ;

            return newNodes;
        },

        redrawExistingNodes: function (group, delay) {
            group.select("rect")
                .style ("visibility", function (d) { return d.dx >= partitionLayout.cutoffVal ? "visible": "hidden"; })
                .transition()
                .delay (delay)
                .duration (updateDur)
                .call (partitionLayout.sharedAttrs)
            ;

            group.select("text")
                .style ("visibility", function (d) { return d.dx > 15 && d.dy > 15 ? "visible": "hidden"; })
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
                .attr ("id", function(d) { return "depthclip"+d.depth; })
                .append ("rect")
                .call (sharedClipAttrs)
            ;
        }
    };




    var π = Math.PI, ε = 1e-6;
    d3.svg.parc = function() {
        var innerRadius = d3_svg_arcInnerRadius, outerRadius = d3_svg_arcOuterRadius, startAngle = d3_svg_arcStartAngle, endAngle = d3_svg_arcEndAngle;
        function arc() {
            VESPER.log ("this", this);
            var r1 = outerRadius.apply(this, arguments), a0 = startAngle.apply(this, arguments) + d3_svg_arcOffset, a1 = endAngle.apply(this, arguments) + d3_svg_arcOffset, da = (a1 < a0 && (da = a0,
                a0 = a1, a1 = da), a1 - a0), df = da < π ? "0" : "1", c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
            return da >= d3_svg_arcMax
                ? ("M0," + r1 + "A" + r1 + "," + r1 + " 0 1,1 0," + -r1 + "A" + r1 + "," + r1 + " 0 1,1 0," + r1)
                : ("M" + r1 * c0 + "," + r1 * s0 + "A" + r1 + "," + r1 + " 0 " + df + ",1 " + r1 * c1 + "," + r1 * s1)
                ;
        }
        arc.innerRadius = function(v) {
            if (!arguments.length) return innerRadius;
            innerRadius = d3.functor(v);
            return arc;
        };
        arc.outerRadius = function(v) {
            if (!arguments.length) return outerRadius;
            outerRadius = d3.functor(v);
            return arc;
        };
        arc.startAngle = function(v) {
            if (!arguments.length) return startAngle;
            startAngle = d3.functor(v);
            return arc;
        };
        arc.endAngle = function(v) {
            if (!arguments.length) return endAngle;
            endAngle = d3.functor(v);
            return arc;
        };
        arc.centroid = function() {
            var r = (innerRadius.apply(this, arguments) + outerRadius.apply(this, arguments)) / 2, a = (startAngle.apply(this, arguments) + endAngle.apply(this, arguments)) / 2 + d3_svg_arcOffset;
            return [ Math.cos(a) * r, Math.sin(a) * r ];
        };
        return arc;
    };
    var d3_svg_arcOffset = -π / 2, d3_svg_arcMax = 2 * π - 1e-6;
    function d3_svg_arcInnerRadius(d) {
        return d.innerRadius;
    }
    function d3_svg_arcOuterRadius(d) {
        return d.outerRadius;
    }
    function d3_svg_arcStartAngle(d) {
        return d.startAngle;
    }
    function d3_svg_arcEndAngle(d) {
        return d.endAngle;
    }

    var sunburstLayout = {

        cutoffVal: 0.05,

        sizeBounds: function () {
            var radius = d3.min(dims) / 2;
            VESPER.log ("DIMS", dims, radius);
            return [2 * Math.PI, radius * radius];
        },

        sharedAttrs: function (group) {
            group
                //.style ("fill", function(d) { var node = getNode (d.id); var s = model.getSelectionModel().contains(d.id); var p = (node.sdcount || 0) / (node.dcount || 1); return (p && !s) ? colourScale (p) : null; })
                .attr ("class", function(d) { if (d.id == undefined) { var node = getNode (d.id) /*d*/; return "fatarc "+ (model.getSelectionModel().contains(d.id) ? "selected" : (node.sdcount > 0 ? "holdsSelected" : "unselected")); })
            ;
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
                //.attr ("clip-path", function (d) { var node = getNode (d.id) /*d*/; return rotate(d, this) ? null : "url(#depthclip0)"; /*"url(#depthclip"+node.depth+")";*/})
            ;
        },



        arc: d3.svg.arc()
            .startAngle(function(d) { return d.x; })
            .endAngle(function(d) { return d.x + d.dx; })
            .innerRadius(function(d) { return Math.sqrt(d.y); })
            .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); })
        ,

        parc: d3.svg.parc()
            .startAngle(function(d) { return d.x; })
            .endAngle(function(d) { return d.x + d.dx; })
            .innerRadius(function(d) { return Math.sqrt(d.y); })
            .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); })
        ,


        // Stash the old values for transition.
        stash: function (d) {
            cstore[d.id] = {x0: d.x, dx0: d.dx, y0: d.y, dy0: d.dy};
        },

        // Interpolate the arcs in data space.
        arcTween: function (a) {
            //VESPER.log ("a", a, a.dx0);
            var cs = cstore [a.id];
            var i = d3.interpolate({x: cs.x0, dx: cs.dx0, y: cs.y0, dy: cs.dy0}, a);
            return function(t) {
                var b = i(t);
                cs.x0 = b.x;
                cs.dx0 = b.dx;
                cs.y0 = b.y;
                cs.dy0 = b.dy;
                return sunburstLayout.arc(b);
            };
        },

        prep: function (coordSet) {
            treeG.attr("transform", "translate(" + dims[0] / 2 + "," + dims[1] * .52 + ")");
           // partitionLayout.makeTextClips (coordSet);
        },

        removeOld: function (exitSel) {
            clearMouseController (exitSel);
            exitSel
                .each (function() {
                    var id = d3.select(this).datum().id;
                    cstore[id] = undefined;
                })
            ;
            NapVisLib.d3fadeAndRemoveGroups ([exitSel], exitDur, 0);
        },

        makeNew: function (enterSel) {

            var newNodes = enterSel
                .append ("svg:g")
                .attr("class", "treeNode")
                .style("opacity", 0)
            ;

            /*
            var tegs = newNodes
                    .append("path")
                    //.attr("display", function(d) { var node = getNode (d.id); return node.depth ? null : "none"; }) // hide inner ring
                    .attr("d", sunburstLayout.parc)
                    .attr ("id", function(d) { return "tarc"+ d.id; })
                    .style ("visibility", "hidden")
                    //.each(sunburstLayout.stash)
                ;
            */
            var newSegs = newNodes
                .append("path")
                //.attr("display", function(d) { var node = getNode (d.id); return node.depth ? null : "none"; }) // hide inner ring
                .attr("d", sunburstLayout.arc)
                .attr ("id", function(d) { return "arc"+ d.id; })
                //.style("fill", function(d) { var node = getNode (d.id); return color(model.getTaxaData(model.getSubTaxa(node) ? node : node.parent)[rankField]); })
                .call (sunburstLayout.sharedAttrs)
                .call (mouseController)
                .each(sunburstLayout.stash)
            ;

            /*
            newNodes.append ("svg:text")
                //.text (function(d) { return model.getLabel(node); })
                //.attr ("text-anchor", "middle")
                .style ("visibility", function (d) { return d.dx > 1 ? "visible": "collapse"; })
                //.call (sunburstLayout.sharedTextAttrs)
                .append ("svg:textPath")
                    .attr ("startOffset", "0%")
                    .attr ("spacing", "auto")
                    .attr ("xlink:href", function(d) { return "#tarc"+ d.id; })
                    //.attr("dy","1em")
                    .append ("svg:tspan")
                        .attr ("dy", "1em")
                        //.attr ("text-anchor", "middle")
                        .text (function(d) { var node = getNode (d.id); return model.getLabel(node); })

                //.attr ("clip-path", function (d) { var node = getNode (d.id); return "url(#depthclip"+node.depth+")"; })
            ;
            */
            //newSegs
            //    .append("svg:title")
            //    .text(function(d) {
            //        return tooltipString (getNode (d.id), model);
            //    })
           // ;

            return newNodes;
        },

        redrawExistingNodes: function (group, delay) {
           group
               .select("path.fatarc")
               .call (sunburstLayout.sharedAttrs)
                .transition()
                .delay (delay)
                .duration(updateDur)
                .attrTween("d", sunburstLayout.arcTween)
                //.style("fill", function(d) { var node = getNode (d.id) /*d*/; return model.getSelectionModel().contains(d.id) ? "#ff0000" :
                 //   (node.sdcount > 0 ? "#ffa080" : color(model.getTaxaData(model.getSubTaxa(node) ? node : node.parent)[rankField])); })
                .each ("end", sunburstLayout.stash)
            ;

            group.select("text")
                .style ("visibility", function (d) { return d.dx > 1 ? "visible": "collapse"; })
                //.attr ("clip-path", function (d) { var node = getNode (d.id) /*d*/; return "url(#depthclip"+node.depth+")"; })
                //.transition()
                //.delay (delay)
                //.duration (updateDur)
                //.call (sunburstLayout.sharedTextAttrs)
            ;
        }
    };

    var layoutOptions = {icicle: partitionLayout, sunburst: sunburstLayout};

    this.set = function (fields, mmodel) {
        VESPER.log ("set args", arguments, d3.select(divid).node());
        var ffields = mmodel.makeIndices ([fields.identifyingField, fields.rankField]);
        keyField = ffields[0];
        rankField = ffields[1];
        dims = NapVisLib.getWidthHeight (d3.select(divid).node());
        model = mmodel;
    };

	
	this.go = function () {
		thisView = this;
		
		svg = d3.select(divid)
			.append("svg:svg")
			.attr("class", "visContainer")
			.attr("pointer-events", "all")
		;
		
		svg.append ("defs");
		
		treeG = svg
			.append ("svg:g")
			.attr("class", "treeSVG")
		;

        var vals = model.getSelectionModel().values();
        var root = (vals.length == 1) ? getNode(vals[0]) : model.getRoot();
        if (root === undefined) {
            VESPER.log ("no root defined for tree");
            return;
        }

        absRoot = root;

        var spaceAllocs = d3.values(spaceAllocationOptions);
        for (var n = 0; n < spaceAllocs.length; n++) {
            var indAlloc = spaceAllocs[n];
            //indAlloc.size ([dims[1], dims[0]]);
            //indAlloc.size (partitionLayout.sizeBounds());
        }
        spaceAlloc = spaceAllocationOptions.bottomUp;
		curSort = sortOptions.alpha;
        layout = layoutOptions.sunburst;

		//depthCharge (root);
        setupControls ();

        //$('[title!=""]').qtip();
		
		this.update ();
	};



    function setupControls () {
        var noHashId = divid.substring (1);
        var cpanel = d3.select(divid)
            .append("span")
            .attr ("class", "visControl")
            .attr ("id", noHashId+"controls")
        ;

        cpanel.append("p").html("Space Allocation");
        var allocBinds = cpanel.selectAll("button.allocChoice")
            .data(d3.entries (spaceAllocationOptions), function(d) { return d.key; });
        var aHolders = allocBinds.enter()
            .append ("span")
            .attr ("class", "fieldGroup")
        ;
        aHolders.append("input")
            .attr ("class", "allocChoice")
            .attr ("type", "radio")
            .attr ("id", function(d) { return noHashId+ d.key; })
            .attr ("name", function(d) { return noHashId+"alloc"; })
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
            .attr ("for", function(d) { return noHashId+ d.key; })
            .html (function(d) { return d.key; })
        ;

        cpanel.append("p").html("Layout Style");
        var layoutBinds = cpanel.selectAll("button.layoutChoice")
            .data(d3.entries (layoutOptions), function(d) { return d.key; });
        var lHolders = layoutBinds.enter()
            .append ("span")
            .attr ("class", "fieldGroup")
        ;
        lHolders.append ("input")
            .attr ("class", "layoutChoice")
            .attr ("type", "radio")
            .attr ("id", function(d) { return noHashId+ d.key; })
            .attr ("name", function(d) { return noHashId+"layout"; })
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
            .attr("for", function(d) { return noHashId+ d.key; })
            .html (function(d) { return d.key; })
        ;
		
		cpanel.append("p").html("Sort");
        var sortBinds = cpanel.selectAll("button.sortChoice")
            .data(d3.entries (sortOptions), function(d) { return d.key; });
        var sHolders = sortBinds.enter()
            .append ("span")
            .attr ("class", "fieldGroup")
        ;
        sHolders.append ("input")
            .attr ("class", "sortChoice")
            .attr ("type", "radio")
            .attr ("id", function(d) { return noHashId+ d.key; })
            .attr ("name", function(d) { return noHashId+"sort"; })
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
            .attr("for", function(d) { return noHashId+ d.key; })
            .html (function(d) { return d.key; })
        ;

        $(function() {
            $("#"+noHashId+"controls").draggable();
        });
    }


	function getNode (id) {
        return model.getNodeFromID (id);
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
        VESPER.log (newNodes);
        NapVisLib.d3fadeInNewGroups ([newNodes], enterDur, cumDelay);
    }


	this.update = function () {
        var vals = model.getSelectionModel().values();
        var root = (vals.length == 1) ? getNode(vals[0]) : model.getRoot();
        VESPER.log ("Root", root, vals[0]);

        model.countSelectedDesc (root, keyField);
        //VESPER.DWCAParser.countSelectedDesc (root, model.getSelectionModel(), keyField);
        reroot (root);
	};

    this.updateVals = this.update;


    this.redraw = function () {
        var nodes = treeG.selectAll(".treeNode");
        layout.redrawExistingNodes (nodes, 0);
    };


    this.destroy = function () {
        clearMouseController (treeG.selectAll(".treeNode"));
        treeG.selectAll(".treeNode").remove();
        model.removeView (self);
        model = null;
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
        group.on("click", function (d) {
            var node = getNode (d.id) /*d*/;
            reroot ((node == curRoot && node.parent != undefined) ? node.parent : node);
        })
        .on("mouseover", function(d) {
            d3.select(this).classed("highlight", true);
            //handle mouse over
            var node = getNode (d.id) /*d*/;
            var val = tooltipString (node, model);
            VESPER.tooltip.updateText (model.getLabel(node), val);
            VESPER.tooltip.updatePosition (d3.event);
        })
        .on ("mouseout", function(d) {
            d3.select(this).classed("highlight", false);
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