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

    function isId (fd, d) { return fd.invFieldIndex[fd.idIndex] === d; }
    function getItemSelection (fd, d) { return fd.selectedItems[d] === true || isId(fd, d); }
    function setItemSelection (fd, d, val) { fd.selectedItems[d] = val; }
    function getRowTypeSelection (d) { return d.selected === true; }
    function setRowTypeSelection (d, val) { d.selected = val; }


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
            var rows = table.selectAll("tr.col")
                .data (d.value.invFieldIndex)
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




    this.setAllFields = function (parentSelection, torf, list, exceptionFunc, metaData) {
        //VESPER.log ("efunc", exceptionFunc, parentSelection, list, metaData);
        var tables = parentSelection.selectAll("table");

        var fd = metaData.fileData;
        for (var prop in fd) {
            if (fd.hasOwnProperty(prop)) {
                var f = fd[prop];
                var si = f.selectedItems;
                var llist = list || f.invFieldIndex;
                if (si !== undefined) {
                    for (var n = 0; n < llist.length; n++) {
                        var i = llist[n];
                        if (f.fieldIndex[i]) {
                            si[i] = (exceptionFunc ? exceptionFunc (f, i) : false) || torf;
                        }
                    }

                    var vals = d3.values (si);
                    var uniq = d3.set(vals);
                    setRowTypeSelection (f, uniq.has("true"));
                    VESPER.log (prop, uniq.has("true"));
                }	
            }
        }

	  setRowTypeSelection (metaData.fileData[metaData.coreRowType], true);


        tables.each (
            function (d) {
                updateTable (d3.select(this), metaData, d.key);
            }
        );
    };


    // check metamodel against list of fieldnames
    // needAll decides whether we need to match all the list or just part of it
    this.fieldListExistence = function (meta, list, needAll) {
        var all = [];
        for (var prop in meta.fileData) {
            if (meta.fileData.hasOwnProperty (prop)) {
                all = all.concat(meta.fileData[prop].invFieldIndex);
            }
        }
        var intersect = NapVisLib.intersectArrays (list, all);
        //VESPER.log ("inter", intersect, all);
        return (needAll ? intersect.length === list.length : intersect.length > 0);
    };


    this.addHelperButton = function (parentSelection, fieldParentSelection, listName, list, add, img, klass, metaFunc) {
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
            .on ("click", function (d) { DWCAHelper.setAllFields (fieldParentSelection, d.add, d.value, isId, metaFunc()); })
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


    this.configureCheckbox = function (checkBoxSpanSelection, cboxListParentSelection, list, meta) {
        if (list) {
            checkBoxSpanSelection.datum().attList = list;
        }

        checkBoxSpanSelection.select("input")
            .on ("click", function (d) {
                var setVal = d3.select(this).property("checked");
                DWCAHelper.setAllFields (cboxListParentSelection, setVal, d.attList, isId, meta());

                var cBoxClass = d3.select(d3.select(this).node().parentNode).attr("class"); // up one
                var cGroup = d3.selectAll("span."+cBoxClass+" input[type='checkbox']");
                cGroup = cGroup.filter (function() { return d3.select(this).property("checked"); });
                var list = [];
                cGroup.each (function(d) { list.push.apply (list, d.attList); } );

                DWCAHelper.setAllFields (cboxListParentSelection, true, list, isId, meta());
            })
        ;
    };


    this.addRadioButton = function (parentSelection, cdata, klass, groupName) {
        var rbutControl = parentSelection
            .selectAll("label")
            .data([cdata], function (d) { return d; })
        ;

        if (!rbutControl.enter().empty()) {
            var rwrapper = rbutControl.enter()
                .append("label")
                .attr ("class", klass)
                .attr ("for", function(d) { return d+"RBChoice";})
                .text (function(d) { return d; })
            ;

            rwrapper
                .append ("input")
                .attr ("type", "radio")
                .attr ("value", function (d) { return d; })
                .attr ("name", groupName)
                .attr ("id", function (d) { return d+"RBChoice"; })
                .property ("checked", false)
            ;
        }

        return rbutControl;
    };


    this.configureRadioButton = function (rbLabelWrapper, cboxListParentSelection, changeThisObj, metaDataFunc) {
        rbLabelWrapper
            .select("input")
            .on ("click", function (d) {
                var setVal = d3.select(this).property("checked");
                var gName = d3.select(this).attr("name");
                var rGroup = d3.selectAll("input[type='radio'][name='"+gName+"']");
                var list = [];
                rGroup.each (function(d) { list.push (d); } );
                DWCAHelper.setAllFields (cboxListParentSelection, false, list, isId, metaDataFunc());
                DWCAHelper.setAllFields (cboxListParentSelection, setVal, [d], isId, metaDataFunc());
                changeThisObj.result = d;
        });
    };



    this.divDisplay = function (divArray, displayStatus) {
        for (var n = 0; n < divArray.length; n++) {
            d3.select(divArray[n]).style("display", displayStatus);
        }
    };

    // where and div are d3 single selections, view is a view object
    this.addKillViewButton = function (where, div, view) {
        where.append("button")
            .attr("type", "button")
            .attr("class", "killbutton")
            //.text("KILL")
            .on ("click", function() {
                if (view) {
                    if (view.destroy) { view.destroy(); }
                }
                d3.select(d3.event.target).on ("click", null);
                //if (div) {
                //    div.node().parentNode.removeChild(div.node());
                //}
            })
            .attr ("title", "Close this view")
            .append ("img")
                .attr ("src", VESPER.imgbase+"close.png")
                .attr ("alt", "Close")
        ;
    };

    this.twiceUpRemove = function (divid) {
        var node = d3.select(divid).node();
        var containerNode = node.parentElement;
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