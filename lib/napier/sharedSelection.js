var MGNapier = MGNapier || {};

MGNapier.SharedSelection = function () {

	var allVis = [];
	var sharedSelectionSet = {};
    var valArray = [];  // Used so we don't call d3.keys all the time in this.values()
	var changed = false; // Used so we don't call d3.keys all the time in this.values()
    var isUpdating = false; // Used to stop calling multiple updates on lots of atomic adds
	
	// Redraws all visualisation
	this.update = function () {	
		// update each visualisation
        //console.log (allVis);
        //console.log (this.values());
        if (!isUpdating) {
            for (var i=0; i<allVis.length; i++) {
                allVis[i].updateVals();
            }
        }
	};
	
	
	// make a collection of visualisation the selection model knows about
	this.addVis = function (visCollection) {
        for (var n = 0; n < visCollection.length; n++) {
            this.addSingleVis (visCollection[n]);
        }
	};


    this.addSingleVis = function (vis) {
        var index = allVis ? allVis.indexOf(vis) : -1;
        if (index < 0) {
            allVis.push (vis);
        }
        //console.log ("added to", allVis);
    };

    this.removeVis = function (vis) {
        var index = allVis ? allVis.indexOf(vis) : -1;
        if (index >= 0) {
            allVis.splice (index, 1);
        }
        //console.log ("removed from", allVis);
    };

    this.getVis = function () {
        return allVis.slice(0); // return shallow copy
    };


	// go!
	this.go = function () {
		// Visualisations must have go() and setSelectionModel(sharedSelectionSet) methods
		for (var i=0; i<allVis.length; i++) {
			allVis[i].go();
		}
	};
	

	
	this.addToMap = function (obj) {
		sharedSelectionSet[obj] = true;
        changed = true;
		// might need fixed if lots of things need added
		this.update ();
	};
	
	this.removeFromMap = function (obj) {
		delete sharedSelectionSet[obj];
        changed = true;
		this.update ();
	};
	
	this.addAllToMap = function (objArray) {
        for (var n = 0; n < objArray.length; n++) {
            sharedSelectionSet[objArray[n]] = true;
        }
        changed = true;
		this.update ();
	};
	
	this.removeAllFromMap = function (objArray) {
		for (i = 0; i < objArray.length; i++) {
			delete sharedSelectionSet[objArray[i]];
		}
        changed = true;
		this.update ();
	};
	
	this.contains = function (obj) {
		return sharedSelectionSet[obj] ? true : false;
	};
	
	this.clear = function () {
		sharedSelectionSet = {};
        valArray.length = 0;
        changed = false;    // not true, because we recalc valArray as empty already
	};
	
	this.values = function () {
        valArray = changed ? d3.keys (sharedSelectionSet) : valArray;
        changed = false;
		return valArray;
	};

    this.setUpdating = function (bool) {
        if (bool !== isUpdating) {
            isUpdating = bool;

            if (bool === false) {
                this.update();
            }
        }
    }
};