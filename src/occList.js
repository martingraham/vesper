var OccList = function (divid) {

	var dims = NapVisLib.getDivDims (divid);
	
	var thisView;
	var listG;
    var model;

	var exitDur = 400, updateDur = 1000, enterDur = 400;
	var selected = {};
	
	var keyField, nameField, rankField, rowFields;


    this.set = function (fields, mmodel) {
        keyField = fields.identifyingField;
        nameField = fields.nameField;
        rankField = fields.rankField;
        rowFields = fields.rowFields;
        model = mmodel;
    };
	
	this.go = function () {
		thisView = this;
		
		listG = d3.select(divid)
			.append("table")
			.attr("pointer-events", "all")
		;
		
		d3.select(divid)
			.style ("overflow", "auto")
		;
		//depthCharge (root);
		bindSearch ();
		
		this.update ();
	};
	
	
	function bindSearch () {	
		var tfield = d3.select("#regexId");
		tfield.
			data ([0])
			//.on ("click", function(d) { VESPER.log ("click", tfield); filterNodes (); return false; })
			.on ("keyup", function(d) { filterNodes (); return false; })
		;
		VESPER.log (tfield);
	}
	
	
	this.update = function () {

        var selectedKeys = model.getSelectionModel().values();
        var rec = selectedKeys[0];

		VESPER.log ("oc", model.getData());
		
		var nodeBind = listG
			.selectAll("tr") 
			.data(
				d3.values (model.getData()).slice(1, 1000),
				function(d) { return model.getNodeFromID(d)[keyField]; } // id is key
			)
		;
		
		var offset = 0;
		
		// remove old nodes
		nodeBind.exit()
			.on("mousedown", null)		// remove event handler
		;
		NapVisLib.d3fadeAndRemoveGroups ([nodeBind.exit()], exitDur, 0);
		
		// update existing rows
		nodeBind
	    	.style("background", function(d) { return doBackground (d, this); })
			//.each (perRow)
		;
		
		// add new rows
		var newNodes = 
			nodeBind.enter()
			.append ("tr")
				.classed ("dwcalist", true)
				.on("mousedown", function (d) {
                    model.getSelectionModel().clear();
                    model.getSelectionModel.addToMap (model.getNodeFromID(d)[keyField]);
                })
				.style("background", function(d) { return doBackground (d, this); })
				.each (perRow)
		;
		
		// make sure selected row is visible
		var thisDiv = d3.select(divid).node();
		VESPER.log ("scrollTop, offset, scrollTop+clientHeight", thisDiv.scrollTop, offset, thisDiv.scrollTop + thisDiv.clientHeight);
		if (thisDiv.scrollTop > offset || thisDiv.scrollTop + thisDiv.clientHeight < offset) {
			thisDiv.scrollTop = offset;
		}
		
		function doBackground (d, node) {
			var isSel = rec && model.getTaxaData(rec)[keyField] == model.getTaxaData(d)[keyField];
			if (isSel) {
				//VESPER.log (d3.select(this).node());
				offset = node.offsetTop;
			}
			return isSel ? "#ff0000" : null /*"#d0d0d0"*/; 
		}
	};

    this.updateVals = this.update;
	
	
	function perRow (d, i) {
		//VESPER.log (this.args);
		var row = d3.select(this);
		var cells = row.selectAll("td")
			.data (filterRowData (model.getTaxaData(d)))
		;
		
		cells.exit()
			.remove()
		;
		
		cells
			.call (updateCell)
		;
		
		cells.enter()
			.append("td")
			.call (updateCell)
		;
			
		function updateCell (sel) {
			sel
				.attr("color", "#222222")
				.text (function(d) { return d; } )
				.attr("title", 
					function(d) { return d; }
				)
			;
		}
	}
	
	
	function filterRowData (record) {
		newArr = [];
		for (var n = 0; n < record.length; n++) {
			if (rowFields[n]) {
				newArr.push (record[n]);
			}
		}
		
		return newArr;
	}
	
	
	
	
	function filterNodes () {
		/*
		var regex = d3.select("#regexId").node();
		var regtext = regex.value;

		VESPER.log ("regtext", regtext);
		selected = {};
		var count = 0;
		
		if (regtext !== undefined && regtext.length > 0) {
		
			var idx = fileData["Taxon"].fieldIndex["id"];
			var vnFieldIdx = fileData["VernacularName"].fieldIndex["vernacularName"];
			
			
			for (var prop in treedata) {
				if (treedata.hasOwnProperty(prop)) {
					var taxon = treedata[prop];
					var name = taxon[VESPER.DWCAParser.TDATA][nameField];
					if (name.match (regtext) != null) {
						selected[prop] = true;
						count++;
					}
					else if (taxon.ext && taxon.ext.VernacularName) {
						var vnames = taxon.ext.VernacularName;
						for (var n = vnames.length; --n >= 0;) {
							var name2 = vnames[n][vnFieldIdx];
							//VESPER.log ("name2", name2);
							if (name2.match (regtext) != null) {
								selected[prop] = true;
								count++;
								break;
							}
						}
					}
				}
			}	
		}

         VESPER.DWCAParser.countSelectedDesc (absRoot, selected, idx);
		
		var regexLabel = d3.select("#regexLabel");
		regexLabel.html (count+(count === 1 ? "match." : " matches."));
		
		if (count == 1) {
			var singleKey = d3.keys (selected);
			curRoot = treedata[singleKey[0]];
		}
		*/

        model.update();
	}
};