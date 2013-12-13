var DWCAHelper = new function () {

  	this.getSelectedTickBoxValues = function (parentElement, checkboxClass) {
        var argStr = "input[type=checkbox]"+(checkboxClass ? "."+checkboxClass : "");
  		var extCBSel = d3.select(parentElement).selectAll (argStr);
  		var values = {};

        extCBSel.each (localFunc);

        function localFunc () {
            if (this.checked) {
                values[this.value] = true;
            }
        }

  		return values;
  	};


    function setBackground (d, i) {
        var check = this.checked;
        var elem = d3.select(this.parentNode);
        var back = VESPER.DWCAParser.controlledVocabSet[d] ? "#999977" : "#888888";
        elem.style ("background", check ? "" : back);
    }

    function isCore (fd, metaData) { return fd.rowType == metaData.coreRowType; }
    function isId (fd, d) { return fd.invFieldIndex[fd.idIndex] === d; }
    function getItemSelection (fd, d) { return fd.selectedItems[d] === true || isId(fd, d); }
    function setItemSelection (fd, d, val) { fd.selectedItems[d] = val; }
    function getRowTypeSelection (d) { return d.selected === true; }
    function setRowTypeSelection (d, val) { d.selected = val; }

    this.isIdWrap = function (fd, d) { return isId (fd,d); };

    function updateTable (table, metaData, tableKey) {
        VESPER.log ("rt", table, metaData, tableKey);
        var fd = metaData.fileData[tableKey];
        var s = getRowTypeSelection (fd);

        table
            .style ("background", s ? "" : "#888888")
        ;
        table.selectAll("td")
            .style ("background", function(d) {
                return getItemSelection(fd, d) && s ? setBackground(d) : "#888888";
            })
        ;
        table.selectAll("td input")
            .attr ("disabled", function(d) { return isId(fd, d) || !s ? "disabled" : null; })
            .property ("checked", function(d) { return getItemSelection (fd, d); })
        ;

	  table.selectAll("th")
		.style ("background", function(d) {
                return s ? setBackground(d) : "#888888";
            })
	  ;
	  table.selectAll("th input")
            .property ("checked", function(d) { return s; })
        ;
    }

    this.makeFieldSelectionBoxes = function (metaData, parentSelection) {
        setRowTypeSelection (metaData.fileData[metaData.coreRowType], true);

        VESPER.log ("meta", metaData);
        var boxData = d3.entries (metaData.fileData);
        for (var n = 0; n < boxData.length; n++) {
            boxData[n].value.selectedItems = boxData[n].value.selectedItems || {};
            //var pid =
        }
        var divs = parentSelection.selectAll("div.selectBox")
            .data (boxData, function (d) { return d.key; })
        ;

        divs.exit().selectAll("input").on ("click",  null);    // remove event handlers before removing things from dom. meant to avoid memory leaks.
        divs.exit().remove();

        var width = Math.floor (100 / boxData.length) - 2;

        // Make new divs and tables if necessary, then set width and class/id's for all divs/tables
        var newTables = divs.enter()
            .append ("div")
            .attr ("class", "selectBox")
            .append ("table")
        ;
        divs
            .style ("width", width+"%")
            .select("table")
                .attr ("class", function (d) { return d.key == metaData.coreRowType ? "coreTable" : null})
                .attr ("id", function (d) { return d.value.mappedRowType; })
        ;

        var headers = newTables
            .append ("tr")
            .append ("th")
        ;
        headers.append ("input")
            .attr ("type", "checkbox")
            .attr ("class", "extensionFile")
            .attr ("id", function(d) { return "cbox"+d.value.mappedRowType;})
            .property ("checked", function(d) { return getRowTypeSelection (d.value); })
            .attr ("value", function(d) { return d.value.rowType; })
            .attr ("name", function(d) { return d.value.mappedRowType;})
            .attr ("disabled", function(d) { return d.key == metaData.coreRowType ? "disabled" : null})
            .on ("click", function (d, i) {
                var check = this.checked;
                VESPER.log ("check", check, this);
                setRowTypeSelection (d.value, check);
                updateTable (d3.select(newTables[0][i]), metaData, d.key);
                return true;
            })
            .each (setBackground)
        ;
        headers.append ("label")
            .attr ("for", function(d) { return "cbox"+d.value.mappedRowType;})
            .text (function(d) { return d.value.mappedRowType; })
        ;

       // tables.each (makeRows);
        VESPER.log ("divs", divs);
        divs.selectAll("table").each (makeRows);


        function makeRows (d, i) {
            VESPER.log ("makerow args", arguments);
            var fdEntry = d;
            VESPER.log ("table", i, d);
            var table = d3.select(this);
            var tableId = table.attr ("id");
            var suffixNames = d.value.invFieldIndex.filter (function (elem) { return elem !== undefined; });
            var rows = table.selectAll("tr.col")
                .data (suffixNames)
            ;

            rows.exit().selectAll("input").on("click", null);
            rows.exit().remove();

            var newCells = rows.enter()
                .append ("tr")
                .attr ("class", "col")
                .append ("td")
            ;
            newCells.append ("input")
                .attr ("type", "checkbox")
                .attr ("class", "CSVField")
            ;
            newCells.append ("label");

            var existingCells = rows.select("td");
            existingCells.select("input")
                .property ("checked", function(d) { return getItemSelection (fdEntry.value, d); })
                .attr ("id", function (d) { return tableId+d;})
                .attr ("value", function(d, i) { return i;})
                .attr ("name", function(d) { return d;})
                .attr ("disabled", function(d, i) { return isId (fdEntry.value, d) ? "disabled" : null})
                .on ("click", null)
                .on ("click", function (d, i) {
                    var check = this.checked;
                    //setBackground.call (this, d, i);
                    VESPER.log ("fdEntry", fdEntry, check, this);
                    setItemSelection (fdEntry.value, d, check);
                    updateTable (table, metaData, fdEntry.key);
                    return true;
                })
                .each (setBackground)
            ;

            existingCells.select("label")
                .attr ("for", function(d) { return tableId+d;})
                .text (function(d) { return d; })
            ;
        }
    };


    this.getAllSelectedFilesAndFields = function (metaData) {
        var struc = {};
        var fd = metaData.fileData;
        for (var prop in fd) {
            if (fd.hasOwnProperty (prop)) {
                var rowType = fd[prop];

                if (rowType.selected) {
                    var selItems = rowType.selectedItems;
                    VESPER.log ("so", selItems);
                    var nums = {};
                    var l = 0;
                    for (var i in selItems) {
                        if (selItems.hasOwnProperty (i) && selItems[i]) {
                            nums[i] = true;
                            l++;
                        }
                    }

                    if (l) {
                        //var idd = (metaData.coreRowType === prop) ? "id" : "coreid";
                        var idd = rowType.invFieldIndex [rowType.idIndex];
                        nums[idd] = true;
                        struc[prop] = nums;
                    }
                }
            }
        }

        VESPER.log ("Sel Struc", struc);
        return struc;
    };


    // parentSelection - div of tables holding checkboxes
    // torf - true or false. Set or unset.
    // list - list of fieldnames to use in this op. Undefined if we're considering everything.
    // exceptionFunc - function that excludes some checkboxes from this operation
    // metaData - the DWCA metadata object
    // selectionOptions object
    //      .includeExtFiles - does this apply just to fields in core file or extension files too?
    //      .selectFirstOnly - select just the first field with the given name we come across? (selection only, clearing clears all such fields)
    this.setAllFields = function (parentSelection, torf, list, exceptionFunc, metaData, selectionOptions) {
        //VESPER.log ("efunc", exceptionFunc, parentSelection, list, metaData);
        var tables = parentSelection.selectAll("table");
        var includeExtFiles = (selectionOptions ? selectionOptions.useExtRows : true);
        var selectFirstOnly = (selectionOptions ? selectionOptions.selectFirstOnly : false);

        var fd = metaData.fileData;
        // make array ordered with core row type as first entry
        var fdArray = d3.entries(fd).sort(function(a,b) {
            return isCore (a.value, metaData) ? -1 : (isCore (b.value, metaData) ? 1: 0);
        });

        var nullableList = (list ? list.slice(0) : undefined); // list we can safely null values in with no side-effects (possible since list is passed in as a parameter)

        for (var n = 0; n < fdArray.length; n++) {
            var f = fdArray[n].value;
            var si = f.selectedItems;
            var llist = nullableList || f.invFieldIndex;
            if (si !== undefined) {
                for (var m = 0; m < llist.length; m++) {
                    var i = llist[m];
                    if (f.fieldIndex[i]) {
                        si[i] = (isCore (f, metaData) || includeExtFiles) ? ((exceptionFunc ? exceptionFunc (f, i) : false) || torf) : false;
                        if (torf && selectFirstOnly && nullableList) {
                            nullableList[m] = null;
                        }
                    }
                }

                var vals = d3.values (si);
                var uniq = d3.set(vals);
                setRowTypeSelection (f, uniq.has("true")); // set whether 'row' i.e. core or extension file is selected
                VESPER.log (f.rowType, uniq.has("true"));
            }
        }

	    setRowTypeSelection (metaData.fileData[metaData.coreRowType], true); // make sure core extension file is selected

        tables.each (
            function (d) {
                updateTable (d3.select(this), metaData, d.key);
            }
        );
    };


    // check metamodel against list of fieldnames
    // needAll decides whether we need to match all the list or just part of it
    this.fieldListExistence = function (meta, list, needAll, orMatchAtLeast, checkExtRows) {

        var listSet = d3.set (list);
        var matchSet = d3.set ();

        var all = [];
        for (var prop in meta.fileData) {
            if (meta.fileData.hasOwnProperty (prop)) {
                var row = meta.fileData[prop];
                if (checkExtRows || isCore (row, meta)) {
                    for (var m = 0; m < row.invFieldIndex.length; m++) {
                        var fieldName = row.invFieldIndex[m];
                        if (listSet.has (fieldName)) {
                            matchSet.add (fieldName);
                            all.push ({fieldName: fieldName, rowName: prop});
                        }
                    }
                }
            }
        }

        VESPER.log ("List", list, "Match", all, matchSet.values());
        var matchLength = matchSet.values().length;
        var ok = needAll ? matchLength === list.length : (orMatchAtLeast ? matchLength >= orMatchAtLeast : matchLength > 0);
        return {match: ok, fields: all} ;
    };


    this.addHelperButton = function (parentSelection, fieldParentSelection, listName, list, add, img, klass, metaFunc, selOptions) {
        VESPER.log ("IN", listName, list, add, parentSelection.selectAll("button[type=button]."+klass));
        var buttons = parentSelection
            .selectAll("button[type=button]."+klass)
            .data([{key: listName, value: list, add: add}], function (d) { return d.key; })
        ;

        buttons
            .enter()
            .append("button")
            .attr ("type", "button")
            .attr ("class", klass)
            .attr ("value", function (d) { return d.key; })
            .attr ("name", function (d) { return d.key; })
            .on ("click", function (d) { DWCAHelper.setAllFields (fieldParentSelection, d.add, d.value, isId, metaFunc(), selOptions); })
            .html (function (d) { return (img ? "<img src=\""+img+"\">" : "") + d.key; })
        ;
    };


    this.addCheckbox = function (parentSelection, cdata, klass) {
        var cboxGroup = parentSelection
            .selectAll("span")
            .data([cdata], function (d) { return d.title; })
        ;

        function titleOrName (d) { return d.title || d.name; }

        if (!cboxGroup.enter().empty()) {
            var newGroup = cboxGroup.enter()
                .append ("span")
                .attr ("class", klass)
            ;

            newGroup
                .append ("input")
                .attr ("type", "checkbox")
                .attr ("value", titleOrName)
                .attr ("name", titleOrName)
                .attr ("id", titleOrName)
                .property ("checked", false)
            ;

            var newLabel = newGroup
                .append("label")
                .attr ("for", titleOrName)
                .text ( titleOrName)
            ;

            if (cdata.icon) {
                newLabel.append ("img")
                    .attr ("alt",  titleOrName)
                    .attr ("src", function(d) { return d.image || d.icon; })
                ;
            }
        }

        return cboxGroup;
    };


    this.configureCheckbox = function (checkBoxSpanSelection, list, clickFunc) {
        if (list) {
            checkBoxSpanSelection.datum().attList = list;
        }

        checkBoxSpanSelection.select("input")
            .on ("click", clickFunc)
        ;
    };

    this.reselectActiveVisChoices = function (group, cboxListParentSelection, meta, selOptions) {
        group = group.filter (function() { return d3.select(this).property("checked"); });
        var list = [];
        group.each (function(d) { list.push.apply (list, d.attList); } );
        DWCAHelper.setAllFields (cboxListParentSelection, true, list, isId, meta(), selOptions);
        return group;
    };


    this.addRadioButton = function (parentSelection, cdata, klass, groupName, textFunc) {
        var rbutControl = parentSelection
            .selectAll("span")
            .data([cdata], function (d) { return textFunc(d); })
        ;

        if (!rbutControl.enter().empty()) {
            var rwrapper = rbutControl.enter()
                .append("span")
                .attr("class", klass)
            ;

            rwrapper
                .append ("input")
                .attr ("type", "radio")
                .attr ("value", textFunc)
                .attr ("name", groupName)
                .attr ("id", function (d) { return textFunc(d)+"RBChoice"; })
                .property ("checked", false)
            ;

            rwrapper
                .append("label")
                .attr ("for", function(d) { return textFunc(d)+"RBChoice";})
                .text (textFunc)
            ;
        }

        return rbutControl;
    };


    this.configureRadioButton = function (rbLabelWrapper, cboxListParentSelection, changeThisObjFunc, metaDataFunc, selOptions) {
        rbLabelWrapper
            .select("input")
            .on ("click", function (d) {
                var setVal = d3.select(this).property("checked");
                var gName = d3.select(this).attr("name");
                var rGroup = d3.selectAll("input[type='radio'][name='"+gName+"']");
                var list = [];
                rGroup.each (function(d) { list.push (d.fieldType); } );
                DWCAHelper.setAllFields (cboxListParentSelection, false, list, isId, metaDataFunc(), selOptions);
                DWCAHelper.setAllFields (cboxListParentSelection, setVal, [d.fieldType], isId, metaDataFunc(), selOptions);
                changeThisObjFunc(d);
        });
    };



    this.divDisplay = function (divArray, displayStatus) {
        for (var n = 0; n < divArray.length; n++) {
            d3.select(divArray[n]).style("display", displayStatus);
        }
    };


    this.twiceUpRemove = function (divid) {
        var node = d3.select(divid).node();
        var containerNode = node.parentElement;
        //VESPER.log ("CONTAINER", containerNode, $(containerNode));
        $(function() {
            $(containerNode).draggable("destroy");
        });
        containerNode.parentElement.removeChild (containerNode);
    };

    this.recurseClearEvents = function (sel) {
        sel
            .on ("mouseout", null)
            .on ("mouseover", null)
            .on ("mousedown", null)
            .on ("mouseup", null)
            .on ("click", null)
            .on ("contextmenu", null)
        ;

        VESPER.log ("REC SEL", sel);

        sel.each (function() {
           var obj = d3.select(this);
           var childrenSel = obj.selectAll("*");
           if (!childrenSel.empty()) {
                DWCAHelper.recurseClearEvents (childrenSel);
           }
        });
    }
};