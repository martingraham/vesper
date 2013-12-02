VESPER.FilterView = function (divID) {

    var model;
    var self = this;
    var typeAhead = true;

    this.set = function (fields, mmodel) {
        model = mmodel;
    };


	this.go = function () {
        var tid = d3.select(divID).attr("id")+"Text";
        var textSearch = d3.select(divID).append("span");
        textSearch.append("label")
            .attr("for", tid)
            .text ("Search")
        ;
        textSearch.append("input")
            .attr("type", "text")
            .attr("id", tid)
        ;

        var typeAheadDiv = textSearch.append("div");

        typeAheadDiv
            .append ("input")
            .attr ("name", tid+"TypeAhead")
            .attr ("value", typeAhead ? "checked" : "")
            .attr ("checked", typeAhead)
            .attr ("type", "checkbox")
            .on ("click", function () {
                typeAhead = d3.event.target.checked;
            })
        ;

        typeAheadDiv
            .append ("label")
            .attr ("for", tid+"TypeAhead")
            .text ("Keystroke Search")
        ;

        bindSearch ();
		this.update ();
	};

    function bindSearch () {
        var tfield = d3.select(divID).select("span input");
        tfield
            .on ("keyup", function() {
                if (typeAhead || (d3.event.keyCode | d3.event.charCode) === 13) {
                    model.getSelectionModel().clear();
                    var count = VESPER.Filters.filter2 (model, null, d3.select(this).property("value"));
                }
            })
        ;
    }
	
	
	this.update = function () {

	};

    this.updateVals = this.update;


    this.destroy = function () {
        DWCAHelper.recurseClearEvents (d3.select(divID));

        model.removeView (self);
        model = null;
        DWCAHelper.twiceUpRemove(divID);
    }
};

VESPER.modelBag = [];


