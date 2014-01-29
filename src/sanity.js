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
                    testOutputs.push ({"listName":list, "all":0, "some":0});
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

        function createTable (klass, headings) {
            var table = divSel.select("table."+klass);
            if (table.empty()) {
                var topRow = divSel
                    .append("table")
                    .attr ("class", klass)
                    .append ("tr")
                ;

                topRow.selectAll("th").data(headings)
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

        function fillCells (d) {
            var arr = [];
            // google chrome doesn't do returning object properties in the order they were added.
            for (var n = 0; n < processors.length; n++) {
                var item = processors[n].name;
                if (d[item] !== undefined) {
                    arr.push ({"key":item, "value":d[item]});
                }
            }

            var cells = d3.select(this).selectAll("td").data(arr);
            cells.enter().append ("td")
                .attr ("class", function(d,i) { return processors[i] && processors[i].klass ? processors[i].klass : null; })
            ;

            function dstring (d,i) {
                var pcVal = (processors[i].func ? processors[i].func(d.value) : d.value);
                return d.value.toString() + (isNaN(d.value) || pcVal === undefined ? "" : " ("+ pcFormat (pcVal)+ ")") ;
            }


            if (cells.select("div").empty()) {
                cells.append("div").attr("class", function(d,i) {
                    var barClass = (processors[i].func === getSelPC) ? "selected" : "unselected";
                    return barClass;
                });
                cells.selectAll("div")
                    .style("height", "10px")
                ;
            }

            cells.select("div")
                .style ("width", function(d,i) {
                    var pcVal = (processors[i].func ? processors[i].func(d.value) : d.value);
                    return isNaN(d.value) ? 0 : Math.min (maxBarWidth, pcVal * maxBarWidth) + "px";
                })
            ;

            if (cells.select("span.sanityBarText").empty()) {
                cells.append("span").attr("class", "sanityBarText");
            }
            cells.select("span.sanityBarText").text (dstring);
            cells.attr ("title", dstring);
        }


        function getOrig () { return undefined; }
        function getAllPC (val) { return val / oc; }
        function getSelPC (val) { return selectedSize > 0 ? val / selectedSize : 0; }

        // Check missing data by vis type
        var sTable = createTable ("visSanityTests", ["Vis Type", "Partial records", "No records", "Partial records (sel)", "No records (sel)"]);
        var processors = [{name:"listName", func:getOrig, klass:"showSanityText"}, {name:"some", func:getAllPC, klass:"dontShowSanityText"}, {name:"all", func:getAllPC, klass:"dontShowSanityText"},
                {name:"selSome", func:getSelPC, klass:"dontShowSanityText"}, {name:"selAll", func:getSelPC, klass:"dontShowSanityText"}
        ];
        popTable (sTable.selectAll("tr.sanityRow").data(testOutputs), fillCells);


        // Check missing data by field type
        if (!$.isEmptyObject(allFieldsComplete)) {
            sTable = createTable ("fieldSanityTests", ["Record Type", "Field Type", "No value", "No value (sel)"]);
            processors = [{name:"recordType", func:getOrig, klass:"showSanityText"}, {name:"name", func:getOrig, klass:"showSanityText"}, {name:"count", func:getAllPC, klass:"dontShowSanityText"},
                {name:"selCount", func:getSelPC, klass:"dontShowSanityText"}
            ];
            popTable (sTable.selectAll("tr.sanityRow").data(d3.values(allFieldsComplete)), fillCells);
        }

        // Check fields with controlled vocabularies
        if (!$.isEmptyObject(vocabCounts)) {
            sTable = createTable ("vocabSanityTests", ["Field Type", "Vocabulary Size"]);
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