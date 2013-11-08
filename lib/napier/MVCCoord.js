	
var MVCCoord = function () {

	var allVis = [];
	
	// make a collection of visualisation the selection model knows about
	this.setVis = function (visCollection) {
		for (var n = 0; n < allVis.length; n++) {
			allVis[n].clearMVCObject ();
		}
		
		allVis = visCollection;
		
		for (var n = 0; n < allVis.length; n++) {
			allVis[n].setMVCObject (this);
		}
	};


    this.addVis = function (vis) {
        vis.clearMVCObject ();
        vis.setMVCObject (this);
        allVis.push (vis);
    };


	// go!
	this.go = function (goState) {
		for (var i=0; i<allVis.length; i++) {
			allVis[i].go(goState);
		}
	};
	
	
	// update
	this.update = function (updateState) {	
		// update each visualisation
		for (var i=0; i<allVis.length; i++) {
			allVis[i].update(updateState);
		}
	};
};