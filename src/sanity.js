// TimeLine

VESPER.Sanity = function(divid) {

    var model;
    var self = this;
	var thisView;
    var dataChanged = true;

    var allVisComplete, allFieldsComplete, vocabCounts;

	//var exitDur = 400, updateDur = 1000, enterDur = 400;
    var maxBarWidth = 100;


    this.set = function (fields, mmodel) {
        model = mmodel;
        VESPER.log ("sanity model", model);
    };

    this.go = function () {
		thisView = this;
		this.update ();
	};


    var calcVisBasedSanity = function (filter) {
        var tests = [], testOutputs = [];
        var dataModel = model.getData();

        var lists = VESPER.DWCAParser.neccLists;
        for (var list in lists) {
            if (lists.hasOwnProperty(list)) {
                var present = model.makeIndices (lists[list]);
                var nullCount = MGNapier.NapVisLib.countNulls (present);
                if (nullCount === 0) {
                    tests.push (present);
                    testOutputs.push ({"listName": $.t("sanity.visLabels."+list), "all":0, "some":0});
                }
            }
        }

        var oc = 0;
        for (var obj in dataModel) {
            if (dataModel.hasOwnProperty(obj)) {
                if (!filter || filter (model, obj)) {
                    oc++;
                    for (var i = 0; i < tests.length; i++) {
                        var test = tests[i];
                        var some = false, all = true;

                        for (var j = 0; j < test.length; j++) {
                            var val = model.getIndexedDataPoint (dataModel[obj], test[j]);
                            if (val == undefined) {
                                some = true;
                            }
                            else {
                                all = false;
                            }
                        }

                        if (some) { testOutputs[i].some++; }
                        if (all) { testOutputs[i].all++; }
                    }
                }
            }
        }

        return {outputs: testOutputs, dataCount: oc};
    };


    var calcFieldBasedSanity = function (filter) {
        var fdEntries = d3.entries (model.getMetaData().fileData);
        var dataModel = model.getData();

        var results = {};
        for (var n = 0; n < fdEntries.length; n++) {
            var fIndex = fdEntries[n].value.filteredInvFieldIndex;
            var shortName = fdEntries[n].value.mappedRowType;
            results[shortName] = {};
            for (var f = 0; f < fIndex.length; f++) {
                results[shortName][fIndex[f]] = {"recordType":shortName, "name": fIndex[f], "count": 0};
            }
        }

        var activefdEntries = fdEntries.filter(function(k) { return k.value.filteredInvFieldIndex.length > 0; });
        //var c = 0;
        for (var obj in dataModel) {
            if (dataModel.hasOwnProperty(obj)) {
                if (!filter || filter (model, obj)) {
                    for (var n = 0; n < activefdEntries.length; n++) {
                        var fdata = activefdEntries[n].value;
                        var fIndex = fdata.filteredInvFieldIndex;
                        var tdat = model.getRowData (dataModel[obj], fdata.extIndex);
                        if (tdat && fdata.extIndex) {
                            tdat = tdat[0];
                        }
                        var shortName = fdata.mappedRowType;
                        for (var f = 0; f < fIndex.length; f++) {
                            var fName = fIndex[f];
                            if (tdat == undefined || tdat[f] == undefined) {
                                results[shortName][fName].count++;
                            }
                        }
                    }
                }
            }
        }

        var results2 = {};
        for (var rowType in results) {
            if (results.hasOwnProperty (rowType)) {
                var fields = results[rowType];
                for (var fieldType in fields) {
                    if (fields.hasOwnProperty (fieldType)) {
                        results2[rowType+" "+fieldType] = fields[fieldType];
                    }
                }
            }
        }

        return results2;
    };


    var calcControlledVocabFieldRanges = function () {
        var fdEntries = d3.entries (model.getMetaData().fileData);
        var results = {};
        for (var n = 0; n < fdEntries.length; n++) {
            var map = fdEntries[n].value.fieldData; //discreteTermLists;
            for (var field in map) {
                if (map.hasOwnProperty(field)) {
                    var arr = d3.values (map[field].discreteTermList);
                    if (arr.length > 0) {
                        results[field] = {"name": field, "count": arr.length};
                    }
                }
            }
        }

        return results;
    };

    function calcData () {
        allVisComplete = calcVisBasedSanity ();
        allFieldsComplete = calcFieldBasedSanity ();
        vocabCounts = calcControlledVocabFieldRanges ();
        dataChanged = false;
    }


    var selectedFilter = function (model, id) {
        return model.getSelectionModel().contains (id);
    };


	this.update = function () {
        var divSel = d3.select(divid);

        if (dataChanged) {
            calcData();
        }

        var selectedSize = model.getSelectionModel().values().length;
        var selVisComplete = calcVisBasedSanity (selectedFilter);
        var selFieldsComplete = calcFieldBasedSanity (selectedFilter);

        var testOutputs = allVisComplete.outputs;
        var oc = allVisComplete.dataCount;

        // merge static and selected counts
        for (var n = 0; n < testOutputs.length; n++) {
            var testOutput = testOutputs[n];
            var selOutput = selVisComplete.outputs[n];
            testOutput.selSome = selOutput.some;
            testOutput.selAll = selOutput.all;
        }
        for (var obj in allFieldsComplete) {
            if (allFieldsComplete.hasOwnProperty (obj)) {
                var allObj = allFieldsComplete[obj];
                var selObj = selFieldsComplete[obj];
                allObj.selCount = selObj.count;
            }
        }


        var intro = divSel.select("div.sanityHeader");
        if (intro.empty) {
            divSel
                .append ("div")
                .attr ("class", "sanityHeader")
                .append ("p")
            ;
        }

        divSel.select("div.sanityHeader")
            .select("p")
            .text (oc+" Records"+(selectedSize > 0 ? ", "+selectedSize+" Selected" : ""))
        ;

        function createTable (klass, headings, caption, tooltipHeader) {
            var table = divSel.select("table."+klass);
            if (table.empty()) {
                var newTable = divSel
                    .append("table")
                    .attr ("class", klass)
                    .attr ("data-tooltipHeader", tooltipHeader)
                ;

                newTable.append("caption")
                    .attr ("class", "sanityCaption")
                    .text (caption)
                ;

                newTable.append("tr")
                    .selectAll("th").data(headings)
                    .enter()
                    .append("th")
                    .attr ("class", "sanityTableHeading")
                    .text (function(d) { return d;})
                ;
            }
            return divSel.select("table."+klass);
        }

        function eraseTable (klass) {
            var table = divSel.select("table."+klass);
            table.remove();
        }

        function popTable (rows, cellFiller)  {
            rows.exit().remove();

            rows.enter()
                .append ("tr")
                .attr ("class", "sanityRow")
            ;

            rows.each(cellFiller);
        }

        var pcFormat = d3.format (".2%");

        function fillCells (d, i) {
            var arr = [];
            var ordering = [];
            // google chrome doesn't do returning object properties in the order they were added.
            for (var n = 0; n < processors.length; n++) {
                var item = processors[n].name;
                if (d[item] !== undefined) {
                    arr.push ({"key":item, "value":d[item]});
                    ordering.push (item);
                }
            }
            d.ordering = ordering;

            d3.select(this)
                .on ("mouseout", function() { VESPER.tooltip.setToFade(); })
                .on ("mouseover", function(d) {
                    var headers = d3.select(this.parentNode).selectAll("th");
                    var headerText = [];
                    headers.each (function(d) { headerText.push (d); });
                    var str = "";
                    for (var n = 0; n < ordering.length; n++) {
                        str += headerText[n]+": "+d[ordering[n]] + (n < ordering.length - 1 ? "<br>" : "");
                    }
                    var ttheader = d3.select(this.parentNode).attr("data-tooltipHeader");
                    if (!ttheader) { ttheader = $.t("sanity.defaultTooltipHeader"); }
                    VESPER.tooltip.updateText (ttheader, str);
                    VESPER.tooltip.updatePosition (d3.event);
                })
            ;

            var cells = d3.select(this).selectAll("td").data(arr);
            cells.enter().append ("td")
                .attr ("class", function(d,i) { return processors[i] && processors[i].klass ? processors[i].klass : null; })
            ;

            function dstring (d,i) {
                var pcVal = (processors[i].func ? processors[i].func(d.value) : d.value);
                return d.value.toString() + (isNaN(d.value) || pcVal === d.value ? "" : " ("+ pcFormat (pcVal)+ ")") ;
            }


            if (cells.select("div").empty()) {
                cells.append("div")
                    .attr("class", function(d,i) {
                        return (processors[i].func === getSelPC) ? "selected" : "unselected";
                    })
                    .style("height", "10px")
                ;
            }

            cells.select("div")
                .style ("width", function(d,i) {
                    var pcVal = (processors[i].func ? processors[i].func(d.value) : d.value);
                    return isNaN(d.value) ? 0 : Math.min (maxBarWidth, pcVal * maxBarWidth) + "px";
                })
                .style ("display", function(d) { return isNaN(d.value) || d.value == 0 ? "none" : null; })
            ;

            if (cells.select("span.sanityBarText").empty()) {
                cells.append("span").attr("class", "sanityBarText");
            }
            cells.select("span.sanityBarText").text (dstring);
            //cells.attr ("title", dstring);
        }


        function getOrig (val) { return val; }
        function getAllPC (val) { return val / oc; }
        function getSelPC (val) { return selectedSize > 0 ? val / selectedSize : 0; }

        // Check missing data by vis type
        var visSanHeaders = [];
        for (var n = 0; n < 5; n++) {
            visSanHeaders.push ($.t("sanity.visSanHeaders."+n));
        }
        var sTable = createTable ("visSanityTests", visSanHeaders, $.t("sanity.visSanHeaders.tableCaption"), $.t("sanity.visSanHeaders.tooltipHeader"));
        var processors = [{name:"listName", func:getOrig, klass:"showSanityText"}, {name:"some", func:getAllPC, klass:"dontShowSanityText"}, {name:"all", func:getAllPC, klass:"dontShowSanityText"},
                {name:"selSome", func:getSelPC, klass:"dontShowSanityText"}, {name:"selAll", func:getSelPC, klass:"dontShowSanityText"}
        ];
        popTable (sTable.selectAll("tr.sanityRow").data(testOutputs), fillCells);


        // Check missing data by field type
        var fieldSanHeaders = [];
        for (var n = 0; n < 4; n++) {
            fieldSanHeaders.push ($.t("sanity.fieldSanHeaders."+n));
        }
        if (!$.isEmptyObject(allFieldsComplete)) {
            sTable = createTable ("fieldSanityTests", fieldSanHeaders, $.t("sanity.fieldSanHeaders.tableCaption"), $.t("sanity.fieldSanHeaders.tooltipHeader"));
            processors = [{name:"recordType", func:getOrig, klass:"showSanityText"}, {name:"name", func:getOrig, klass:"showSanityText"}, {name:"count", func:getAllPC, klass:"dontShowSanityText"},
                {name:"selCount", func:getSelPC, klass:"dontShowSanityText"}
            ];
            //console.log ("AFC", allFieldsComplete);
            popTable (sTable.selectAll("tr.sanityRow").data(d3.values(allFieldsComplete)), fillCells);
        }

        // Check fields with controlled vocabularies
        var vocabSanHeaders = [];
        for (var n = 0; n < 2; n++) {
            vocabSanHeaders.push ($.t("sanity.vocabSanHeaders."+n));
        }
        if (!$.isEmptyObject(vocabCounts)) {
            sTable = createTable ("vocabSanityTests", vocabSanHeaders, $.t("sanity.vocabSanHeaders.tableCaption"), $.t("sanity.vocabSanHeaders.tooltipHeader"));
            processors = [{name:"name", func:getOrig, klass:"showSanityText"}, {name:"count", func:getOrig, klass:"showSanityText"}];
            popTable (sTable.selectAll("tr.sanityRow").data(d3.values(vocabCounts)), fillCells);
        } else {
            eraseTable ("vocabSanityTests");
        }
	};

    this.updateVals = this.update;

    this.destroy = function () {
        VESPER.DWCAHelper.recurseClearEvents (d3.select(divid));

        model.removeView (self);
        model = null;
        VESPER.DWCAHelper.twiceUpRemove(divid);
    };
};