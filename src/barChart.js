// TimeLine

VESPER.BarChart = function(divid) {
	
	var svg;	// top level svg
	var timelineG; // matrix rectangle (i.e. not the axes)
    var xaxis = d3.svg.axis();
	
	var dims;

    this.format = undefined;
    this.barClass = "countBin";
    this.childScale = d3.scale.linear();
    var logCountScale = d3.scale.log();
    var linearCountScale = d3.scale.linear();
    var currentCountScale = logCountScale;

    var domainLimits = [undefined, undefined];
    var binned, selBinned;
	
	var self;
    var model;

	var zoomObj = d3.behavior.zoom();	// zoom object, need to keep as we reference it later. calling d3.behavior.zoom() again gets us a different object/function
	zoomObj.scaleExtent ([1.0, 4.0]); // constrain zooming


	var exitDur = 400, updateDur = 1000, enterDur = 400;
	var selected = {};
	
	var ffields = {};

    var firstLayout = true;

    var margin = {left: 40, right: 20, top : 15, bottom: 40};

    this.minBarWidth = 5;
    this.toNearest = 1;
    this.divisions = [1, 2, 10, 100];

    var sharedAttrs = function (group) {
        var wh = dims[1] - margin.bottom;
        group
            .attr("x", function(d) { return self.childScale (d.start); })
            .attr("width", function (d) { return self.childScale (d.end) -  self.childScale (d.start); })
            .attr ("y", function(d) { return currentCountScale (d.count + 1); })
            .attr ("height", function(d) { return wh - currentCountScale (d.count + 1); })
            .style ("opacity", 1)
        ;
    };


    this.set = function (fields, mmodel) {
        ffields.keyField = mmodel.makeIndices ([fields.identifyingField])[0];
        ffields.dateField = mmodel.makeIndices ([fields.dateField])[0];
        ffields.realField = mmodel.makeIndices ([fields.realField])[0];
        dims = NapVisLib.getWidthHeight (d3.select(divid).node());
        model = mmodel;
    };


    this.go = function () {
		self = this;
		
		var svg = d3.select(divid).selectAll("svg").data([0]);

        svg.enter()
			.append("svg:svg")
			.attr("class", "visContainer")
			.attr("pointer-events", "all")
		;

        svg = d3.select(divid).select("svg");
		
		timelineG = svg
			.append ("svg:g")
			.attr("class", "treeSVG")
		;

        var controls = d3.select(divid).select(".barChartControl");
        var noHashId = divid.substring (1);
        if (controls.empty()) {
            var butdiv = d3.select(divid).append("span")
                .attr("class", "visControl")
                .attr("id", noHashId+"Controls")
            ;

            var choices = {regular: self.uncalcCumulative, cumulative: self.calcCumulative};
            var spans = butdiv.selectAll("span.fieldGroup")
                .data (d3.entries(choices), function(d) { return d.key;})
            ;

            spans.enter()
                .append("span")
                .attr ("class", "fieldGroup")
            ;

            // spans now has the entered spans
            spans.append("input")
                .attr("type", "radio")
                .attr("id", function(d) { return noHashId+ d.key; })
                .attr("name", "chartYType")
                .property ("checked", function(d) { return d.key == "regular"; })
                .on ("change", function(d) {
                    var barDataSets = [binned.bins, selBinned.bins];
                    var barDataTypes = ["unselected", "selected"];
                    for (var k = 0; k < barDataSets.length; k++) {
                        (d.value)(barDataSets[k]);
                        self.redraw (timelineG.selectAll("."+self.barClass+"."+barDataTypes[k])
                            .data(barDataSets[k], function(d) { return Math.floor (d.start); }),
                            barDataSets[k]
                        );
                    }
                })
            ;
            spans.append("label")
                .attr("for", noHashId+"count")
                .text (function(d) { return d.key; })
            ;

            $(function() {
                $( divid+"Controls" ).buttonset();
            });

            $(function() {
                $( divid+"Controls" ).draggable();
            });

        }

        self.childScale.range([margin.left, dims[0] - margin.right]);
        makeBins();


        var rangeg = svg.select("g.rangeHolder");
        if (rangeg.empty()) {
            svg.append ("g")
                .attr ("class", "rangeHolder")
                .attr ("transform", "translate(0,"+(dims[1] - 20)+")")
            ;
        }
        rangeg = svg.select("g.rangeHolder");

        var rangeSlider = NapVisLib.rangeSlider();
        rangeSlider(rangeg);
        rangeSlider
            .scale(self.childScale)
            .dragEndFunc (function (r, rscale) {
                domainLimits = [
                    self.wrapDataType (makeToNearest (rscale.invert (r[0]))),
                    self.wrapDataType (makeToNearest (rscale.invert (r[1])))
                ];
                makeBins();
                self.update();
            })
            .tooltipTemplates ({
                "min": function (r,s) { return "min: "+self.wrapDataType (makeToNearest (s.invert (r[0]))) },
                "max": function (r,s) { return "min: "+self.wrapDataType (makeToNearest (s.invert (r[1]))) },
                "bar": function (r,s) { return null; }
            })
            .update()
        ;

		self.update ();
	};

    function makeBins () {
        //var binCount = Math.ceil ((self.childScale.range()[1] - self.childScale.range()[0]) / self.minBarWidth);
        binned = self.chunkInfo (model, model.getData(), ffields/*, undefined, binCount, true*/);
        self.childScale.domain (binned.extremes);
        VESPER.log ("bin stuff", binned.extremes, binned);
    }

	function getNode (id) {
        return model.getNodeFromId (id);
    }


    function makeToNearest (val) {
        return Math.round (val / self.toNearest) * self.toNearest;
    }

    function makeToNearestInterval (val) {
        return Math.round (val / self.toNearest) * self.toNearest;
    }


	this.update = function () {

        selBinned = self.chunkInfo (model, model.getData(), ffields, /*undefined, binned.bins.length - 1, true,*/
            function (key, data) { return model.getSelectionModel().contains (key)});

        var bins = binned.bins;
        VESPER.log ("SEL BINS", selBinned);
        var maxh = d3.max(bins, function(d) { return d.count + 1; });
        VESPER.log ("maxh", maxh);
        var wh = dims[1] - margin.bottom;
        currentCountScale.domain([1, maxh]).range ([wh, margin.top]).nice();

        var exists = timelineG.select("g.valueAxis");
        if (exists.empty()) {
            exists = timelineG.append("g")
                .attr("class", "valueAxis vesperAxis")
                .attr ("transform", "translate (0,"+(dims[1]-margin.bottom)+")")
            ;
        }
        exists.call(d3.svg.axis()
            .scale(self.childScale)
            .orient("bottom")
            .tickFormat (self.format)
        );

        var barDataSets = [bins, selBinned.bins];
        var barDataTypes = ["unselected", "selected"];
        for (var k = 0; k < barDataSets.length; k++) {
            VESPER.log ("bins", barDataSets[k]);
            var barClass = self.barClass;// + barDataTypes[k];
            var visBins = timelineG.selectAll("."+barClass+"."+barDataTypes[k]).data(barDataSets[k], function(d) { return Math.floor (d.start); });

            visBins.exit()
                .on ("click", null)
                .on ("mouseout", null)
                .on ("mouseover", null)
                .on ("contextmenu", null)
                //.select("title")
               //     .text ("")
            ;
            visBins.exit().remove();

            self.redraw (visBins, barDataSets[k]); // redraw current selection (i.e. ones that aren't exiting/ yet to enter)
            var delay = visBins.empty() ? 0 : 500;

            visBins.enter()
                .append("svg:rect")
                .attr("class", barClass+" "+barDataTypes[k])
                .style ("opacity", 0)
                .on ("click", function(d) {
                })
                .on("contextmenu", function(d) {
                    //handle right click
                    model.getSelectionModel().clear();
                    var arr = self.returnMatches (model, ffields, d.start, d.end);
                    model.getSelectionModel().addAllToMap (arr);
                    //stop showing browser menu
                    d3.event.preventDefault();
                })
                .on ("mouseover", function(d) {
                    d3.select(this).classed("highlight", true);
                    var selected = d3.select(this).classed("selected");
                    VESPER.tooltip.updateText(selected ? "Selected" : "All", self.makeTitle (d));
                    VESPER.tooltip.updatePosition (d3.event);
                })
                .on ("mouseout", function(d) {
                    d3.select(this).classed("highlight", false);
                    VESPER.tooltip.setToFade();
                })
                .transition()
                .delay (delay)
                .duration(500)
                .call(sharedAttrs)
                //.append ("svg:title")
            ;
        }
	};


    this.redraw = function (currentDataSelection, barData) {
        var maxh = d3.max(barData, function(d) { return d.count + 1; });
        var wh = dims[1] - margin.bottom;
        currentCountScale/*.domain([1, maxh])*/.range ([wh, margin.top]).nice();
        var exists2 = timelineG.select("g.countAxis");
        if (exists2.empty()) {
            exists2 = timelineG.append("g")
                .attr("class", "countAxis vesperAxis")
                .attr ("transform", "translate ("+(margin.left-1)+",0)")
            ;
        }
        exists2.call(xaxis
            .scale(currentCountScale)
            .orient("left")
            .ticks (5, d3.format(",d"))
        );

        currentDataSelection
            .transition()
            .duration(500)
            .call(sharedAttrs)
        ;
    };

    this.makeTitle = function (d) {};

    this.updateVals = this.update;

    this.chunkInfo = function (model, data, fields, /*binSize, binCount, round,*/ includeFunc) {
        var chart = self;
        var min = domainLimits[0];
        var max = domainLimits[1];
        var hardMin = (min !== undefined);
        var hardMax = (max !== undefined);
        //VESPER.log ("fmm", min, max, hardMin, hardMax);
        var bins = [];
        var count = 0, mint, maxt;

        function findMinMax () {
            if (!hardMin || !hardMax) {
                for (var key in data) {
                    if (data.hasOwnProperty (key) /*&& (!includeFunc || includeFunc (key, data))*/) {
                        var val = chart.getVal (model, data, key, fields);
                        if (val !== undefined) {
                            val = chart.wrapDataType (val, key);
                            var uval = chart.unwrapDataType (val);
                            count++;

                            if (!hardMin && (min === undefined || mint > uval)) {
                                min = val;
                                mint = chart.unwrapDataType (min);
                            }
                            if (!hardMax && (max === undefined || maxt < uval)) {
                                max = val;
                                maxt = chart.unwrapDataType (max);
                            }
                        }
                    }
                }
            }
        }
        findMinMax();
        //VESPER.log ("Counted "+count+" properties.");
        //VESPER.log ("data", data[0], data[1], data[2]);

        if (min !== undefined && max !== undefined) {
            var mind = chart.unwrapDataType (min); //min.getTime() / this.msinaday;
            var maxd = chart.unwrapDataType (max); //max.getTime() / this.msinaday;
            var domRange = (Math.ceil (maxd / self.toNearest) * self.toNearest) - (Math.floor (mind / self.toNearest) * self.toNearest);
            VESPER.log ("MINS", maxd, mind, min, max, domRange, self.childScale.range());

            var newBarVals = chart.makeBarSizes (self.childScale.range()[1] - self.childScale.range()[0], domRange);
            var binSize = newBarVals.newBinSize;
            var binCount = newBarVals.newBinCount;
            VESPER.log ("bb", binSize, binCount);
            var fmind = Math.floor (mind / binSize) * binSize;

            for (var n = 0; n < binCount + 1; n++) {
                var size = fmind + (binSize * n);
                bins[n] = {count:0, start: chart.wrapDataType (Math.max (size, mind)), end: chart.wrapDataType (Math.min (size + binSize, maxd + binSize))};
            }

            function assignDataToBin () {
                var t = 0;
                for (var key in data) {
                    if (data.hasOwnProperty (key)) {
                        if (!includeFunc || includeFunc (key, data)) {   // only add the data if it's to be included according to includeFunc (if includeFunc exists)
                            var val = chart.getVal (model, data, key, fields);
                            if (val !== undefined) {
                                val = chart.unwrapDataType (chart.wrapDataType (val, key));
                                if (!isNaN(val) && val >= mind) {
                                    var bi = Math.floor ((val - fmind) / binSize); // this means items are binned as start <= item < end for each bin (so end is that start of the next bin)
                                    if (0 <= bi && bi <= binCount) {
                                        bins[bi].count++;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            assignDataToBin ();
        }

        return {extremes:[min,max],bins:bins};
    };


    this.returnMatches = function (model, fields, min, max) {
        var arr = [];
        var data = model.getData();

        for (var key in data) {
            if (data.hasOwnProperty (key)) {
                var val = self.getVal (model, data, key, fields);
                if (val !== undefined) {
                    val = self.wrapDataType (val, key);
                    if (min <= val && val < max) {
                        arr.push (key);
                    }
                }
            }
        }
        VESPER.log ("Arr", min, max, arr);
        return arr;
    };

    this.calcCumulative = function (bins) {
        VESPER.log ("Bins", bins);
          var sofar = 0;
          for (var n = 0; n < bins.length; n++) {
              var add = bins[n].count;
              bins[n].count += sofar;
              sofar += add;
          }
    };


    this.makeBarSizes = function (width, range) {
        var barDomainWidth = (range / width) * self.minBarWidth;
        var binSize;
        for (var n = 0; n < self.divisions.length; n++) {
            if (self.divisions[n] > barDomainWidth || n === self.divisions.length - 1) {
                binSize = self.divisions[n];
                break;
            }
        }

        VESPER.log ("bdw: ", barDomainWidth, range, width);

        var binCount = Math.ceil (range / binSize);
        return {newBinSize: binSize, newBinCount: binCount};
    };


    this.uncalcCumulative = function (bins) {
        var last = 0;
        for (var n = 0; n < bins.length; n++) {
            var sub = bins[n].count;
            bins[n].count -= last;
            last = sub;
        }
    };

    this.baseDestroy = function () {
        DWCAHelper.recurseClearEvents (d3.select(divid));

        var visBins = timelineG.selectAll(self.barClass);
        visBins.remove();

        model.removeView (self);
        model = null;
        DWCAHelper.twiceUpRemove(divid);
    };

    this.destroy = function () {
        this.baseDestroy ();
    }
};


VESPER.TaxaDistribution = function (div) {
    var chart = new VESPER.BarChart (div);
    chart.makeTitle = function (d) {
        var singleVal = ((d.end - d.start) == 1);
        return "Subtaxa: "+d.start+(singleVal ? "" : " to "+(d.end - 1))+"<br>Count: "+d.count;
    };
    chart.wrapDataType = function (d) { return d; };
    chart.unwrapDataType = function (o) { return o; };
    chart.getVal = function (model, data, key, fields) {
        var keyID = model.getIndexedDataPoint (data[key], fields.keyField);
        var realID = model.getIndexedDataPoint (data[key], fields.realField);
        if (realID == keyID || realID == undefined) { // don't count synonyms
            var node = model.getNodeFromID(key);
            var subTaxa = model.getSubTaxa(node);
            //var pid = model.getDataPoint (node, {fieldType:"parentNameUsageID", rowType:model.getMetaData().coreRowType});
            return (subTaxa ? subTaxa.length : 0);
        }
        return undefined;
    };
    chart.divisions = [1,2,10];

    return chart;
};



VESPER.TimeLine = function (div) {
    var chart = new VESPER.BarChart (div);
    var timeCache = {};
    chart.childScale = d3.time.scale();
    chart.barClass = "timeBin";
    chart.format = d3.time.format ("Y%Y"); // d3.time.format.iso;
    chart.makeTitle = function (d) {return d.start.toString()+"<br>to "+ d.end.toString()+"<br>Records: "+d.count; };
    chart.wrapDataType = function (d, key) {
        var val = (key === undefined ? undefined : timeCache[key]);
        return (val === undefined ? new Date (d) : val);
    };
    chart.unwrapDataType = function (date) { return date.getTime(); };
    chart.getVal = function (model, data, key, fields) {
        var val = model.getIndexedDataPoint(data[key], fields.dateField);
        if (!timeCache[key] && val !== undefined) {
            timeCache[key] = new Date (val);
        }
        return val;
    };
    chart.destroy = function () {
        chart.baseDestroy ();
        timeCache = {};     // clear time cache
    };
    var oneDayInMs = 24 * 60 * 60 * 1000;
    chart.toNearest = oneDayInMs * 7; // to nearest week
    // approx divisions for one day, week, season, year, decade. Not exactly aligned fanks to leap years.
    chart.divisions = [oneDayInMs, oneDayInMs * 7, oneDayInMs * 91.3125, oneDayInMs * 365.25, oneDayInMs * 365.25 * 10];

    return chart;
};
