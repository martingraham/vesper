VESPER.FilterView = function (divID) {

    var model;
    var self = this;
    var typeAhead = true;
    var keyField;

    this.set = function (fields, mmodel) {
        keyField = fields.identifyingField;
        model = mmodel;
    };


	this.go = function () {
        var tid = d3.select(divID).attr("id")+"Text";
        var textSearch = d3.select(divID).append("span");
        textSearch.append("label")
            .attr("for", tid)
            .text ($.t("search.label"))
        ;
        textSearch.append("input")
            .attr("type", "search")
            .attr("id", tid)
            .attr("placeholder", $.t("search.placeholderText"))
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
            .text ($.t("search.keystrokeLabel"))
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
                    /*var count = */VESPER.Filters.nameLabelFilter (model, d3.select(this).property("value"));
                }
            })
        ;
    }
	

	this.update = function () {};

    this.updateVals = this.update;


    this.destroy = function () {
        VESPER.DWCAHelper.recurseClearEvents (d3.select(divID));

        model.removeView (self);
        model = null;
        VESPER.DWCAHelper.twiceUpRemove(divID);
    };
};

VESPER.modelBag = [];


VESPER.RecordDetails = function (divID) {

    var idField = "mappedRowType";
    var extDetailTable = "extDetailTable";
    var detailTable = "detailTable";

    var model;
    var self = this;
    var curID;
    var keyField;


    this.set = function (fields, mmodel) {
        var ffields = mmodel.makeIndices ([fields.identifyingField]);
        keyField = ffields[0];
        model = mmodel;
    };


    this.go = function () {
        var divSel = d3.select(divID);
        var recordInput = divSel.append("div");
        var iid = divSel.attr("id")+"textinput";
        recordInput.append("label")
            .attr("for", iid)
            .text ($.t("search.findLabel"))
        ;
        recordInput.append("input")
            .attr("type", "search")
            .attr("id", iid)
            .attr("placeholder", $.t("search.findPlaceholderText"))
        ;
        recordInput.append("span")
            .attr ("class", "vesperWarning")
            .text($.t("search.noResult"))
            .style("display", "none")
        ;


        var rfield = divSel.select("input");
        rfield
            .on ("keyup", function() {
                recordInput.select("span.vesperWarning").style("display","none");
                if ((d3.event.keyCode | d3.event.charCode) === 13) {
                    var val = d3.select(this).property("value");
                    newID (val);
                }
            })
        ;
    };


    this.update = function () {
        var divSel = d3.select(divID);

        if (curID !== undefined) {
            //VESPER.log ("METADATA", metaData);
            var metaData = model.getMetaData();
            var fileData = metaData.fileData;
            var node = model.getNodeFromID (curID);

            // Set up taxon data table
            var tableSel = makeTableAndHeader (divSel, detailTable, [$.t("search.fieldLabel"), $.t("search.valueLabel")]);
            var tableData = [];
            var tInvFields = fileData[metaData.coreRowType].filteredInvFieldIndex;
            var tdata = model.getTaxaData(node);
            for (var n = 0; n < tdata.length; n++) {
                if (tdata[n]) {
                    tableData.push ([tInvFields[n], tdata[n]]);
                }
            }

            var fieldBind = tableSel
                .selectAll("tr.nonHeader")
                .data(tableData)
            ;
            fieldBind.exit().remove();
            addFieldData (fieldBind);
            var newFields =
                fieldBind.enter()
                    .append ("tr")
                    .attr ("class", "nonHeader")
            ;
            addFieldData (newFields);


            var extKeys = d3.keys (model.getExtraData(node));
            var extTablesSel = divSel.selectAll("table."+extDetailTable);
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

            // Synonymy table
            var synTablesSel = makeTableAndHeader (divSel, "synTable", [$.t("search.recordSyn")]);
            var syns = model.getSynonyms(node);
            tableData = [];
            if (syns) {
                for (var n = 0; n < syns.length; n++) {
                    var syn = syns[n];
                    tableData.push ([model.getIndexedDataPoint(syn, keyField)]);
                }
            }
            synTablesSel.style("display", syns ? null : "none");

            fieldBind = synTablesSel
                .selectAll("tr.nonHeader")
                .data(tableData)
            ;
            fieldBind.exit().remove();
            addFieldData (fieldBind);
            newFields =
                fieldBind.enter()
                    .append ("tr")
                    .attr ("class", "nonHeader")
            ;
            addFieldData (newFields);
            //addFieldData (fieldBind);


            // Specimens table
            var specTablesSel = makeTableAndHeader (divSel, "specTable", [$.t("search.recordSpec")]);
            var specs = model.getSpecimens(node);
            tableData = [];
            if (specs) {
                for (var n = 0; n < specs.length; n++) {
                    var spec = specs[n];
                    tableData.push ([model.getIndexedDataPoint(spec, keyField)]);
                }
            }
            specTablesSel.style("display", specs ? null : "none");

            fieldBind = specTablesSel
                .selectAll("tr.nonHeader")
                .data(tableData)
            ;
            fieldBind.exit().remove();
            addFieldData (fieldBind);
            newFields =
                fieldBind.enter()
                    .append ("tr")
                    .attr ("class", "nonHeader")
            ;
            addFieldData (newFields);
        }

        divSel.selectAll("table").style("visibility", curID === undefined ? "collapse" : "visible");
    };

    this.updateVals = this.update;

    function makeTableAndHeader (under, tableClass, headerArray) {
        var tableSel = under.select("."+tableClass);
        if (tableSel.empty()) {
            d3.select(divID).append("table")
                .attr("class", tableClass)
            ;
            tableSel = d3.select(divID).select("."+tableClass);
            var headers = tableSel.append("tr").selectAll("th").data(headerArray);
            headers.enter().append("th").text(function(d) { return d; });
        }
        return tableSel;
    }

    function newID (val) {
        if (model.getNodeFromID(val)) {
            curID = val;
            self.update();
        } else {
            d3.select(divID).select("div").select("span.vesperWarning").style("display", null);
        }
    }

    function jumpToClick (d) {
        if (d) {
            d3.select(divID).select("input").property("value", d);
            newID (d);
        }
    }

    function addFieldData (existOrNew) {

        var cells = existOrNew.selectAll("td").data(function(d) { return d; });
        cells.enter().append("td");
        cells.each(addHrefIfNecc).on("click", jumpToClick).style("cursor", "pointer");

        function addHrefIfNecc (d) {
            if (d.substring && d.substring(0,7) === "http://") {
                d3.select(this).append ("a")
                    .attr ("href", function(d) { return d; })
                    .attr ("target", "_blank")
                    .text (function(d) { return d; })
                ;
            } else {
                d3.select(this).text(function(d) {
                    return d;
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
        //var fileData = model.getMetaData().fileData;
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
        VESPER.DWCAHelper.recurseClearEvents (d3.select(divID));
        curID = undefined;
        model.removeView (self);
        model = null;
        VESPER.DWCAHelper.twiceUpRemove(divID);
    };
};