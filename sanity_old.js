// TimeLine

VESPER.Sanity = function(divid) {

    var model;
	var thisView;

	var exitDur = 400, updateDur = 1000, enterDur = 400;
	var selected = {};


    this.set = function (fields, mmodel) {
        model = mmodel;
        console.log ("sanity model", model);
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
                var present = VESPER.DWCAParser.findFields (model.getMetaData().fileData, lists[list], "filteredFieldIndex");
                var nullCount = NapVisLib.countNulls (present);
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
                var tdat = model.getTaxaData (dataModel[obj]);

                if (tdat) {
                    for (var i = 0; i < tests.length; i++) {
                        var test = tests[i];
                        var some = false, all = true;

                        for (var j = 0; j < test.length; j++) {
                            var fieldData = test[j];
                            var index = fieldData.index;
                            var val = tdat[index];
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

        for (var obj in dataModel) {
            if (dataModel.hasOwnProperty(obj)) {
                var tdat = model.getTaxaData (dataModel[obj]);
                if (tdat) {

                    for (var n = 0; n < fdEntries.length; n++) {
                        var fIndex = fdEntries[n].value.filteredInvFieldIndex;
                        var shortName = fdEntries[n].value.mappedRowType;
                        for (var f = 0; f < fIndex.length; f++) {
                            var fName = fIndex[f];

                            if (tdat[f] === undefined || tdat[f] === null) {
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


	this.update = function () {
        var divSel = d3.select(divid);
        var result = calcVisBasedSanity ();
        var result2 = calcFieldBasedSanity ();
        var result3 = calcControlledVocabFieldRanges ();
        var testOutputs = result.outputs;
        var oc = result.dataCount;

        var intro = divSel.select("div.visHeader");
        if (intro.empty) {
            d3.select(divid)
                .append ("div")
                .attr ("class", "visHeader")
                .append ("p")
        }

        divSel.select("div.visHeader")
            .select("p")
            .text ("Sanity Check: "+oc+" Records.")
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

        function popTable (rows, calcData, cellFiller)  {
            rows.exit().remove();

            rows.enter()
                .append ("tr")
                .attr ("class", "sanityText")
            ;

            rows.each(calcData).each(cellFiller);
        }

        var pcFormat = d3.format (".2%");
        var formats = [];

        function fillCells (d, i) {
            var cells = d3.select(this).selectAll("td").data(d3.values(d));
            cells.enter().append ("td");
            cells.text (function(d, i) { return formats[i] ? formats[i](d) : d.toString(); });
        }


        // Check missing data by vis type
        createTable ("visSanityTests", ["Vis Type", "some fields missing", "all fields missing", "some fields missing %", "all fields missing %"]);
        var rows = divSel.select("table.visSanityTests").selectAll("tr.sanityText")
            .data(testOutputs)
        ;
        function getPC (d, i) {
            d.somePC = (d.some / oc);
            d.allPC = (d.all / oc);
        }
        formats.length = 0; formats[3] = pcFormat; formats[4] = pcFormat;
        popTable (rows, getPC, fillCells);

        // Check missing data by field type
        if (!$.isEmptyObject(result2)) {
            createTable ("fieldSanityTests", ["Record Type", "Field Type", "fields missing", "fields missing %"]);
            rows = divSel.select("table.fieldSanityTests").selectAll("tr.sanityText")
                .data(d3.values(result2))
            ;
            function getPC2 (d, i) { d.countPC = (d.count / oc); }
            formats.length = 0; formats[3] = pcFormat;
            popTable (rows, getPC2, fillCells);
        }

        // Check fields with controlled vocabularies
        if (!$.isEmptyObject(result3)) {
            createTable ("vocabSanityTests", ["Field Type", "Vocabulary Size"]);
            //console.log ("Result3", result3);
            rows = divSel.select("table.vocabSanityTests").selectAll("tr.sanityText")
                .data(d3.values(result3))
            ;
            function getPC3 (d, i) {}
            formats.length = 0;
            popTable (rows, getPC3, fillCells);
        } else {
            eraseTable ("vocabSanityTests");
        }
	};

    this.updateVals = this.update;

    this.destroy = function () {
        DWCAHelper.recurseClearEvents (d3.select(divid));

        model.removeView (self);
        model = null;
        DWCAHelper.twiceUpRemove(divid);
    }
};