var DWCAMapGoogle = function (divid, fields, fileData) {

	var dims = NapVisLib.getDivDims (divid);
	
	var MVC;
	
	var exitDur = 400, updateDur = 1000, enterDur = 400;
	var selected = {};
	
	var keyField = fields.identifyingField;
	var longField = fields.longitude;
	var latField = fields.latitude;
	
	
	
	this.go = function (dataModel, unused) {
		var struc = dataModel;
    	
    	if (latField && longField) {
    		var narRecs = {};
    		 for (var prop in struc) {
    			 if (struc.hasOwnProperty (prop)) {
    				 var rec = struc[prop][DWCAParser.TDATA];
    				 //narRecs[prop] = [+rec[latI], +rec[lonI], 1, rec[idI]];
    				 narRecs[prop] = [+rec[latField], +rec[longField]];
    			 }
    		 } 
    		 
    		 console.log ("nr", narRecs);
    		 
    		 var data = new google.visualization.DataTable();
    		 data.addColumn ('number', 'LATITUDE', "latitude");
    		 data.addColumn ('number', 'LONGITUDE', "longitude");
    		// data.addColumn ('number', 'VALUE', "fix");
    		// data.addColumn ('string', 'HOVER', "Id");
    		 
    		 data.addRows (d3.values (narRecs));

	        var options = {};
	        options['dataMode'] = 'markers';
	        //options['region'] = "154";
	
	        var container = d3.select(divid).node();
	        var geochart = new google.visualization.GeoChart(container);
	        geochart.draw(data, options);
    	}
	};
	
	this.update = function (unused) {
	
	};
	
	
	this.clearMVCObject = function () {
		MVC = null;
	};
	
	this.setMVCObject = function (newMVC) {
		MVC = newMVC;
	};
	
};
		