// TimeLine

VESPER.Sanity = function(divid) {

    var model;
    var self = this;
	var thisView;

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


    var calcVisBasedSanity = function () {
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
                oc++;
                for (var i = 0; i < tests.length; i++) {
                    var test = tests[i];
                    var some = false, all = true;

                    for (var j = 0; j < test.length; j++) {
                        var val = model.getIndexedDataPoint (dataModel[obj], test[j]);
                        if (val === undefined || val === null) {
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

        return {outputs: testOutputs, dataCount: oc};
    };


    var calcFieldBasedSanity = function () {
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
                for (var n = 0; n < activefdEntries.length; n++) {
                    var fdata = activefdEntries[n].value;
                    var fIndex = fdata.filteredInvFieldIndex;

                    //if (fIndex.length > 0) {
                    //if (tdat) {
                        var tdat = model.getRowData (dataModel[obj], fdata.extIndex);
                        if (tdat && fdata.extIndex) {
                            tdat = tdat[0];
                        }
                        var shortName = fdata.mappedRowType;
                        //c++;
                        //if (c < 100) {
                        //    console.log ("t", tdat, fIndex.length);
                        //}
                        for (var f = 0; f < fIndex.length; f++) {
                            var fName = fIndex[f];
                            if (tdat == undefined || tdat[f] == undefined || tdat[f] == null) {
                                results[shortName][fName].count++;
                            }
                        }
                    //}
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


	this.update = function () {
        var divSel = d3.select(divid);
        var result = calcVisBasedSanity ();
        var result2 = calcFieldBasedSanity ();
        var result3 = calcControlledVocabFieldRanges ();
        var testOutputs = result.outputs;
        var oc = result.dataCount;
        var cellOrder, cellClasses;

        var intro = divSel.select("div.visHeader");
        if (intro.empty) {
            d3.select(divid)
                .append ("div")
                .attr ("class", "visHeader")
                .append ("p")
            ;
        }

        divSel.select("div.visHeader")
            .select("p")
            .text (oc+" Records")
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
        }

        function eraseTable (klass) {
            var table = divSel.select("table."+klass);
            table.remove();
        }

        function popTable (rows, calcData, newCellOrder, cellFiller, newCellClasses)  {
            rows.exit().remove();

            rows.enter()
                .append ("tr")
                .attr ("class", "sanityRow")
            ;

            //VESPER.log ("rows", rows, rows.enter());

            cellOrder = newCellOrder;
            cellClasses = newCellClasses;
            rows.each(calcData).each(cellFiller);
        }

        var pcFormat = d3.format (".2%");
        var formats = [];

        function fillCells (d) {
            var arr = [];
            // google chrome doesn't do returning object properties in the order they were added.
            if (cellOrder) {
                for (var n = 0; n < cellOrder.length; n++) {
                    var item = cellOrder[n];
                    if (d[item] !== undefined) {
                        arr.push ({"key":item, "value":d[item]});
                    }
                }
            } else {
                arr = d3.entries(d);
            }

            var cells = d3.select(this).selectAll("td").data(arr);
            cells.enter().append ("td")
                .attr ("class", function(d,i) { return cellClasses && cellClasses[i] ? cellClasses[i] : null; })
            ;

            function dstring (d,i) {
                return (formats[i] ? formats[i](d.value) : d.value.toString())
                    + (isNaN(d.value) ? "" : " ("+ pcFormat (d.value / oc)+ ")")
                ;
            }

            if (cells.select("img").empty()) {
                cells.append("img").attr("class", "sanityBarFail").attr("src", VESPER.imgbase+"blackpixel.gif");
                cells.append("img").attr("class", "sanityBarOK").attr ("src", VESPER.imgbase+"whitepixel.gif");
                cells.selectAll("img")
                    .attr("height", 10)
                ;
            }
            cells.select("img.sanityBarFail")
                .attr ("width", function(d) { return isNaN(d.value) ? 0 : Math.min (maxBarWidth, (d.value / oc) * maxBarWidth); })
            ;
            cells.select("img.sanityBarOK")
                .attr ("width", function(d) { return isNaN(d.value) ? 0 : Math.min (maxBarWidth, maxBarWidth - ((d.value / oc) * maxBarWidth)); })
            ;

            if (cells.select("span").empty()) {
                cells.append("span");
            }
            cells.select("span").text (dstring);
            cells.attr ("title", dstring);
        }


        // Check missing data by vis type
        createTable ("visSanityTests", ["Vis Type", "Some fields missing", "All fields missing"]);
        var rows = divSel.select("table.visSanityTests").selectAll("tr.sanityRow")
            .data(testOutputs)
        ;
        function getPC () {}
        formats.length = 0; formats[3] = pcFormat; formats[4] = pcFormat;
        popTable (rows, getPC, ["listName", "some", "all"], fillCells, ["showSanityText", "dontShowSanityText", "dontShowSanityText"]);

        // Check missing data by field type
        if (!$.isEmptyObject(result2)) {
            createTable ("fieldSanityTests", ["Record Type", "Field Type", "Fields missing"]);
            rows = divSel.select("table.fieldSanityTests").selectAll("tr.sanityRow")
                .data(d3.values(result2))
            ;
            formats.length = 0; formats[3] = pcFormat;
            popTable (rows, getPC, ["recordType", "name", "count"], fillCells, ["showSanityText", "showSanityText", "dontShowSanityText"]);
        }

        // Check fields with controlled vocabularies
        if (!$.isEmptyObject(result3)) {
            createTable ("vocabSanityTests", ["Field Type", "Vocabulary Size"]);
            rows = divSel.select("table.vocabSanityTests").selectAll("tr.sanityRow")
                .data(d3.values(result3))
            ;
            formats.length = 0;
            popTable (rows, getPC, ["name", "count"], fillCells, ["showSanityText", "showSanityText"]);
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