VESPER.SelectedView = function (divID) {

    var idField = "mappedRowType";
    var extDetailTable = "extDetailTable";
    var detailTable = "detailTable";
    var model;
    var self = this;


    this.set = function (fields, mmodel) {
        model = mmodel;
    };


    this.go = function () {
        var save = d3.select(divID).select("button#save");
        if (save.empty()) {
            if (window.requestFileSystem) {
                d3.select(divID).append("button")
                    //.attr ("id", "save")
                    .text ("SAVE")
                    .on ("click", function(d) {
                        NapVisLib.prepareForWrite (NapVisLib.writeArray, model.getSelectionModel().values());
                    })
                ;
            } else {
                NapVisLib.html5Lacks(d3.select(divID), "[Browser does not support FileWriter]");
            }
        }

        var clear = d3.select(divID).select("button#clearSel");
        if (clear.empty()) {
            d3.select(divID).append("button")
                //.attr ("id", "clearSel")
                .text ("CLEAR")
                .on ("click", function(d) {
                    model.getSelectionModel().clear();
                    model.getSelectionModel().update();
                })
            ;
        }

        var compare = d3.select(divID).select("button#compareMod");
        if (compare.empty()) {
            d3.select(divID).append("button")
                //.attr ("id", "compareSel")
                .text ("COMPARE MODEL")
                .on ("click", function() {
                    VESPER.modelBag.push ({"model":model});
                    VESPER.log ("ModelBag", VESPER.modelBag);
                    if (VESPER.modelBag.length > 1) {
                        VESPER.modelComparisons.modelCoverageToSelection(VESPER.modelBag[0].model, VESPER.modelBag[1].model,
                            VESPER.modelBag[0].model.getMetaData().vesperAdds.nameLabelField,
                            VESPER.modelBag[1].model.getMetaData().vesperAdds.nameLabelField
                        );
                        VESPER.modelBag.length = 0;
                    }
                })
            ;
        }

        this.update ();
    };


    this.update = function () {
        var vals = model.getSelectionModel().values();
        var taxon = (vals[0]);

        var selectionStats = d3.select(divID).selectAll("p.summary").data([vals.length]);
        selectionStats.enter()
            .append("p")
            .attr("class", "summary")
        ;
        selectionStats
            .text (function(d) { return "Selected "+d+" item"+(d===1?"":"s")+"."; })
        ;

        if (taxon !== undefined) {
            //VESPER.log ("METADATA", metaData);
            var metaData = model.getMetaData();
            var fileData = metaData.fileData;
            var node = model.getNodeFromID (taxon);

            var tableSel = d3.select(divID).select("."+detailTable);
            if (tableSel.empty()) {
                d3.select(divID).append("table")
                    .attr("class", detailTable)
                ;
                tableSel = d3.select(divID).select("."+detailTable);
            }

            var table = tableSel.node();
            table.innerHTML = '';

            var trow = document.createElement ("tr");
            var lcell = document.createElement ("th");
            var vcell = document.createElement ("th");
            lcell.innerHTML = "Field";
            vcell.innerHTML = "Value";
            trow.appendChild (lcell);
            trow.appendChild (vcell);
            table.appendChild (trow);

            var tableData = [];
            var tInvFields = fileData[metaData.coreRowType].filteredInvFieldIndex;
            VESPER.log ("TAXON", taxon, node);
            var tdata = model.getTaxaData(node);
            for (var n = 0; n < tdata.length; n++) {
                if (tdata[n]) {
                    tableData.push ({"field":tInvFields[n], "data":tdata[n]});
                }
            }


            var fieldBind = tableSel
                    .selectAll("tr.nonHeader")
                    .data(tableData)
                ;
            addFieldData (fieldBind);

            var newFields =
                    fieldBind.enter()
                        .append ("tr")
                        .attr ("class", "nonHeader")
                ;
            addFieldData (newFields);


            var extKeys = d3.keys (model.getExtraData(node));
            var extTablesSel = d3.select(divID).selectAll("table."+extDetailTable);
            var extTablesBind = extTablesSel.data (extKeys);

            extTablesBind
                .exit()
                .remove()
            ;

            extTablesBind
                .enter ()
                .append ("table")
                .attr ("class", extDetailTable)
                .attr ("id", function (d) { return d+"Table"; })
            ;

            var rowTypeMap = {};
            for (var i = 0; i < metaData.extRowTypes.length; i++) {
                var rowType = metaData.extRowTypes[i];
                rowTypeMap [fileData[rowType][idField]] = rowType;
            }

            for (var n = 0; n < extKeys.length; n++) {
                addExtHeader (model.getExtraData(node), extKeys[n], rowTypeMap[extKeys[n]], divID);
                addExtData (model.getExtraData(node), extKeys[n], rowTypeMap[extKeys[n]], divID);
            }
        }

        d3.select(divID).selectAll("table").style("visibility", taxon === undefined ? "collapse" : "visible");
    };

    this.updateVals = this.update;


    function addFieldData (existOrNew) {
        existOrNew
            .append ("td")
            .attr ("class", "field")
            .text(function(d) { return d.field; })
        ;

        existOrNew
            .append ("td")
            .attr ("class", "value")
            .each (addHrefIfNecc)
        ;

        function addHrefIfNecc (d) {
            if (d.data.substring(0,7) == "http://") {
                d3.select(this).append ("a")
                    .attr ("href", function(d) { return d.data; })
                    .attr ("target", "_blank")
                    .text (function(d) { return d.data; })
                ;
            } else {
                d3.select(this).text(function(d) {
                    return d.data;
                });
            }
        }
    }


    function addExtHeader (ext, tableID, fileDataRowType, div) {
        var fileData = model.getMetaData().fileData;
        VESPER.log ("table", div, "#"+tableID+"Table", fileDataRowType);
        var extTable = d3.select(div).select("#"+tableID+"Table");
        var hrow = extTable.selectAll("tr.hrow");
        var hRowBind = hrow.data ([0]); // a dummy 1 element array for 1 header row

        hRowBind
            .enter()
            .append ("tr")
            .attr ("class", "hrow")
        ;

        var invFields = fileData[fileDataRowType].filteredInvFieldIndex;
        hrow = extTable.selectAll("tr.hrow");
        var headerCellBind = hrow.selectAll("th")
            .data (invFields);

        headerCellBind
            .text (function(d,i) { return invFields[i]; })
        ;

        headerCellBind
            .enter()
            .append("th")
            .text (function(d,i) { return invFields[i]; })
        ;
    }


    function addExtData (ext, tableID, fileDataRowType, div) {
        var extProp = tableID;
        var fileData = model.getMetaData().fileData;
        //VESPER.log ("extData", ext, extProp);
        var extTable = d3.select(div).select("#"+tableID+"Table");
        var rowSel = extTable.selectAll ("tr.drow");
        var rowBind = rowSel.data (ext[extProp]);

        rowBind.exit()
            .remove();

        rowBind.enter()
            .append ("tr")
            .attr ("class", "drow")
            .attr ("id", function(d, i) { return tableID + i; })
        ;

        for (var n = 0; n < ext[extProp].length; n++) {
            var extEntry = ext[extProp][n];
            var indRowSel = extTable.select("#"+tableID+n).selectAll("td");
            var indRowBind = indRowSel.data (extEntry);

            indRowBind
                .exit()
                .text ("")
            ;

            indRowBind
                .text (function (d) { return d; })
            ;

            indRowBind.enter()
                .append ("td")
                .text (function (d) { return d; })
            ;
        }
    }

    this.destroy = function () {
        DWCAHelper.recurseClearEvents (d3.select(divID));

        model.removeView (self);
        model = null;
        DWCAHelper.twiceUpRemove(divID);
    }
};