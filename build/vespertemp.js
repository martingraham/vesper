/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 11/06/13
 * Time: 13:02
 * To change this template use File | Settings | File Templates.
 */
var VESPER = (function() {
    var vesper = {};
    vesper.alerts = false;
    vesper.logRun = true;
    vesper.log = function (obj) {
        if (vesper.logRun) {
            console.log.apply (console, arguments);
        }
    };
    vesper.imgbase = "../img/";
    vesper.log (vesper);
    return vesper;
}());;/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 08/02/13
 * Time: 11:37
 * To change this template use File | Settings | File Templates.
 */

VESPER.DWCAZipParse = new function () {

    var fileData;
    var fieldDelimiter, fieldDelimiterVal, lineDelimiter, lineDelimVal, quoteDelimiter, qDelimVal, firstTrue, readFields, lineNo;
    var escapeCharVal = "\\".charCodeAt(0);
    var defaults = [], invDiscreteTermIndex = [], invSharedTermIndex = [];
    var pTime = 0;
    var notifyFunc;
    var first256 = [];

    var sharedMaps = [];

    var pb = 0;


    this.rowReader2 = function (strArray) {
        var field = 0;
        var fromI = 0, toI = 0;
        var use = readFields [field];
        var c;
        var str = [];
        //var subStr = [];
        var strLen = strArray.length;
        var quotes = false, esc = false;

        for (var n = 0; n < strLen; n++) {
            var sstr = strArray[n];
            c = sstr ? sstr : 0;

            if (quoteDelimiter && !esc && c == qDelimVal) {
                quotes = !quotes;
            }
            if (!quotes && (c === fieldDelimiterVal || n === strLen - 1)) {
                if (use) {
                    toI = n + ((n === strLen - 1) ? 1 : 0);
                    if (fromI === toI) {    // empty field, adjacent delimiters
                        str.push (defaults[field]);
                    } else {
                        var newStr = String.fromCharCode.apply (null, strArray.slice(fromI, toI));
                        // if field is deemed to be formed of a discrete set of entries (like ranks), then reuse strings to save mem
                        var dList = invDiscreteTermIndex [field];
                        var sIndex = invSharedTermIndex [field];

                        if (dList) {
                            var mapStr = dList[newStr];
                            if (!mapStr) {
                                dList[newStr] = newStr;
                                VESPER.log ("new entry for field", field, "at lineNo", lineNo, ":", newStr, newStr.length);
                            } else {
                                newStr = null;
                                newStr = mapStr;
                            }
                        }
                        else if (sIndex) {
                            var mapStr = sharedMaps[sIndex][newStr];
                            if (!mapStr) {
                                sharedMaps[sIndex][newStr] = newStr;
                            } else {
                                newStr = null;
                                newStr = mapStr;
                            }
                        }

                        pb += (toI - fromI);
                        str.push (newStr);
                    }
                }
                field++;
                use = readFields [field] | false;
                fromI = n + 1;
            }

            esc = (c == escapeCharVal);
        }
        lineNo++;

        if (lineNo % 10000 === 0 || lineNo === 10998) {
            if (notifyFunc) {
                notifyFunc (lineNo, str);
            } else {
                VESPER.log (lineNo, ": ", str);
            }
        }
        if (lineNo % 100 === 0) {
            var tt = NapVisLib.makeTime();
            if (tt - pTime > 1000) {
                pTime = tt;
                if (notifyFunc) {
                    notifyFunc (lineNo, str);
                } else {
                    VESPER.log (lineNo, ": ", str);
                }
            }
        }
        //VESPER.log (str);
        return str;
    };



    this.zipStreamSVParser2 = function (inflateFunc) {
        //return [];

        if (VESPER.alerts) { alert ("start partial parse with charcodes"); }
        var buff = new Array(1024);
        var blength = 1024;
        var out = [];
        var i;
        var bigOut = [];
        var k = 0;
        var esc = false, quotes = false;

        var stt = true;
        var ch, ch2, c;
        var utfwrap = 0;

        var mt = NapVisLib.makeTime();
        pTime = mt;

        while((i = inflateFunc (buff, utfwrap, blength - utfwrap)) > 0) {

            //if (lineNo > 10992 && lineNo < 10998) {
            //    VESPER.log (lineNo, utfwrap, "\nout", out.join(), "\nbuff", buff.length, i, buff.join(), "\n", buff[1023]);
            //}

            i += utfwrap; // cos we may have chars left over from not processing utf chars chopped between buffer calls
            // and i only returns new chars added to the buffer from inflateFunc. Led to off by one(or two) errors.

            var n = 0;
            utfwrap = 0;


            if (stt) {
                var possbom = String.fromCharCode(buff[0]) + String.fromCharCode(buff[1]) + String.fromCharCode(buff[2]);
                VESPER.log ("possbom [", possbom, "]");
                if (possbom == "\xEF\xBB\xBF") {
                    VESPER.log ("UTF8 bytemark detected");
                    n = 3;
                }
                stt = false;
            }

            for (var j = n; j < i; j++) {
                ch = buff[j];
                if (ch >= 128) {
                    if( ch >= 0xC2 && ch < 0xE0 ) {
                        if (j < i - 1) {
                            ch = (((ch&0x1F)<<6) + (buff[++j]&0x3F));
                        } else {
                            utfwrap = 1;
                            j = i;
                            ch = undefined;
                        }
                    } else if( ch >= 0xE0 && ch < 0xF0 ) {
                        if (j < i - 2) {
                            ch = (((ch&0xFF)<<12) + ((buff[++j]&0x3F)<<6) + (buff[++j]&0x3F));
                        } else {
                            utfwrap = i - j;
                            j = i;
                            ch = undefined;
                        }
                    } else if( ch >= 0xF0 && ch < 0xF5) {
                        if (j < i - 3) {
                            var codepoint = ((ch&0x07)<<18) + ((buff[++j]&0x3F)<<12)+ ((buff[++j]&0x3F)<<6) + (buff[++j]&0x3F);
                            codepoint -= 0x10000;
                            var s = (
                                (codepoint>>10) + 0xD800,
                                (codepoint&0x3FF) + 0xDC00
                            );
                            ch = s.charAt[0];
                            ch2 = s.charAt[1];
                        } else {
                            utfwrap = i - j;
                            j = i;
                            ch = undefined;
                        }
                    }
                }


                if (quoteDelimiter && !esc && ch == qDelimVal) {
                    quotes = !quotes;
                }
                else if (!quotes && ch == lineDelimVal) {  // end of line
                    bigOut.push ((k >= fileData.ignoreHeaderLines) ? VESPER.DWCAZipParse.rowReader2 (out) : undefined);
                    k++;
                    out.length = 0;
                   // if (k % 1000 == 0 && window.opera) {
                   //     window.opera.collect();
                  // }
                } else if (ch !== undefined) {
                    out.push (ch);
                    if (ch2 !== undefined) {
                        out.push (ch2);
                        ch2 = undefined;
                    }
                }

                esc = (ch == escapeCharVal);
            }
            // VESPER.log (out.length);

            if (utfwrap) {
                //VESPER.log ("buffer ends during utf character sequence, ", utfwrap);
                for (var m = 0; m < utfwrap; m++) {
                    buff[m] = buff [i - utfwrap + m];
                }
            }
        }

        // Last line may not be returned
        if (out.length > 0) {
            bigOut.push (VESPER.DWCAZipParse.rowReader2 (out));
        }

        mt = NapVisLib.makeTime() - mt;
        VESPER.log ("Time: ", mt/1000, " secs.");
        VESPER.log ("Shared Maps: "+sharedMaps.length+", "+NapVisLib.countObjProperties (sharedMaps[1]));
        VESPER.log ("pulled out "+pb+" characters from zip");
        return bigOut;
    };



    this.setNotifyFunc = function (newNotifyFunc) {
        notifyFunc = newNotifyFunc;
    };

    this.set = function (ifileData, ireadFields) {

        fileData = ifileData;
        fieldDelimiter = ifileData.fieldsTerminatedBy.replace ("\\t", "\t").replace("\\n", "\n");    // 'cos reading in from file doesn't escape tabs or return
        lineDelimiter = ifileData.linesTerminatedBy.replace ("\\t", "\t").replace("\\n", "\n");
        quoteDelimiter = ifileData.fieldsEnclosedBy.replace ("\\\"", "\"");
        readFields = ireadFields;
        firstTrue = readFields.indexOf (true);
        fieldDelimiterVal = fieldDelimiter.charCodeAt (0);
        lineDelimVal = lineDelimiter.charCodeAt (0);
        qDelimVal = quoteDelimiter ? quoteDelimiter.charCodeAt (0) : -1;
        lineNo = 0;

        VESPER.log (VESPER.DWCAParser.sharedValuesTerms);
        // quick field lookups
        for (var n = 0; n < ifileData.invFieldIndex.length; n++) {
            var field = ifileData.invFieldIndex[n];
            var fieldData = ifileData.fieldData[field];
            defaults[n] = fieldData ? fieldData.default : undefined;
            invDiscreteTermIndex[n] = fieldData ? fieldData.discreteTermList : undefined;
            invSharedTermIndex[n] = VESPER.DWCAParser.sharedValuesTerms[field];
            if (invSharedTermIndex[n]) {
                sharedMaps[invSharedTermIndex[n]] = {};
            }
        }

        first256.length = 0;
        for (var k = 0; k < 256; k++) {
            first256.push (String.fromCharCode(k));
        }

        VESPER.log ("readFields", readFields);
        VESPER.log ("Q#", quoteDelimiter, "#");
    };
};
;/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 08/02/13
 * Time: 11:37
 * To change this template use File | Settings | File Templates.
 */

VESPER.DWCAZipParseDB = new function () {

    var fileData;
    var fieldDelimiter, fieldDelimiterVal, lineDelimiter, lineDelimVal, quoteDelimiter, qDelimVal, firstTrue, readFields, lineNo;
    var escapeCharVal = "\\".charCodeAt(0);
    var defaults = [], invDiscreteTermIndex = [], invSharedTermIndex = [];
    var pTime = 0;
    var notifyFunc;
    var first256 = [];

    var sharedMaps = [];

    var pb = 0;


    this.rowReader2 = function (strArray) {
        var field = 0;
        var fromI = 0, toI = 0;
        var use = readFields [field];
        var c;
        var str = [];
        var subStr = [];
        var strLen = strArray.length;
        var quotes = false, esc = false;

        for (var n = 0; n < strLen; n++) {
            var sstr = strArray[n];
            c = sstr ? sstr : 0;

            if (quoteDelimiter && !esc && c == qDelimVal) {
                quotes = !quotes;
            }
            if (!quotes && (c === fieldDelimiterVal || n === strLen - 1)) {
                if (use) {
                    toI = n + ((n === strLen - 1) ? 1 : 0);
                    if (fromI === toI) {    // empty field, adjacent delimiters
                        str.push (defaults[field]);
                    } else {
                        var newStr = String.fromCharCode.apply (null, strArray.slice(fromI, toI));

                        // if field is deemed to be formed of a discrete set of entries (like ranks), then reuse strings to save mem
                        var dList = invDiscreteTermIndex [field];
                        var sIndex = invSharedTermIndex [field];

                        if (dList) {
                            var mapStr = dList[newStr];
                            if (!mapStr) {
                                dList[newStr] = newStr;
                                VESPER.log ("new entry for", field, ":", newStr, newStr.length);
                            } else {
                                newStr = null;
                                newStr = mapStr;
                            }
                        }
                        else if (sIndex) {
                            var mapStr = sharedMaps[sIndex][newStr];
                            if (!mapStr) {
                                sharedMaps[sIndex][newStr] = newStr;
                            } else {
                                newStr = null;
                                newStr = mapStr;
                            }
                        }


                        pb += (toI - fromI);

                        str.push (newStr);
                    }
                }
                field++;
                use = readFields [field] | false;
                fromI = n + 1;
            }

            esc = (c == escapeCharVal);
        }
        lineNo++;

        if (lineNo % 10000 === 0 || lineNo === 10998) {
            if (notifyFunc) {
                notifyFunc (lineNo, str);
            } else {
                VESPER.log (lineNo, ": ", str);
            }
        }
        if (lineNo % 100 === 0) {
            var tt = NapVisLib.makeTime();
            if (tt - pTime > 1000) {
                pTime = tt;
                if (notifyFunc) {
                    notifyFunc (lineNo, str);
                } else {
                    VESPER.log (lineNo, ": ", str);
                }
            }
        }
        //VESPER.log (str);
        return str;
    };



    this.zipStreamSVParser2 = function (inflateFunc) {
        //return [];

        if (VESPER.alerts) { alert ("start partial parse with charcodes"); }
        var blength = 1024;
        var buff = new Array(blength);
        var out = [];
        var i;
        var bigOut = [];
        var k = 0;
        var esc = false, quotes = false;

        var stt = true;
        var ch, c;
        var utfwrap = 0;

        var mt = NapVisLib.makeTime();
        pTime = mt;

        while((i = inflateFunc (buff, utfwrap, blength - utfwrap)) > 0) {

            //if (lineNo > 10992 && lineNo < 10998) {
            //    VESPER.log (lineNo, utfwrap, "\nout", out.join(), "\nbuff", buff.length, i, buff.join(), "\n", buff[1023]);
            //}

            i += utfwrap; // cos we may have chars left over from not processing utf chars chopped between buffer calls
            // and i only returns new chars added to the buffer from inflateFunc. Led to off by one(or two) errors.

            var n = 0;
            utfwrap = 0;


            if (stt) {
                var possbom = String.fromCharCode(buff[0]) + String.fromCharCode(buff[1]) + String.fromCharCode(buff[2]);
                VESPER.log ("possbom [", possbom, "]");
                if (possbom == "\xEF\xBB\xBF") {
                    VESPER.log ("UTF8 bytemark detected");
                    n = 3;
                }
                stt = false;
            }

            for (var j = n; j < i; j++) {
                var ch = buff[j];
                if (ch >= 128) {
                    if( ch >= 0xC2 && ch < 0xE0 ) {
                        if (j < i - 1) {
                            ch = (((ch&0x1F)<<6) + (buff[++j]&0x3F));
                        } else {
                            utfwrap = 1;
                            j = i;
                            ch = undefined;
                        }
                    } else if( ch >= 0xE0 && ch < 0xF0 ) {
                        if (j < i - 2) {
                            ch = (((ch&0xFF)<<12) + ((buff[++j]&0x3F)<<6) + (buff[++j]&0x3F));
                        } else {
                            utfwrap = i - j;
                            j = i;
                            ch = undefined;
                        }
                    } else if( ch >= 0xF0 && ch < 0xF5) {
                        if (j < i - 3) {
                            var codepoint = ((ch&0x07)<<18) + ((buff[++j]&0x3F)<<12)+ ((buff[++j]&0x3F)<<6) + (buff[++j]&0x3F);
                            codepoint -= 0x10000;
                            ch = (
                                (codepoint>>10) + 0xD800,
                                (codepoint&0x3FF) + 0xDC00
                            );
                        } else {
                            utfwrap = i - j;
                            j = i;
                            ch = undefined;
                        }
                    }
                }


                if (quoteDelimiter && !esc && ch == qDelimVal) {
                    quotes = !quotes;
                }
                else if (!quotes && ch == lineDelimVal) {  // end of line
                    bigOut.push ((k >= fileData.ignoreHeaderLines) ? DWCAZipParse.rowReader2 (out) : undefined);
                    k++;
                    out.length = 0;
                } else if (ch !== undefined) {
                    out.push (ch);
                }

                esc = (ch == escapeCharVal);
            }
            // VESPER.log (out.length);

            if (utfwrap) {
                //VESPER.log ("buffer ends during utf character sequence, ", utfwrap);
                for (var m = 0; m < utfwrap; m++) {
                    buff[m] = buff [i - utfwrap + m];
                }
            }
        }

        // Last line may not be returned
        if (out.length > 0) {
            bigOut.push (DWCAZipParse.rowReader2 (out));
        }

        mt = NapVisLib.makeTime() - mt;
        VESPER.log ("Time: ", mt/1000, " secs.");

        VESPER.log ("Shared Maps: "+sharedMaps.length+", "+NapVisLib.countObjProperties (sharedMaps[1]));

        VESPER.log ("pulled out "+pb+" characters from zip");
        return bigOut;
    };



    this.setNotifyFunc = function (newNotifyFunc) {
        notifyFunc = newNotifyFunc;
    };

    this.set = function (ifileData, ireadFields) {

        fileData = ifileData;
        fieldDelimiter = ifileData.fieldsTerminatedBy.replace ("\\t", "\t").replace("\\n", "\n");    // 'cos reading in from file doesn't escape tabs or return
        lineDelimiter = ifileData.linesTerminatedBy.replace ("\\t", "\t").replace("\\n", "\n");
        quoteDelimiter = ifileData.fieldsEnclosedBy.replace ("\\\"", "\"");
        readFields = ireadFields;
        firstTrue = readFields.indexOf (true);
        fieldDelimiterVal = fieldDelimiter.charCodeAt (0);
        lineDelimVal = lineDelimiter.charCodeAt (0);
        qDelimVal = quoteDelimiter ? quoteDelimiter.charCodeAt (0) : -1;
        lineNo = 0;

        VESPER.log (VESPER.DWCAParser.sharedValuesTerms);
        // quick field lookups
        for (var n = 0; n < ifileData.invFieldIndex.length; n++) {
            var field = ifileData.invFieldIndex[n];
            var fieldData = ifileData.fieldData[field];
            defaults[n] = fieldData ? fieldData.default : undefined;
            invDiscreteTermIndex[n] = fieldData ? fieldData.discreteTermList : undefined;
            invSharedTermIndex[n] = VESPER.DWCAParser.sharedValuesTerms[field];
            if (invSharedTermIndex[n]) {
                sharedMaps[invSharedTermIndex[n]] = {};
            }
        }

        first256.length = 0;
        for (var k = 0; k < 256; k++) {
            first256.push (String.fromCharCode(k));
        }

        this.tryDB();

        VESPER.log ("readFields", readFields);

    };

    this.tryDB = function () {
        function data(){
            return {
                "bookName": "bookName-" + parseInt(Math.random() * 100),
                "price": parseInt(Math.random() * 1000),
                "checkedOut": new Date()
            }
        }

        var dbName = "MartZip5";
        var storeName = "OldBookList";


        var dbDeleteRequest = indexedDB.deleteDatabase(dbName);
        dbDeleteRequest.onsuccess = function(e){};


        var wot = $.indexedDB(dbName, {
            "schema": {
                1: function(versionTransaction){
                    var objStore = versionTransaction.createObjectStore(storeName, {
                       "keyPath": "id",
                       "autoIncrement": true
                    });
                    //objStore.createIndex ("price");
                    //VESPER.log ("Made", objStore, typeof objStore);
                    //versionTransaction.done();
                }
            }
        }).done (function(e) { VESPER.log ("setup done"); doTrans(); });
        VESPER.log ("WOT", wot);



        function doTrans () {
            var transaction = $.indexedDB(dbName).transaction([storeName], $.indexedDB.IDBTransaction.READ_WRITE);
            var i = 0;
            var ostore;

            function putNext() {
                if (i<1000000) {
                    if (i % 5000 == 0) {
                        VESPER.log ("adding record", i);
                    }
                    ostore.add(data()).done (putNext);
                    ++i;
                } else {   // complete
                    VESPER.log('populate complete');
                    //callback();
                }
            }


            transaction.progress(function(t){
                VESPER.log ("Trans", t, t.objectStore("OldBookList"));
                ostore = t.objectStore("OldBookList");
                putNext();
                /*
                ostore.add(data())
                    .then(function(event) { console.info ("add done then", event); }, function(event) { VESPER.log ("add fail then", event); })
                    .done(function(event) { console.info ("add done", event); })
                    .fail(function(event) { VESPER.log ("add fail", event); })
                ;
                */
            });


            transaction.then(function(event) { VESPER.log ("done then", event); }, function(event) { VESPER.log ("fail then", event); });
            transaction.done(function(event) { VESPER.log ("done", event); });
            transaction.fail(function(event) { VESPER.log ("fail", event); });
        }
    }
};
;// TimeLine



VESPER.BarChart = function(divid) {
	
	var svg;	// top level svg
	var timelineG; // matrix rectangle (i.e. not the axes)
    var xaxis = d3.svg.axis();
	
	var dims;

    this.format = undefined;
    this.barClass = "countBin";
    this.childScale = d3.scale.linear();
    var logCountScale = d3.scale.log();
    var linearCountScale = d3.scale.linear();
    var currentCountScale = logCountScale;

    var domainLimits = [undefined, undefined];
    var binned, selBinned;
	
	var self;
    var model;

	var zoomObj = d3.behavior.zoom();	// zoom object, need to keep as we reference it later. calling d3.behavior.zoom() again gets us a different object/function
	zoomObj.scaleExtent ([1.0, 4.0]); // constrain zooming


	var exitDur = 400, updateDur = 1000, enterDur = 400;
	var selected = {};
	
	var ffields = {};

    var firstLayout = true;

    var margin = {left: 40, right: 20, top : 15, bottom: 40};

    this.minBarWidth = 5;
    this.toNearest = 1;
    this.divisions = [1, 2, 10, 100];

    var sharedAttrs = function (group) {
        var wh = dims[1] - margin.bottom;
        group
            .attr("x", function(d) { return self.childScale (d.start); })
            .attr("width", function (d) { return self.childScale (d.end) -  self.childScale (d.start); })
            .attr ("y", function(d) { return currentCountScale (d.count + 1); })
            .attr ("height", function(d) { return wh - currentCountScale (d.count + 1); })
            .style ("opacity", 1)
        ;
    };


    this.set = function (fields, mmodel) {
        ffields.keyField = fields.identifyingField;
        ffields.dateField = fields.dateField;
        ffields.nameField = fields.nameField;
        ffields.realField = fields.realField;
        dims = NapVisLib.getWidthHeight (d3.select(divid).node());
        model = mmodel;
    };


    this.go = function () {
		self = this;
		
		var svg = d3.select(divid).selectAll("svg").data([0]);

        svg.enter()
			.append("svg:svg")
			.attr("class", "visContainer")
			.attr("pointer-events", "all")
		;

        svg = d3.select(divid).select("svg");
		
		timelineG = svg
			.append ("svg:g")
			.attr("class", "treeSVG")
		;

        var controls = d3.select(divid).select(".barChartControl");
        VESPER.log ("controls", controls);
        var noHashId = divid.substring (1);
        if (controls.empty()) {
            var butdiv = d3.select(divid).append("span")
                .attr("class", "visControl")
                .attr("id", noHashId+"Controls")
            ;

            var choices = {regular: self.uncalcCumulative, cumulative: self.calcCumulative};
            var spans = butdiv.selectAll("span.fieldGroup")
                .data (d3.entries(choices), function(d) { return d.key;})
            ;

            spans.enter()
                .append("span")
                .attr ("class", "fieldGroup")
            ;

            // spans now has the entered spans
            spans.append("input")
                .attr("type", "radio")
                .attr("id", function(d) { return noHashId+ d.key; })
                .attr("name", "chartYType")
                .property ("checked", function(d) { return d.key == "regular"; })
                .on ("change", function(d) {
                    var barDataSets = [binned.bins, selBinned.bins];
                    var barDataTypes = ["unselected", "selected"];
                    for (var k = 0; k < barDataSets.length; k++) {
                        (d.value)(barDataSets[k]);
                        self.redraw (timelineG.selectAll("."+self.barClass+"."+barDataTypes[k])
                            .data(barDataSets[k], function(d) { return Math.floor (d.start); }),
                            barDataSets[k]
                        );
                    }
                })
            ;
            spans.append("label")
                .attr("for", noHashId+"count")
                .text (function(d) { return d.key; })
            ;

            $(function() {
                $( divid+"Controls" ).buttonset();
            });

            $(function() {
                $( divid+"Controls" ).draggable();
            });

        }

        self.childScale.range([margin.left, dims[0] - margin.right]);
        makeBins();


        var rangeg = svg.select("g.rangeHolder");
        if (rangeg.empty()) {
            svg.append ("g")
                .attr ("class", "rangeHolder")
                .attr ("transform", "translate(0,"+(dims[1] - 20)+")")
            ;
        }
        rangeg = svg.select("g.rangeHolder");

        var rangeSlider = NapVisLib.rangeSlider();
        rangeSlider(rangeg);
        rangeSlider
            .scale(self.childScale)
            .dragEndFunc (function (r, rscale) {
                domainLimits = [
                    self.wrapDataType (makeToNearest (rscale.invert (r[0]))),
                    self.wrapDataType (makeToNearest (rscale.invert (r[1])))
                ];
                makeBins();
                self.update();
            })
            .tooltipTemplates ({
                "min": function (r,s) { return "min: "+self.wrapDataType (makeToNearest (s.invert (r[0]))) },
                "max": function (r,s) { return "min: "+self.wrapDataType (makeToNearest (s.invert (r[1]))) },
                "bar": function (r,s) { return null; }
            })
            .update()
        ;

		self.update ();
	};

    function makeBins () {
        //var binCount = Math.ceil ((self.childScale.range()[1] - self.childScale.range()[0]) / self.minBarWidth);
        binned = self.chunkInfo (model, model.getData(), ffields/*, undefined, binCount, true*/);
        self.childScale.domain (binned.extremes);
        VESPER.log ("bin stuff", binned.extremes, binned);
    }

	function getNode (id) {
        return model.getNodeFromId (id);
    }


    function makeToNearest (val) {
        return Math.round (val / self.toNearest) * self.toNearest;
    }

    function makeToNearestInterval (val) {
        return Math.round (val / self.toNearest) * self.toNearest;
    }


	this.update = function () {

        selBinned = self.chunkInfo (model, model.getData(), ffields, /*undefined, binned.bins.length - 1, true,*/
            function (key, data) { return model.getSelectionModel().contains (key)});

        var bins = binned.bins;
        VESPER.log ("SEL BINS", selBinned);
        var maxh = d3.max(bins, function(d) { return d.count + 1; });
        VESPER.log ("maxh", maxh);
        var wh = dims[1] - margin.bottom;
        currentCountScale.domain([1, maxh]).range ([wh, margin.top]).nice();

        var exists = timelineG.select("g.valueAxis");
        if (exists.empty()) {
            exists = timelineG.append("g")
                .attr("class", "valueAxis vesperAxis")
                .attr ("transform", "translate (0,"+(dims[1]-margin.bottom)+")")
            ;
        }
        exists.call(d3.svg.axis()
            .scale(self.childScale)
            .orient("bottom")
            .tickFormat (self.format)
        );

        var barDataSets = [bins, selBinned.bins];
        var barDataTypes = ["unselected", "selected"];
        for (var k = 0; k < barDataSets.length; k++) {
            VESPER.log ("bins", barDataSets[k]);
            var barClass = self.barClass;// + barDataTypes[k];
            var visBins = timelineG.selectAll("."+barClass+"."+barDataTypes[k]).data(barDataSets[k], function(d) { return Math.floor (d.start); });

            visBins.exit()
                .on ("click", null)
                .on ("mouseout", null)
                .on ("mouseover", null)
                .on ("contextmenu", null)
                //.select("title")
               //     .text ("")
            ;
            visBins.exit().remove();

            self.redraw (visBins, barDataSets[k]); // redraw current selection (i.e. ones that aren't exiting/ yet to enter)
            var delay = visBins.empty() ? 0 : 500;

            visBins.enter()
                .append("svg:rect")
                .attr("class", barClass+" "+barDataTypes[k])
                .style ("opacity", 0)
                .on ("click", function(d) {
                })
                .on("contextmenu", function(d) {
                    //handle right click
                    VESPER.log ("hello right click");
                    model.getSelectionModel().clear();
                    var arr = self.returnMatches (model, ffields, d.start, d.end);
                    model.getSelectionModel().addAllToMap (arr);
                    //stop showing browser menu
                    d3.event.preventDefault();
                })
                .on ("mouseover", function(d) {
                    d3.select(this).classed("highlight", true);
                    var selected = d3.select(this).classed("selected");
                    VESPER.tooltip.updateText(selected ? "Selected" : "All", self.makeTitle (d));
                    VESPER.tooltip.updatePosition (d3.event);
                })
                .on ("mouseout", function(d) {
                    d3.select(this).classed("highlight", false);
                    VESPER.tooltip.setToFade();
                })
                .transition()
                .delay (delay)
                .duration(500)
                .call(sharedAttrs)
                //.append ("svg:title")
            ;
        }
	};


    this.redraw = function (currentDataSelection, barData) {
        var maxh = d3.max(barData, function(d) { return d.count + 1; });
        var wh = dims[1] - margin.bottom;
        currentCountScale/*.domain([1, maxh])*/.range ([wh, margin.top]).nice();
        var exists2 = timelineG.select("g.countAxis");
        if (exists2.empty()) {
            exists2 = timelineG.append("g")
                .attr("class", "countAxis vesperAxis")
                .attr ("transform", "translate ("+(margin.left-1)+",0)")
            ;
        }
        exists2.call(xaxis
            .scale(currentCountScale)
            .orient("left")
            .ticks (5, d3.format(",d"))
        );

        VESPER.log ("cds", currentDataSelection);

        currentDataSelection
            .transition()
            .duration(500)
            .call(sharedAttrs)
        ;
    };

    this.makeTitle = function (d) {};

    this.updateVals = this.update;

    this.chunkInfo = function (model, data, fields, /*binSize, binCount, round,*/ includeFunc) {
        var chart = self;
        var min = domainLimits[0];
        var max = domainLimits[1];
        var hardMin = (min !== undefined);
        var hardMax = (max !== undefined);
        //VESPER.log ("fmm", min, max, hardMin, hardMax);
        var bins = [];
        var count = 0, mint, maxt;

        function findMinMax () {
            if (!hardMin || !hardMax) {
                for (var key in data) {
                    if (data.hasOwnProperty (key)) {
                        var val = chart.getVal (model, data, key, fields);
                        if (val !== undefined) {
                            val = chart.wrapDataType (val, key);
                            var uval = chart.unwrapDataType (val);
                            count++;

                            if (!hardMin && (min === undefined || mint > uval)) {
                                min = val;
                                mint = chart.unwrapDataType (min);
                            }
                            if (!hardMax && (max === undefined || maxt < uval)) {
                                max = val;
                                maxt = chart.unwrapDataType (max);
                            }
                        }
                    }
                }
            }
        }
        findMinMax();
        //VESPER.log ("Counted "+count+" properties.");
        //VESPER.log ("data", data[0], data[1], data[2]);

        if (min !== undefined && max !== undefined) {
            var mind = chart.unwrapDataType (min); //min.getTime() / this.msinaday;
            var maxd = chart.unwrapDataType (max); //max.getTime() / this.msinaday;
            var domRange = (Math.ceil (maxd / self.toNearest) * self.toNearest) - (Math.floor (mind / self.toNearest) * self.toNearest);
            VESPER.log ("MINS", maxd, mind, min, max, domRange, self.childScale.range());

            var newBarVals = chart.makeBarSizes (self.childScale.range()[1] - self.childScale.range()[0], domRange);
            var binSize = newBarVals.newBinSize;
            var binCount = newBarVals.newBinCount;
            VESPER.log ("bb", binSize, binCount);
            var fmind = Math.floor (mind / binSize) * binSize;

            for (var n = 0; n < binCount + 1; n++) {
                var size = fmind + (binSize * n);
                bins[n] = {count:0, start: chart.wrapDataType (Math.max (size, mind)), end: chart.wrapDataType (Math.min (size + binSize, maxd + binSize))};
            }

            function assignDataToBin () {
                var t = 0;
                for (var key in data) {
                    if (data.hasOwnProperty (key)) {
                        if (!includeFunc || includeFunc (key, data)) {   // only add the data if it's to be included according to includeFunc (if includeFunc exists)
                            var val = chart.getVal (model, data, key, fields);
                            if (val !== undefined) {
                                val = chart.unwrapDataType (chart.wrapDataType (val, key));
                                if (!isNaN(val) && val >= mind) {
                                    var bi = Math.floor ((val - fmind) / binSize); // this means items are binned as start <= item < end for each bin (so end is that start of the next bin)
                                    if (0 <= bi && bi <= binCount) {
                                        bins[bi].count++;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            assignDataToBin ();
        }

        return {extremes:[min,max],bins:bins};
    };


    this.returnMatches = function (model, fields, min, max) {
        var arr = [];
        var data = model.getData();

        for (var key in data) {
            if (data.hasOwnProperty (key)) {
                var val = self.getVal (model, data, key, fields);
                if (val !== undefined) {
                    val = self.wrapDataType (val, key);
                    if (min <= val && val < max) {
                        arr.push (key);
                    }
                }
            }
        }
        VESPER.log ("Arr", min, max, arr);
        return arr;
    };

    this.calcCumulative = function (bins) {
        VESPER.log ("Bins", bins);
          var sofar = 0;
          for (var n = 0; n < bins.length; n++) {
              var add = bins[n].count;
              bins[n].count += sofar;
              sofar += add;
          }
    };


    this.makeBarSizes = function (width, range) {
        var barDomainWidth = (range / width) * self.minBarWidth;
        var binSize;
        for (var n = 0; n < self.divisions.length; n++) {
            if (self.divisions[n] > barDomainWidth || n === self.divisions.length - 1) {
                binSize = self.divisions[n];
                break;
            }
        }

        VESPER.log ("bdw: ", barDomainWidth, range, width);

        var binCount = Math.ceil (range / binSize);
        return {newBinSize: binSize, newBinCount: binCount};
    };


    this.uncalcCumulative = function (bins) {
        var last = 0;
        for (var n = 0; n < bins.length; n++) {
            var sub = bins[n].count;
            bins[n].count -= last;
            last = sub;
        }
    };

    this.destroy = function () {
        DWCAHelper.recurseClearEvents (d3.select(divid));

        var visBins = timelineG.selectAll(self.barClass);
        visBins.remove();

        model.removeView (self);
        model = null;
        DWCAHelper.twiceUpRemove(divid);
    }
};


VESPER.TaxaDistribution = function (div) {
    var chart = new VESPER.BarChart (div);
    //chart.makeTitle = function (d) {return "Subtaxa: "+Math.ceil(d.start)+" to "+Math.floor(d.end)+"<br>Count: "+d.count; };
    chart.makeTitle = function (d) {
        var singleVal = ((d.end - d.start) == 1);
        return "Subtaxa: "+d.start+(singleVal ? "" : " to "+(d.end - 1))+"<br>Count: "+d.count;
    };
    chart.wrapDataType = function (d) { return d; };
    chart.unwrapDataType = function (o) { return o; };
    chart.getVal = function (model, data, key, fields) {
        var taxaData = model.getTaxaData (data[key]);
        if (taxaData[fields.realField] == taxaData[fields.keyField]) {
            var node = model.getNodeFromID(key);
            var subTaxa = model.getSubTaxa(node);
            return (subTaxa ? subTaxa.length : 0);
        }
        else return undefined;
    };
    chart.divisions = [1,2,10];

    return chart;
};



VESPER.TimeLine = function (div) {
    var chart = new VESPER.BarChart (div);
    var timeCache = {};
    chart.childScale = d3.time.scale();
    chart.barClass = "timeBin";
    chart.format = d3.time.format ("Y%Y"); // d3.time.format.iso;
    chart.makeTitle = function (d) {return d.start.toString()+"<br>to "+ d.end.toString()+"<br>Records: "+d.count; };
    chart.wrapDataType = function (d, key) {
        var val = (key === undefined ? undefined : timeCache[key]);
        return (val === undefined ? new Date (d) : val);
    };
    chart.unwrapDataType = function (date) { return date.getTime(); };
    chart.getVal = function (model, data, key, fields) {
        var val = model.getTaxaData(data[key])[fields.dateField];
        if (!timeCache[key] && val !== undefined) {
            timeCache[key] = new Date (val);
        }
        return val;
    };
    var oneDayInMs = 24 * 60 * 60 * 1000;
    chart.toNearest = oneDayInMs * 7; // to nearest week
    // approx divisions for one day, week, season, year, decade. Not exactly aligned fanks to leap years.
    chart.divisions = [oneDayInMs, oneDayInMs * 7, oneDayInMs * 91.3125, oneDayInMs * 365.25, oneDayInMs * 365.25 * 10];

    return chart;
};
;/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 13/06/13
 * Time: 14:49
 * To change this template use File | Settings | File Templates.
 */
var View = function() {


};;/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 17/06/13
 * Time: 14:59
 * To change this template use File | Settings | File Templates.
 */

function Model (metaData, data) {
    Model.prototype = {
        getNodeFromID: function (id) {},

        getTaxaData: function (node) {},
        getSubTaxa: function (node) {}
    };

}


function DWCAModel (metaData, data) {
    this.getMetaData = function (){ return this.metaData; };
    // In an implicit taxonomy, data.records and data.tree are the same object, so getData and getTaxonomy return the same
    // In an explicit taxonomy i.e. a tree of specimens, data.records is the specimens, and data.tree is the taxonomy we generated on top.
    this.getData = function (){ return this.data.records; };
    this.getTaxonomy = function () { return this.data.tree; };
    this.getRoot = function (){ return this.data.root; };

    var viewCount = 0;
    var sessionModelViewID = 0;
    var selectionModel = new SharedSelection ();

    this.getSelectionModel = function () { return selectionModel; };

    // Has to be here, as selectionModel has no access to model
    this.invertSelection = function () {
        var d = this.getData();
        var s = this.getSelectionModel();
        var arr = [];
        for (var iid in d) {
            if (!s.contains(iid)) {
                arr.push (iid);
            }
        }
        s.clear ();
        s.addAllToMap (arr);
    };

    this.getExtraData = function (node) {
        return node[VESPER.DWCAParser.EXT];
    };

    this.getTaxaData = function (node) {
        return node[VESPER.DWCAParser.TDATA];
    };

    this.getSubTaxa = function (node) {
        return node[VESPER.DWCAParser.TAXA];
    };

    this.getSpecimens = function (node) {
        return node[VESPER.DWCAParser.SPECS];
    };

    this.getDescendantCount = function (node) {
        return node.dcount;
    };

    this.getSelectedDescendantCount = function (node) {
        return node.sdcount;
    };

    this.getLeafValue = function (node) {
        var s = this.getSpecimens(node);
        return s ? s.length : 1;
    };

    this.getNodeFromID = function (id) {
        return this.getData()[id] || this.getTaxonomy()[id];
    };

    this.addView = function (view) {
        selectionModel.addSingleVis (view);
        viewCount++;
        sessionModelViewID++;
    };

    this.removeView = function (view) {
        selectionModel.removeVis (view);
        viewCount--;
    };

    this.getViewCount = function () {
        return viewCount;
    };

    this.getNextSessionModelViewID = function () {
        return sessionModelViewID;
    };

    this.update = function () {
        selectionModel.update();
    };

    this.countSelectedDesc = function (taxon, idx) {
        var taxa = this.getSubTaxa (taxon);
        var spec = this.getSpecimens (taxon);

        if (taxa != undefined || spec != undefined) {
            taxon.sdcount = 0;

            if (taxa != undefined) {
                for (var n = 0, len = taxa.length; n < len; n++) {
                    taxon.sdcount += this.countSelectedDesc (taxa[n], idx);
                }
            }

            if (spec != undefined) {
                for (var n = 0, len = spec.length; n < len; n++) {
                    taxon.sdcount += this.getSelectionModel().contains (this.getTaxaData(spec[n])[idx]) ? 1 : 0;
                }
            }
        }

        return (taxon.sdcount || 0) + ((this.getSelectionModel().contains (this.getTaxaData(taxon)[idx]) ? 1 : 0));
    };

    this.data = data;
    this.metaData = metaData;
}
;/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 17/09/13
 * Time: 13:50
 * To change this template use File | Settings | File Templates.
 */




VESPER.demo = function (files) {

    VESPER.tooltip.init();


    var nameLabelField = {result: null};

    var visChoiceData = [
        {title:"VisChoices", multiple: false, attList: ["unachievable"], matchAll: true, image: VESPER.imgbase+"tree.png", height: "null", width: "200px",
            newVisFunc: function (div) { return new VESPER.VisLauncher (div);},
            setupFunc: function (coreFieldIndex) {return {"nameField":coreFieldIndex[nameLabelField.result], "visChoiceData":visChoiceData}}
        },
        {title:"Implicit Taxonomy", multiple: true,  attList: VESPER.DWCAParser.neccLists.impTaxonomy, matchAll: true, image: VESPER.imgbase+"tree.png", height: "600px",
            newVisFunc: function (div) { return new VESPER.Tree (div);},
            setupFunc: function (coreFieldIndex) {return {"nameField":coreFieldIndex[nameLabelField.result], "rankField":coreFieldIndex["taxonRank"]}}
        },
        {title:"Explicit Taxonomy", multiple: true, attList: VESPER.DWCAParser.neccLists.expTaxonomy, matchAll: false, image: VESPER.imgbase+"tree.png", height: "600px",
            newVisFunc: function (div) { return new VESPER.Tree (div);},
            setupFunc: function (coreFieldIndex) {return {"nameField":coreFieldIndex[nameLabelField.result], "rankField":coreFieldIndex["taxonRank"]}}
        },
        {title:"Map", multiple: true, attList: VESPER.DWCAParser.neccLists.geo, matchAll: true, image: VESPER.imgbase+"world.png", height: "400px",
            newVisFunc: function (div) { return new VESPER.DWCAMapLeaflet (div);},
            setupFunc: function (coreFieldIndex) {return {"latitude":coreFieldIndex["decimalLatitude"], "longitude":coreFieldIndex["decimalLongitude"], "nameField":coreFieldIndex[nameLabelField.result]}}
        },
        {title:"Timeline", multiple: true, attList: VESPER.DWCAParser.neccLists.basicTimes, matchAll: true, image: VESPER.imgbase+"geo.png", height: "200px",
            newVisFunc: function (div) { return VESPER.TimeLine (div);},
            setupFunc: function (coreFieldIndex) { return {"dateField":coreFieldIndex["eventDate"], "nameField":coreFieldIndex[nameLabelField.result]}}
        },
        {title:"Sanity Check", multiple: true, attList: [], matchAll: false, image: VESPER.imgbase+"geo.png", height: "400px",
            newVisFunc: function (div) { return new VESPER.Sanity (div);},
            setupFunc: function (coreFieldIndex) { return undefined; }
        },
        {title:"Taxa Distribution", multiple: true, attList: VESPER.DWCAParser.neccLists.impTaxonomy, matchAll: true, image: VESPER.imgbase+"tree.png", height: "200px",
            newVisFunc: function (div) { return VESPER.TaxaDistribution (div);},
            setupFunc: function (coreFieldIndex) { return {"realField":coreFieldIndex["acceptedNameUsageID"], "nameField":coreFieldIndex[nameLabelField.result], "rankField":coreFieldIndex["taxonRank"]}}
        },
        {title:"Search Box", multiple: true, attList: [], matchAll: false, image: VESPER.imgbase+"geo.png", height: "150px", width: "200px",
            newVisFunc: function (div) { return new VESPER.FilterView (div);},
            setupFunc: function (coreFieldIndex) { return {"nameField":coreFieldIndex[nameLabelField.result]} ;}
        }
    ];
    var visTiedToSpecificAttrs = visChoiceData.slice (0, 6);

    var model;
    var meta;

    function getMeta () { return meta; }


    function showPanelsOnLoad (d) {
        DWCAHelper.divDisplay(["#showOnZipLoadDiv"], "none");
        DWCAHelper.divDisplay(["#selDiv"], "block");
        d3.select("#filenamePlaceholder").html(d.name);
        d3.select("#filesizePlaceholder").html("...");
        d3.select("#dynamicSelectDiv").selectAll("span input").property("checked", false);
    }

    function setChoices (choiceData) {
        var choices = d3.select("#chooseFileDiv").selectAll("button").data (choiceData);
        choices.enter()
            .append ("button")
            .attr ("class", "choice")
            .attr ("type", "button")
            .attr ("id", function(d) { return d.name;})
            .text (function(d) { return d.name; })
            .on ("click", function(d) {
                NapVisLib.xhr2 (d.file, 'text/plain; charset=x-user-defined',
                    function (xhr) {
                        var bufferOrString = NapVisLib.getText (xhr);
                        NapVisLib.showProps (xhr);
                        asyncSetUpFromMeta (bufferOrString);
                    }
                );
                showPanelsOnLoad (d);
            })
        ;

        NapVisLib.makeFileLoadButton (d3.select("#chooseFileDiv"), "choice", "localLoader", "Load",
            function (file, content) {
                showPanelsOnLoad (file);
                asyncSetUpFromMeta (content);
            }
        );
    }




    function setPresets (visboxes, radioChoices) {
        var checkListParent = d3.select("#listDiv");

        var bdiv = d3.select("#dynamicSelectDiv");
        for (var n = 0; n < visboxes.length; n++) {
            var data = visboxes[n];
            var spanSelection = DWCAHelper.addCheckbox (bdiv, data, "fieldGroup");
            DWCAHelper.configureCheckbox (spanSelection, checkListParent, data.attList, function() { return getMeta(); });
        }

        var ldiv = d3.select ("#labelSelectDiv");
        for (var n = 0; n < radioChoices.length; n++) {
            var data = radioChoices[n];
            var elem = DWCAHelper.addRadioButton (ldiv, data, "nameChoice", "nameChoice", true);
            DWCAHelper.configureRadioButton (elem, checkListParent, nameLabelField, function() { return getMeta(); });
        }

          var setVisOptionBoxes = function (bool) {
            var cboxes = d3.select("#dynamicSelectDiv").selectAll(".fieldGroup input");
            cboxes = cboxes.filter (function() {return d3.select(this).style("display") != "none"; });
            cboxes.property ("checked", bool);
            if (!bool) {
                var rbuts = d3.select("#labelSelectDiv").selectAll(".nameChoice input");
                rbuts = rbuts.filter (function() {return d3.select(this).style("display") != "none"; });
                rbuts.property ("checked", bool);
                nameLabelField.result = null;
            }
          };

        DWCAHelper.addHelperButton (d3.select("#advancedSelectDiv"), checkListParent, "Remove Verbose Fields", VESPER.DWCAParser.flabbyLists.wordyList,
            false, null, "selButtonStyle listCon", function() { return getMeta(); });
        var excepFunc = function exceptionFunc (d, i) { return i == 0; };
        d3.select("#allButton").on("click", function(d) {
		DWCAHelper.setAllFields (checkListParent, true, undefined, excepFunc, getMeta()); 
		setVisOptionBoxes (true); 
		return false; 
	  });
        d3.select("#clearButton").on("click", function(d) { 
		DWCAHelper.setAllFields (checkListParent, false, undefined, excepFunc, getMeta());
		setVisOptionBoxes (false); 
		return false;
	  });
        var advSelFunc = function (d) {
            var val = d3.select(this).property("checked") ? "block" : "none";
            DWCAHelper.divDisplay(["#advancedSelectDiv", "#listDiv"], val);
            return false;
        };
        var advCheckbox = DWCAHelper.addCheckbox (d3.select("#advRevealPlaceholder"), {title:"Advanced Options", image: null}, "showAdv");
        advCheckbox.select("input").on("click", advSelFunc);
    }





    function proceed (zip, mdata) {
       // var selectedStuff = DWCAHelper.getAllSelectedFilesAndFields (d3.select("div#selDiv"));
        var selectedStuff = DWCAHelper.getAllSelectedFilesAndFields (mdata);
        var fileRows = {};
        function notifyFunc (str, obj) {
            d3.select("#notifyStatusID").html(str+":"+obj);
            d3.select("#loadStatDiv").attr("offsetWidth");
        }
        VESPER.log ("ZIP:", zip);
        //DWCAZipParse.setNotifyFunc (notifyFunc);

        // read selected data from zip
        $.each (selectedStuff, function (key, value) {
            var fileData = mdata.fileData[key];
            var fileName = fileData.fileName;
            var readFields = NapVisLib.newFilledArray (fileData.invFieldIndex.length, false);

            $.each (value, function (key, value) {
                readFields [fileData.fieldIndex[key]] = value;
            });

            VESPER.log ("readFields", readFields);
            VESPER.DWCAZipParse.set (fileData, readFields);
            zip.zipEntries.readLocalFile (fileName, VESPER.DWCAZipParse.zipStreamSVParser2);
            fileRows[fileData.rowType] = zip.zipEntries.getLocalFile(fileName).uncompressedFileData;
            VESPER.DWCAParser.updateFilteredLists (fileData, readFields);
        });

        if (VESPER.alerts) { alert ("mem monitor point 1"); }

        // make taxonomy (or list)
        model = new DWCAModel (mdata, VESPER.DWCAParser.setupStrucFromRows (fileRows, mdata));
        VESPER.log ("MODEL", model);
        if (VESPER.alerts) { alert ("mem monitor point X"); }

        DWCAHelper.divDisplay(["#selDiv"], "none");
        DWCAHelper.divDisplay(["#allVisDiv"], "block");

        // the replace regex rips out nonalphanueric strings as dots and hashes cause trouble when passing the name as an id to d3selectors
        model.name = d3.select("#filenamePlaceholder").text().replace(/\W/g, '');
        (new VESPER.VisLauncher()).makeVis (visChoiceData[0], model);
        model = null;
        meta = null;
    }


    var asyncSetUpFromMeta = function (bufferOrStringData) {
        d3.select("#filesizePlaceholder").html("zipped: "+(bufferOrStringData.length | bufferOrStringData.byteLength)+" bytes");

        if (VESPER.alerts) { alert ("check memory use in task manager"); }
        var accessZip = VESPER.DWCAParser.accessZip (bufferOrStringData, "meta.xml");
        var metaData = accessZip.meta;
        meta = metaData;
        var zip = accessZip.jszip;

        DWCAHelper.makeFieldSelectionBoxes (metaData, d3.select("#listDiv"));  // Makes checkboxes for all fields (normally hidden)
        d3.select("#loadButton").on("click", null).on("click", function(d) { proceed (zip, metaData); return false;});

        var checkBoxParentSelection = d3.select("#listDiv");
        var visCheckBoxGroup = d3.select("#dynamicSelectDiv").selectAll("span.fieldGroup");
        VESPER.log (visCheckBoxGroup);
        visCheckBoxGroup
            .property ("checked", false)
            .style ("display", function(d) {
                var poss = DWCAHelper.fieldListExistence (metaData, d.attList, d.matchAll);
                return poss ? null : "none";
            })
        ;

        var nameChoiceGroup = d3.select("#labelSelectDiv").selectAll("label.nameChoice");
        VESPER.log (nameChoiceGroup);
        nameChoiceGroup
            .property ("checked", false)
            .style ("display", function(d) {
                var poss = DWCAHelper.fieldListExistence (metaData, [d], true);
                return poss ? null : "none";
            })
        ;

        var first = true;
        nameChoiceGroup.each (function(d) {
            var disp = d3.select(this).style ("display");
            if (disp != "none" && first) {
                first = false;
                // this is cross-browser
                var click_ev = document.createEvent("MouseEvent");
                click_ev.initEvent("click", true /* bubble */, true /* cancelable */);
                this.dispatchEvent(click_ev);
                //this.click(); // this wasn't (didn't work in safari)
            }
        });

        DWCAHelper.divDisplay (["#showOnZipLoadDiv"], "block");
    };

    setChoices (files);
    setPresets (visTiedToSpecificAttrs, VESPER.DWCAParser.labelChoiceData);
};
;var DWCAHelper = new function () {

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
};;VESPER.DWCAMapLeaflet = function (divid) {

	var dims;
    var self = this;
	var dividsub = divid.substring(1);
	
	var exitDur = 400, updateDur = 1000, enterDur = 400;
	
	var keyField, longField, latField, nameField;
    var model;
	
	var struc;
	var dwcaid2Marker = {};
	var markerGroup;
	var map;

    var curSelLayer;

    var maxIconHeight = 60;
    var heightMultiplier = 5;

    var selIcon = L.icon({
        iconUrl: VESPER.imgbase+'selMarker.png',
        shadowUrl: '../lib/leafletjs/images/marker-shadow.png',

        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],

        shadowAnchor: [4, 62] // the same for the shadow
    });

    var oldIcon = new L.Icon.Default();

    this.set = function (fields, mmodel) {
        keyField = fields.identifyingField;
        longField = fields.longitude;
        latField = fields.latitude;
        nameField = fields.nameField;
        dims = NapVisLib.getDivDims (divid);
        model = mmodel;
        VESPER.log ("set model for map", model);
    };
	
	
	this.go = function () {

        VESPER.log ("map go");
        if (!map) {
            // create the tile layer with correct attribution
            var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            var osmAttrib='Map data � OpenStreetMap contributors';
            var osm = new L.TileLayer(osmUrl, {minZoom: 1, maxZoom: 19, attribution: osmAttrib});

            d3.select(divid).style("overflow", "hidden"); // gets rid of scrollbars when the map tiles go over the edges of the display
            map = L.map(dividsub);//.setView([51.505, -0.09], 13); // set view dependent on markers now, drawControl is for draw toolbar
            map.addLayer (osm);

            VESPER.log ("size", map.getSize());

            // Adds leaflet.draw functionality
            var drawControl = new L.Control.Draw({
                draw: {
                    marker: false,
                    polyline: false
                }
            });
            map.addControl (drawControl);

            map.on('draw:created', function (e) {
                var type = e.layerType,
                    layer = e.layer;

                var sel = [];
                var i = 0;

                if (type === 'circle') {
                    VESPER.log ("circle", e);
                    var cll = e.layer._latlng;
                    var rad = e.layer._mRadius;
                    markerGroup.eachLayer(function (layer) {
                        i++;
                        var ll = layer.getLatLng();
                        if (cll.distanceTo (ll) <= rad) {
                            sel.push(layer.extId);
                            //VESPER.log ("specimen ",model.getTaxaData (model.getNodeFromID (layer.extId)),"within circle");
                        }
                    });
                }
                else if (type === 'rectangle') {
                    VESPER.log ("rectangle", e);
                    var clls = e.layer._latlngs;
                    var bounds = new L.LatLngBounds (clls[0], clls[2]);
                    markerGroup.eachLayer(function (layer) {
                        i++;
                        var ll = layer.getLatLng();
                        if (bounds.contains (ll)) {
                            sel.push(layer.extId);
                            //VESPER.log ("specimen ",model.getTaxaData (model.getNodeFromID (layer.extId)),"within rectangle");
                        }
                    });
                }
                else if (type === 'polygon') {
                    VESPER.log ("polygon", e);
                    var clls = e.layer._latlngs;
                    var bb = new L.LatLngBounds (clls);
                    markerGroup.eachLayer(function (layer) {
                        i++;
                        var ll = layer.getLatLng();
                        if (containsLatLng (clls, bb, ll)) {
                            sel.push(layer.extId);
                            //VESPER.log ("specimen ",model.getTaxaData (model.getNodeFromID (layer.extId)),"within polygon");
                        }
                    });
                }

                //if (sel.length > 0) {

                    if (curSelLayer) {
                        map.removeLayer (curSelLayer);
                    }

                    VESPER.log (sel.length, "specimens within", type);

                    // Do whatever else you need to. (save to db, add to map etc)
                    map.addLayer(layer);
                    curSelLayer = layer;

                    model.getSelectionModel().clear();
                    model.getSelectionModel().addAllToMap (sel);
                //}
            });

            markerGroup = new L.MarkerClusterGroup (
                {
                    iconCreateFunction: function(cluster) {
                        var clog = Math.log (cluster.getChildCount() + 1);
                        var height = 10 + (clog * heightMultiplier);
                        //var selHeight = Math.log (cluster.getSelectedChildCount() + 1) * heightMultiplier;
                        var selHeight = (height * Math.log (cluster.getSelectedChildCount() + 1)) / clog;
                        var unselHeight = height - selHeight;

                        return new L.DivIcon({ html: '<div class="unselected" style="height:'+unselHeight+'px">' + cluster.getChildCount() + '</div>'
                                +'<div class="selected" style="height:'+selHeight+'px">' + cluster.getSelectedChildCount()+ '</div>',
                            className: 'vesperMapIcon',
                            //iconSize: new L.Point(40, 20 + (cluster.getSelectedChildCount() > 0 ? 20 : 0))
                            //iconSize: new L.Point(40, 20 + (Math.log (cluster.getSelectedChildCount() + 1) * 5))
                            iconSize: new L.Point(40, height)
                        });
                    }
                }
            );

            markerGroup.on('clustermouseover', function (a) {
                VESPER.tooltip.updateText (a.latlng,
                    a.layer.getChildCount()+" Records"
                    +(a.layer.getSelectedChildCount() > 0 ? "<br>" + a.layer.getSelectedChildCount()+' Selected' : ""));
                VESPER.tooltip.updatePosition (a.originalEvent);
            });

            markerGroup.on('clustercontextmenu', function (a) {
                var theseMarkers = [];
                var sel = [];
                a.layer.getAllChildMarkers (theseMarkers);
                if (theseMarkers.length > 0) {
                    for (var n = 0; n < theseMarkers.length; n++) {
                        sel.push (theseMarkers[n].extId);
                    }
                    model.getSelectionModel().clear();
                    model.getSelectionModel().addAllToMap (sel);
                }
            });
        }

		var colourscheme = function(value){
		    return [value, 1, 0.5, 1];
		};
		//var heatmap = new L.TileLayer.HeatCanvas(/*"HeatCanvas", map,*/ {},
	    //        {'step':0.2, 'degree':HeatCanvas.QUAD, 'opacity':0.4, 'colorscheme':colourscheme}
		//);

        var maskMap = L.TileLayer.maskCanvas({
            radius: 5,  // radius in pixels or in meters (see useAbsoluteRadius)
            useAbsoluteRadius: false,  // true: r in meters, false: r in pixels
            color: '#000',  // the color of the layer
            opacity: 0.6  // opacity of the not coverted area
        });
        VESPER.log ("maskmap ",maskMap);

		var markers = [];
		var latlngs = [];
		
		struc = model.getData();
		if (latField && longField) {
			 for (var prop in struc) {
				 if (struc.hasOwnProperty (prop)) {
					 var rec = model.getTaxaData(struc[prop]);
					 var lat = +rec[latField];
					 var longi = +rec[longField];
					
					 //narRecs[prop] = [+rec[latI], +rec[lonI], 1, rec[idI]];
					 //narRecs[prop] = [+rec[latField], +rec[longField]];
					 if (!isNaN(lat) && !isNaN(longi)) {
						 var coord= [lat, longi];
						 //VESPER.log (lat, longi);
						 var marker = L.marker(coord)
						 	.bindPopup (rec[keyField]+" "+rec[nameField])
						 	.on ('contextmenu', function (e) {
                                model.getSelectionModel().clear();
                                model.getSelectionModel().addToMap (e.target.extId);
						 	})
						 ;
						 marker.extId = prop;
						 markers.push (marker);
						 latlngs.push (coord);
						 dwcaid2Marker[prop] = marker;
						 
						// heatmap.pushData (lat, longi, 1);
					 }
				 }
			 } 
			 markerGroup.addLayers (markers);
            maskMap.setData (latlngs);
		}
		
		//map.addLayer (heatmap);
		map.addLayer (markerGroup);
       // map.addLayer (maskMap);
		map.fitBounds ((new L.LatLngBounds (latlngs)).pad(1.05));
		
		L.control.layers ({},{"Marker":markerGroup, /*"Heatmap":heatmap,*/ "Mask":maskMap}).addTo(map);
		L.control.scale().addTo (map);
		
		VESPER.log ("group ", markerGroup);
		VESPER.log ("map ", map);

        recalcHeightMultiplier();
    };


    function recalcHeightMultiplier () {
        var cc = markerGroup._topClusterLevel.getChildCount();
        var allHeight = Math.log (cc + 1);
        heightMultiplier = maxIconHeight / allHeight;
    }


	this.update = function () {
        var vals = model.getSelectionModel().values();

        console.log ("MGROUP COUNT: ", markerGroup._topClusterLevel.getChildCount());

		if (map.hasLayer (markerGroup)) {
            recalcHeightMultiplier ();

            markerGroup.eachLayer (function(layer) {
                var sel = model.getSelectionModel().contains(layer.extId);
                layer.setIcon (sel ? selIcon : oldIcon);
            });

            //VESPER.log ("vals", vals);

            var lls = [];
            var lastLayer;
            for (var n = 0; n < vals.length; n++) {
                var layer = dwcaid2Marker[vals[n]];
                if (layer) {
                    lls.push (layer.getLatLng());
                    lastLayer = layer;
                }
            }

            markerGroup.setAllSelectedChildCounts (model.getSelectionModel());

            if (lls.length == 1) {
                markerGroup.zoomToShowLayer (lastLayer, function () { lastLayer.openPopup()});
            }
            else if (lls.length > 1) {
                var bb = new L.LatLngBounds (lls);
                map.fitBounds(bb);
            }
		}
	};

    this.destroy = function () {
        DWCAHelper.recurseClearEvents (d3.select(divid));

        model.removeView (self);
        model = null;
        DWCAHelper.twiceUpRemove(divid);
    };

    this.updateVals = this.update;

    // polyLL - array of polygon lat longs
    // bb - bounding box of those polygon lat longs
    // ll - the lat long we wish to see is inside the polygon or not
    function containsLatLng (polyLL, bb, ll) {
        var inside = false, p1, p2, i, len;

        if (!bb.contains (ll)) {
            return false;
        }

        // ray casting algorithm for detecting if point is in polygon
        for (i = 0, len = polyLL.length; i < len; i++) {
            p1 = polyLL[i];
            p2 = polyLL[(i - 1 + len) % len];

            if (((p1.lat > ll.lat) !== (p2.lat > ll.lat)) &&
                (ll.lng < (p2.lng - p1.lng) * (ll.lat - p1.lat) / (p2.lat - p1.lat) + p1.lng)) {
                inside = !inside;
            }
        }

        return inside;
    }


    // extend Leaflet MarkerClusterGroup classes to count selected marker totals at each cluster, mjg
    var  mc = 0;
    // Extend MarkerClusterGroup
    // mjg
    L.MarkerClusterGroup.include( {
            //mjg
            setAllSelectedChildCounts: function (selectionModel) {
                //VESPER.log ("recalcing cluster sel counts");
                mc = 0;
                var cc = this._topClusterLevel.setAllSelectedChildCounts (selectionModel);
                //VESPER.log ("MC", mc);
                return cc;
            }
        }
    );

    // Extend MarkerCluster
    //mjg
    L.MarkerCluster.include( {
            _selChildCount: 0, // mjg

            // mjg
            setAllSelectedChildCounts: function (selectionModel) {
                var curCount = 0;
                mc++;

                for (var j = this._markers.length - 1; j >= 0; j--) {
                    if (selectionModel.contains (this._markers[j].extId)) {
                        curCount++;
                    }
                }

                for (var i = this._childClusters.length - 1; i >= 0; i--) {
                    curCount += this._childClusters[i].setAllSelectedChildCounts (selectionModel);
                }

                this._selChildCount = curCount;
                this._updateIcon ();    // seem to need to poke icon to recalc html, doesn't do it dynamically
                return curCount;
            },

            //mjg
            getSelectedChildCount: function () {
                return this._selChildCount;
            }
        }
    );

};
		;VESPER.DWCAParser = new function () {

    //this.TDATA = "tdata";
    //this.TAXA = "taxa";
    //this.EXT = "ext";

    this.TDATA = 0;
    this.TAXA = 1;
    this.EXT = 2;
    this.SYN = 3;
    this.SPECS = "s";


	// terms from old darwin core archive format superseded by newer ones
    // http://rs.tdwg.org/dwc/terms/history/index.htm
	var altTerms = {"class":"classs",   // done to avoid clashing with reserved class keyword in java. I don't think there is one in javascript though.
			"DarwinCore":"Occurrence",
			"SimpleDarwinCore":"Occurrence",
			"catalogNumberNumeric":"catalogNumber",
			"collectorNumber":"recordNumber",
			"collector":"recordedBy",
			"nativeness":"establishmentMeans",
			"latestDateCollected":"eventDate",
			"earliestDateCollected":"eventDate",
			"state":"stateProvince",
			"province":"stateProvince",
			"city":"municipality",
			"depth":"verbatimDepth",
			"elevation":"verbatimElevation",
			"latitude":"decimalLatitude",
			"longitude":"decimalLongitude",
			"datum":"geodeticDatum",
			"nameUsageID":"taxonID",
			"nameID":"scientificNameID",
			"acceptedTaxonID":"acceptedNameUsageID",
			"parentTaxonID":"parentNameUsageID",
			"higherTaxonID":"parentNameUsageID",
			"higherNameUsageID":"parentNameUsageID",
			"originalNameID":"originalNameUsageID",
			"originalTaxonID":"originalNameUsageID",
			"basionymID":"originalNameUsageID",
			"taxonAccordingToID":"nameAccordingToID",
			"acceptedTaxon":"acceptedNameUsage",
			"parentTaxon":"parentNameUsage",
			"higherTaxon":"parentNameUsage",
			"higherNameUsage":"parentNameUsage",
			"originalName":"originalNameUsage",
			"originalTaxon":"originalNameUsage",
			"basionym":"originalNameUsage",
			"taxonAccordingTo":"nameAccordingTo",
			"rank":"taxonRank",
            "scientificNameRank":"taxonRank",
			"taxonRemark":"taxonRemarks",
            "EventAttributeType":"measurementType",
            "eventMeasurementType":"measurementType",
            "SamplingAttributeType":"measurementType"
	};


    // terms which tend to be textual descriptions and as such aren't that amenable to the visualisations we
    // wish to do but do gobble up a lot of memory.
    this.flabbyLists = {};
    this.flabbyLists.wordyList = ["eventRemarks", "taxonRemarks", "georeferenceRemarks", "identificationRemarks"
                        ,"locationRemarks", "measurementRemarks", "occurrenceRemarks", "relationshipRemarks"
                        ,"verbatimCoordinates", "bibliographicCitation", "description"
    ];

    // list of terms that are necessary to do the basics of particular visualisations.
    // e.g. we need latitude and longitude values to do map plots
    // It's a given that we need the id for each entry.
    this.explicitRanks = ["kingdom", "phylum", "classs", "order", "family", "genus", "subgenus"];
    this.neccLists = {};
    this.neccLists.geo = ["decimalLatitude", "decimalLongitude", "geodeticDatum"];
    this.neccLists.impTaxonomy = ["acceptedNameUsageID", "parentNameUsageID", "taxonRank"];
    this.neccLists.expTaxonomy = this.explicitRanks.concat(["taxonRank"]);
    this.neccLists.times = ["eventDate", "modified", "geodeticDatum", "georeferencedDate", "dateIdentified", "verbatimEventDate"];
    this.neccLists.basicTimes = ["eventDate"];

    // list of terms that convey a label for a taxon/specimen
    this.labelChoiceData = ["acceptedNameUsage", "scientificName", "originalNameUsage", "vernacularName"];



    // terms for which values are commonly repeated, often from a very small set of possible values.
    // utilising this we can save memory by pointing to a map of values for these fields rather than storing
    // a separate value for each entry.
    // Most are recognised as being suitable for controlled vocabularies by DWCA - http://rs.tdwg.org/dwc/terms/history/index.htm
    this.controlledVocabFields = ["continent", "country", "countryCode", "stateProvince", "county", "island", "islandGroup", "waterBody", "higherGeographyID",
                            "geodeticDatum", "georeferenceVerificationStatus", "verbatimCoordinateSystem", "verbatimSRS",
                            "taxonomicStatus", "language", "nomenclaturalCode", "nomenclaturalStatus", "identificationVerificationStatus",
                            "rightsHolder",
                            "type", "audience", "format",
                            "taxonRank", "verbatimTaxonRank",
                            "basisOfRecord", "dcterms:type", "dcterms:language",
                            "measurementUnit", "behavior",
                            "relationshipOfResource", "establishmentMeans", "occurrenceStatus", "disposition",
                            "sex", "lifeStage", "reproductiveCondition", "isPlural",
                            "threatStatus",
                            "isMarine", "isFreshwater", "isTerrestrial", "isInvasive", "isHybrid", "isExtinct",
                            "typeDesignationType"
    ];
    this.archiveLimitedFields = ["institutionID", "collectionID", "datasetID", "institutionCode", "collectionCode", "datasetName", "ownerInstitutionCode",
                                "year", "month", "day",
                                "source",
                                "nameAccordingToID", "isPreferredName", "typeStatus", "verbatimTaxonRank",
                                "superkingdom", "kingdom", "superphylum", "phylum", "subphylum", "superclass", "classs", "order", "family"
    ];


    this.controlledVocabSet = {};
    for (var i = 0; i < this.controlledVocabFields.length; i++) { this.controlledVocabSet[this.controlledVocabFields[i]] = true; }

    this.discreteTermList = this.controlledVocabFields.concat(this.archiveLimitedFields);
    this.discreteTermSet = {};
    for (var i = 0; i < this.discreteTermList.length; i++) { this.discreteTermSet[this.discreteTermList[i]] = true; }


    // sets of terms for which values can be shared, again opening them up to memory saving through a map.
    // When terms holds the same index in the object below, it indicates a shared value map could be common to those terms.
    // The most common example is parent and taxon ids, all parent name ids must turn up as name ids in another record (unless it's a root)
    // and parent name ids are often repeated anyways. It also works for the base ids which are often just copies of name ids.
    this.sharedValuesTerms = {"taxonID":1, "acceptedNameUsageID":1, "parentNameUsageID":1, "originalNameUsageID":1};


    this.recordURIMap = {
        "http://rs.tdwg.org/dwc/xsd/simpledarwincore/SimpleDarwinRecord": "Simple Darwin Record",
        "http://rs.tdwg.org/dwc/terms/Occurrence" : "Occurrence",
        "http://rs.tdwg.org/dwc/terms/Event" : "Event",
        "http://purl.org/dc/terms/Location" : "Location",
        "http://purl.org/dc/terms/GeologicalContext" : "GeologicalContext",
        "http://rs.tdwg.org/dwc/terms/Identification" : "Identification",
        "http://rs.tdwg.org/dwc/terms/Taxon" : "Taxon",
        "http://rs.tdwg.org/dwc/terms/ResourceRelationship" : "ResourceRelationship",
        "http://rs.tdwg.org/dwc/terms/MeasurementOrFact" : "MeasurementOrFact",
        "http://rs.gbif.org/terms/1.0/Distribution" : "Distribution",
        "http://rs.gbif.org/terms/1.0/VernacularName" : "VernacularName",
        "http://rs.gbif.org/terms/1.0/SpeciesProfile" : "SpeciesProfile",
        "http://rs.gbif.org/terms/1.0/TypesAndSpecimen" : "TypesAndSpecimen",
        "http://rs.gbif.org/terms/1.0/Reference" : "Reference",
        "http://rs.gbif.org/terms/1.0/Image" : "Image",
        "http://rs.gbif.org/terms/1.0/Identifier" : "Identifier",
        "http://rs.gbif.org/terms/1.0/Description" : "Description",
        "http://rs.nordgen.org/dwc/germplasm/0.1/terms/GermplasmSample" : "GermplasmSample",
        "http://purl.org/germplasm/germplasmTerm#GermplasmAccession" : "GermplasmAccession",
        "http://purl.org/germplasm/germplasmTerm#MeasurementExperiment" : "MeasurementExperiment",
        "http://purl.org/germplasm/germplasmTerm#MeasurementMethod" : "MeasurementMethod"
    };


    this.rowTypeDefaults = {};
    this.fieldAttrNames = {};
    this.xsd = null;

    this.loadxsd = function (xsdFile) {
        VESPER.log ("yp2", xsdFile);
        $.get(xsdFile, function(d){
            // stupid firefox reads in a BOM mark (probably stupid me somewhere else, but I ain't got time)
            //if (d.charCodeAt(0) > 65000 || d.charCodeAt(0) === 255) {
            //    d = d.slice(2);
            //}
           // VESPER.log ("yp22", d.charCodeAt(0), d.charCodeAt(1), d.charCodeAt(2), d);
            //VESPER.log ("Native DOM Parse", NapVisLib.parseXML(d));
           // VESPER.log ($.parseXML(d));
            VESPER.log ("XSD", d, typeof d);
            VESPER.DWCAParser.xsd = (typeof d == "string" ? $(NapVisLib.parseXML(d)) : $(d));
           // VESPER.log ("XSD", DWCAParser.xsd);
            VESPER.DWCAParser.makeRowTypeDefaults (VESPER.DWCAParser.xsd);
            VESPER.DWCAParser.makeFieldAttrNames (VESPER.DWCAParser.xsd);

        });
    };


    this.accessZip = function (text, metaFileName) {
        var zip = new JSZip(text, {base64:false, noInflate:true});
        zip.zipEntries.readLocalFile (metaFileName);
        VESPER.log ("unzipped ", zip, zip.files);
        var metaFile = zip.zipEntries.getLocalFile (metaFileName);
        var metaData = VESPER.DWCAParser.parseMeta ($.parseXML (metaFile.uncompressedFileData));
        return {jszip: zip, meta: metaData};
    };


    $.fn.filterNode = function(name) {
        VESPER.log ("go");
        return this.find('*').filter(function() {
            VESPER.log (this);
            return this.nodeName ? (this.nodeName.toUpperCase() == name.toUpperCase()) : false;
        });
    };


    this.makeRowTypeDefaults = function (xsdFile) {
        var wat = xsdFile.find('xs\\:attributeGroup[name="fileAttributes"], attributeGroup[name="fileAttributes"]');
        var ffrag = $(wat);
        //VESPER.log ("FILEATTR", wat);

        $(ffrag[0]).find('xs\\:attribute, attribute').each(function() {
            var xmlthis= $(this);
            var val = xmlthis.attr('default');
            var type = xmlthis.attr ('type');
            if (type == "xs:integer") {
                val = +val;
            }
            VESPER.DWCAParser.rowTypeDefaults[xmlthis.attr('name')] = val;
        });

        VESPER.log ("rtd", VESPER.DWCAParser.rowTypeDefaults);
    };


    this.makeFieldAttrNames = function (xsdFile) {
        var wat = xsdFile.find('xs\\:complexType[name="fieldType"], complexType[name="fieldType"]');
        var ffrag = $(wat);
        //VESPER.log ("WAT", wat);

        $(ffrag[0]).find('xs\\:attribute, attribute').each(function() {
            var xmlthis= $(this);
            var name = xmlthis.attr ('name');
            var type = xmlthis.attr ('type');
            VESPER.DWCAParser.fieldAttrNames[name] = type;
        });

        VESPER.log ("fan", VESPER.DWCAParser.fieldAttrNames);
    };

    // load in xsd and populate arrays/maps from it.
    this.loadxsd ('dwca.xsd');

	
	function getCurrentTerm (term) {
		var newTerm = altTerms [term];
		return (newTerm === undefined ? term : newTerm);
	}


	this.occArray2JSONArray = function (tsvData, idx) {
		var jsonObj = {};
        if (VESPER.alerts) { alert ("mem monitor point 1.4"); }

		for (var n = 0, len = tsvData.length; n < len; n++) {
			var rec = tsvData[n];
            if (rec !== undefined) {
                var id = rec[idx];
                jsonObj[id] = {};
                jsonObj[id][this.TDATA] = rec;
            }
		}
		
		return jsonObj;
	};

    function addToArrayProp (obj, pname, addObj) {
        if (!obj[pname]) {
            obj[pname] = [];
        }
        obj[pname].push (addObj);
    }

	// This uses implicit id linking in the dwca file i.e. acceptedNameUsageID to parentNameUsageID
	this.taxaArray2JSONTree = function (tsvData, fileData, fieldIndexer) {
        var idx = fileData.idIndex;
		var jsonObj = this.occArray2JSONArray (tsvData, idx);

        if (VESPER.alerts) { alert ("mem monitor point 1.5"); }
		var hidx = fieldIndexer["parentNameUsageID"];
		var aidx = fieldIndexer["acceptedNameUsageID"];
		
		for (var n = 0, len = tsvData.length; n < len; n++) {
			var rec = tsvData[n];
            if (rec !== undefined) {
                var id = rec[idx];
                var pid = rec[hidx];

                var pRec = jsonObj[pid];

                if (pid != id && pRec != undefined) {	// no self-ref loops and parent must exist
                    // Make child taxa lists
                    addToArrayProp (pRec, VESPER.DWCAParser.TAXA, jsonObj[id]);
                }
                else if (pRec == undefined) {
                    // Make synonym lists
                    var aid = rec[aidx];
                    if (id != aid) {
                        var aRec = jsonObj[aid];
                        if (aRec != undefined) {
                            addToArrayProp (aRec, VESPER.DWCAParser.SYN, jsonObj[id]);
                            //delete jsonObj[id];
                        }
                    }
                }
            }
		}
		
		var roots = this.findRoots (jsonObj, idx, fieldIndexer);
		this.createSuperroot (jsonObj, roots, fileData.invFieldIndex[idx], fieldIndexer);
		VESPER.log ("roots", roots);
	
		VESPER.log ("JSON", jsonObj[1], jsonObj);
		return {"records":jsonObj, "tree":jsonObj};
	};


    // This uses explicit id linking in the dwca file i.e. kingdom, order, family etc data
    this.taxaArray2ExplicitJSONTree = function (tsvData, fileData, fieldIndexer, addOriginalTo) {
        var idx = fileData.idIndex;
        var jsonObj = this.occArray2JSONArray (tsvData, idx);

        if (VESPER.alerts) { alert ("mem monitor point 1.5a ex"); }
        VESPER.log ("SPECS", VESPER.DWCAParser.SPECS);
        var rankList = VESPER.DWCAParser.explicitRanks;
        var nameField = fieldIndexer["acceptedNameUsage"] || fieldIndexer["vernacularName"] || fieldIndexer["scientificName"];
        var rootObjs = {};
        var rLen = rankList.length;
        // Make a taxonomy from the explicitly declared ranks

        var data = jsonObj;
        var count = 0;
        var ms = Date.now();
        for (var prop in data) {
            if (data.hasOwnProperty(prop)) {
                count++;
            }
        }
        ms = Date.now() - ms;
        VESPER.log ("first iter pass: ",ms,"ms.");

        // I am separating the jsonObj from the tree organising structure here, as mixing integer and string property names
        // causes massive slowdown in webkit broswers (chrome 29 and opera 15 currently).
        // http://stackoverflow.com/questions/18895840/webkit-javascript-object-property-iteration-degrades-horribly-when-mixing-intege
        var treeObj = {};
        //treeObj = jsonObj; // revert

        for (var n = 0, len = tsvData.length; n < len; n++) {
            var rec = tsvData[n];

            if (rec !== undefined) {

                var lastData;
                var path = [];
                for (var r = 0; r < rLen; r++) {
                    var rank = rankList[r];
                    var rankField = fieldIndexer[rank];

                    if (rankField) {
                        var val = rec[rankField];

                        if (val) {
                            if (!treeObj[val]) {
                                var rdata = [];
                                rdata[idx] = val;
                                rdata[nameField] = val;
                                rdata[fieldIndexer["taxonRank"]] = rank;
                                var obj = {};
                                obj[this.TDATA] = rdata;
                                treeObj[val] = obj;

                                if (lastData) {
                                    addToArrayProp (lastData, VESPER.DWCAParser.TAXA, obj);
                                }
                            }

                            if (!lastData) {
                                rootObjs[val] = true;
                            }
                            lastData = treeObj[val];
                        }
                    }
                }

                if (lastData) {
                    addOriginalTo (lastData, jsonObj[rec[idx]], treeObj, rec[nameField], idx, fieldIndexer, nameField)
                }
            }
        }

        count = 0;
        ms = Date.now();
        for (var prop in data) {
            if (data.hasOwnProperty(prop)) {
                count++;
            }
        }
        ms = Date.now() - ms;
        VESPER.log ("second iter pass: ",ms,"ms.");

        var roots = d3.keys (rootObjs);
        this.createSuperroot (treeObj, roots, fileData.invFieldIndex[idx], fieldIndexer);
        VESPER.log ("roots", roots);

        VESPER.log ("json", jsonObj, "tree", treeObj);
        return {"records":jsonObj, "tree":treeObj};
    };


    this.addOriginalAsSpecimenEntry = function (lastData, orig, taxa, name, idx, fieldIndexer, nameField) {
        var val = name;
        if (!taxa[val]) {
            var rdata = [];
            rdata[idx] = val;
            rdata[nameField] = val;
            rdata[fieldIndexer["taxonRank"]] = "Species";
            var obj = {};
            obj[VESPER.DWCAParser.TDATA] = rdata;
            taxa[val] = obj;

            if (lastData) {
                addToArrayProp (lastData, VESPER.DWCAParser.TAXA, taxa[val]);
            }

            //VESPER.log (val, taxa[val]);
        }
        addToArrayProp (taxa[val], VESPER.DWCAParser.SPECS, orig);
    };

    this.addOriginalAsLeaf = function (lastData, orig, taxa, name, idx, fieldIndexer, nameField) {
        addToArrayProp (lastData, VESPER.DWCAParser.TAXA, orig);
    };
	


	this.addExtRows2JSON = function (jsonData, extRowData, coreIDIndex, extFieldName) {
		var unreconciled = [];
		if (extRowData && (coreIDIndex != undefined)) {
			for (var i = 0, len = extRowData.length; i < len; i++) {
				var dataRow = extRowData [i];

                if (dataRow !== undefined) {
                    var coreid = dataRow[coreIDIndex];

                    if (coreid != undefined) {
                        var jsonins = jsonData[coreid];

                        if (jsonins != undefined) {
                            if (! jsonins[this.EXT]) {
                                jsonins[this.EXT] = {};
                            }
                            var jsonExt = jsonins[this.EXT];
                            addToArrayProp (jsonExt, extFieldName, dataRow);
                        }
                    }
                    else {
                        unreconciled.push (i);
                    }
                }
			}
		}
		
		return unreconciled;
	};
	
	
	
	this.makeTreeFromAllFileRows = function (theFileRows, metaData) {
		var fileData = metaData.fileData;
		var coreFileData = fileData[metaData.coreRowType];
		var jsoned;
		if (NapVisLib.endsWith (metaData.coreRowType, "Taxon")) {
			jsoned = this.taxaArray2JSONTree (theFileRows[coreFileData.rowType], coreFileData, coreFileData.filteredFieldIndex);
		} else if (NapVisLib.endsWith (metaData.coreRowType, "Occurrence")) {
            jsoned = this.taxaArray2ExplicitJSONTree (theFileRows[coreFileData.rowType], coreFileData, coreFileData.filteredFieldIndex,
                VESPER.DWCAParser.addOriginalAsSpecimenEntry
            );
		}
  		
  		for (var indFileDataProp in fileData) {
  			if (fileData.hasOwnProperty (indFileDataProp)) {
  				var indFileData = fileData[indFileDataProp];
                if (metaData.coreRowType !== indFileData.rowType && indFileData.selected) {
                    var unreconciled = this.addExtRows2JSON (jsoned.records, theFileRows[indFileData.rowType], indFileData.idIndex, indFileData.mappedRowType);
                    VESPER.log ("unreconciled in ",indFileDataProp, unreconciled);
                }
  			}
  		}

  		return jsoned;
	};
	

	
	this.setupStrucFromRows = function (theFileRows, metaData) {
  		var struc = this.makeTreeFromAllFileRows (theFileRows, metaData);
        if (VESPER.alerts) { alert ("mem monitor point 2"); }
    	struc.root = struc.tree["-1000"]; //this.createSuperroot (struc, this.findRoots (struc, fieldIndex), fieldIndex);
    	if (struc.root) {
    		this.countDescendants (struc.root);
    	}
        if (VESPER.alerts) { alert ("mem monitor point 3"); }
        VESPER.log ("root", struc.root);
    	return struc;
	};
	
	
	this.findRoots = function (jsonObj, idx, fieldIndexer) {
		var roots = [];
		var hidx = fieldIndexer["parentNameUsageID"];
		var aidx = fieldIndexer["acceptedNameUsageID"];

		if (aidx !== undefined && hidx !== undefined) {
			for (var taxonProp in jsonObj) {
				if (jsonObj.hasOwnProperty (taxonProp)) {
					var taxon = jsonObj[taxonProp];
					var rec = taxon[this.TDATA];

                    if (rec !== undefined) {
                        var id = rec[idx];
                        var aid = rec[aidx];
                        var pid = rec[hidx];
                        if (id == aid && (pid == id || jsonObj[pid] == undefined)) { //Not a synonym, and parentid is same as id or parentid does not exist. possible root
                            roots.push (taxonProp);
                        }
                    }
				}
			}
		}
		
		return roots;
	};
	
	
	this.createSuperroot = function (jsonObj, roots, idName, fieldIndexer) {
		if (roots.length == 0) {
			return undefined;
		}
		
		if (roots.length == 1) {
            jsonObj["-1000"] = jsonObj[roots[0]];
			return jsonObj[roots[0]];
		}
		
		var hidx = fieldIndexer["parentNameUsageID"];
		var srID = "-1000";
		var srData = {
            //id: srID,
            acceptedNameUsageID: srID,
            parentNameUsageID: srID,
            acceptedNameUsage:  "superroot",
            taxonRank: "superroot",
            nameAccordingTo: "dwcaParse.js",
            scientificName: "superroot"
		};
        srData[idName] = srID;
		var srObj = {};
	
		srObj[this.TAXA] = [];
		for (var n = 0; n < roots.length; n++) {
			srObj[this.TAXA].push (jsonObj[roots[n]]);	// add root as child taxon of superroot
			jsonObj[roots[n]][VESPER.DWCAParser.TDATA][hidx] = srID;	// make superroot parent taxon of root
		}
		
		srObj[VESPER.DWCAParser.TDATA] = [];
		for (var prop in srData) {
			if (srData.hasOwnProperty (prop)) {
				srObj[VESPER.DWCAParser.TDATA][fieldIndexer[prop]] = srData[prop];
			}
		}
		
		VESPER.log ("superroot", srObj);

        jsonObj[srID] = srObj;  // add it to the json obj so it gets treated like a node everywhere else
		return srObj;	
	};
	
	
	/* Recursively counts descendants, starting from a given taxon (usually root) */
	this.countDescendants = function (taxon) {
		if (taxon[this.TAXA] != undefined) {
            taxon.dcount = 0;
			for (var n = 0; n < taxon[this.TAXA].length; n++) {
				taxon.dcount += this.countDescendants (taxon[this.TAXA][n]);
			}
		}
		return (taxon.dcount || (taxon[VESPER.DWCAParser.SPECS] ? taxon[VESPER.DWCAParser.SPECS].length : 0)) + 1;
	};


	
	this.parseMeta = function (theXML) {
  		var fileData = {};
  		
  		var coreRowType = this.getCoreRowType (theXML);
  		fileData[coreRowType] = this.parseCore (theXML, coreRowType);
  		
  		var extRowTypes = this.getExtensionRowTypes (theXML);
  		for (var n = 0; n < extRowTypes.length; n++) {
  			fileData [extRowTypes[n]] = this.parseExtension (theXML, extRowTypes[n]);
  		}
  		
  		var metaData = {"coreRowType":coreRowType, "extRowTypes":extRowTypes, "fileData":fileData};
  		VESPER.log ("metadata", metaData);
  		return metaData;
	};
	
	
	
	this.parseCore = function (theXML, coreRowType) {
		return this.parseFrag (theXML, 'archive core[rowType="'+coreRowType+'"]', 'id', coreRowType);
	};
	
	
	this.parseExtension = function (theXML, extensionRowType) {
		return this.parseFrag (theXML, 'extension[rowType="'+extensionRowType+'"]', 'coreid', extensionRowType);
	};
	
	
	this.parseFrag = function (theXML, fragQ, idAttrName, rowType) {
        VESPER.log ("thexml", typeof theXML, theXML);
		var frag = $(theXML).find(fragQ);
        var ffrag = $(frag[0]);

        var fileData = {};
		var fileNames = ffrag.find('files location').contents();
        fileData.fileName = fileNames[0].data;
        fileData.rowType = rowType;
        fileData.mappedRowType = this.recordURIMap [rowType];
        for (var attrName in this.rowTypeDefaults) {
            if (this.rowTypeDefaults.hasOwnProperty (attrName)) {
                // AARGH. Remember, there is a difference between something being undefined and an empty value.
                // Both equate to false, but only one (attribute is undefined) says there is no
                // such attribute there and we should fall back to the default.
                // The other, the attribute has been given an empty value, means the value is empty and we should use that, not the default.
                // Caused Error. Grrrr.
                //if (ffrag.attr(attrName) === undefined)
                fileData[attrName] = (ffrag.attr(attrName) !== undefined ? ffrag.attr(attrName) : this.rowTypeDefaults[attrName]);
                VESPER.log ("att", attrName, "#", fileData[attrName], "#")
            }
        }
        VESPER.log (ffrag.attr("fieldsEnclosedBy"));


		var idIndex = +ffrag.find(idAttrName).attr('index'); // '+' makes it a number not a string
        fileData.idIndex = idIndex;
		var fields = ffrag.find('field');
		
		VESPER.log ("fieldsTerminatedBy", fileData.fieldsTerminatedBy);
		
		fileData.fieldIndex = {}; fileData.invFieldIndex = [];
        fileData.fieldData = {};
        fileData.fieldIndex[idAttrName] = idIndex;
        fileData.invFieldIndex[idIndex] = idAttrName;
		for (var fidx = 0; fidx < fields.length; fidx++) {
            var fXml = $(fields[fidx]);
            var fieldAttrs = {};
            for (var fieldAttr in VESPER.DWCAParser.fieldAttrNames) {
                if (VESPER.DWCAParser.fieldAttrNames.hasOwnProperty (fieldAttr)) {
                    var fieldAttrType = VESPER.DWCAParser.fieldAttrNames[fieldAttr];
                    var val = fXml.attr (fieldAttr);
                    if (fieldAttrType == "xs:integer") {
                        val = +val; // '+' makes it a number not a string
                    }
                    fieldAttrs[fieldAttr] = val;
                }
            }
            fieldAttrs.shortTerm = getCurrentTerm (chopToLastSlash (fieldAttrs.term));
            var index = fieldAttrs.index;
            var fieldName = fieldAttrs.shortTerm;
            fieldAttrs.discreteTermList = (VESPER.DWCAParser.discreteTermSet[fieldName] ? {} : undefined);

           // VESPER.log ("FieldAttrs:", fieldAttrs);

			if (!isNaN(index)) {
                fileData.fieldIndex[fieldName] = index;
                fileData.invFieldIndex[fileData.fieldIndex[fieldName]] = fieldName;
			}

            fileData.fieldData[fieldName] = fieldAttrs;
		}

        fileData.filteredFieldIndex = {}; //$.extend ({}, fileData.fieldIndex);
        fileData.filteredInvFieldIndex = []; //fileData.invFieldIndex.slice();
		
		VESPER.log ("filenames: ", fileNames);
		return fileData;
	};


    this.updateFilteredLists = function (fileData, presentFieldIndex) {
        var i = 0;
        fileData.filteredInvFieldIndex.length = 0;
        var idName = fileData.invFieldIndex[fileData.idIndex];
        $.each(fileData.filteredFieldIndex, function (n) {
            if (n != idName) {
                fileData.filteredFieldIndex[n] = undefined;
            }
        });

        for (var n = 0; n < presentFieldIndex.length; n++) {
            if (presentFieldIndex[n]) {
                var name = fileData.invFieldIndex [n];
                fileData.filteredFieldIndex[name] = i;
                fileData.filteredInvFieldIndex[i] = name;
                i++;
            }
        }

        VESPER.log ("fi", fileData.fieldIndex, fileData.filteredFieldIndex, fileData.invFieldIndex, fileData.filteredInvFieldIndex);
    };
	
	
	this.getCoreRowType = function (theXML) {
		var frags = $(theXML).find('core');
		var term = $(frags[0]).attr('rowType');	// should only be 1
		VESPER.log ("core", term);
		return term;
	};
	
	this.getExtensionRowTypes = function (theXML) {
		var frags = $(theXML).find('extension');
		var types = [];
		for (var n = 0; n < frags.length; n++) {
			var term = $(frags[n]).attr('rowType');
			types.push (term);
		}
		
		return types;
	};

    this.getFilteredIdIndex = function (metaData) {
        var coreData = metaData.fileData[metaData.coreRowType];
        return coreData.filteredFieldIndex [coreData.invFieldIndex [coreData.idIndex]];
    };

	
	function chopToLastSlash (term) {
		var chop = (term ? term.lastIndexOf("/") + 1 : -1);
		return (chop > 0) ? term.substring (chop) : term;
	}


    // Finds first instance of field name in filedata structure
    this.findFields = function (fileData, fieldNames, index) {
        if (index == undefined) {
            index = "filteredFieldIndex";
        }
        var fieldData = [];
        for (var n = 0, len = fieldNames.length; n < len; n++) {
            fieldData.push (findFieldByIndex (fileData, fieldNames[n], index));
        }
        return fieldData;
    };


    function findFieldByIndex (fileData, fieldName, indexType) {
        //VESPER.log ("FILEDATA", fileData);
        for (var type in fileData) {
            if (fileData.hasOwnProperty(type)) {
                var i = fileData[type][indexType][fieldName];
                if (i !== undefined) {
                    return {"type": type, "index": i, "fieldName":fieldName};
                }
            }
        }

        return null;
    }

    this.selectNodes = function (regex, selectorFunc, model, setSelectionFunc) {
        var count = 0;
        var data = model.getData();

        if (regex !== undefined && regex.length > 0) {
            for (var prop in data) {
                if (data.hasOwnProperty(prop)) {
                    var dataItem = data[prop];
                    var match = selectorFunc (model, dataItem, regex);
                    if (match) {
                        count++;
                        setSelectionFunc (prop);
                    }
                }
            }
        }

        return count;
    }
};;/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 24/05/13
 * Time: 14:02
 * To change this template use File | Settings | File Templates.
 */

VESPER.Filters = new function () {

    this.filter2 = function (model, searchTerms, regex, nameField) {
        VESPER.log ("regex", regex);
        VESPER.log ("filedata", model.getMetaData().fileData);
        var ext;
        var vnData = VESPER.DWCAParser.findFields (model.getMetaData().fileData, ["vernacularName"], "filteredFieldIndex")[0];

        var specificFilter = function (model, taxon, regex) {
            var name = model.getTaxaData(taxon)[nameField];
            if (name && name.match (regex) != null) {
                return true;
            }
            else if (ext = model.getExtraData(taxon) && vnData && ext[vnData.type]) {
                var vnames = ext[vnData.type];
                for (var n = vnames.length; --n >= 0;) {
                    var name2 = vnames[n][vnData.index];
                    //VESPER.log ("name2", name2);
                    if (name2.match (regex) != null) {
                        return true;
                    }
                }
            }
            return false;
        };

        model.getSelectionModel().setUpdating (true);
        var count = VESPER.DWCAParser.selectNodes (regex, specificFilter, model, function(obj) { model.getSelectionModel().addToMap (obj); });
        model.getSelectionModel().setUpdating (false);
        return count;
    }
}();
;/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 03/10/13
 * Time: 15:17
 * To change this template use File | Settings | File Templates.
 */
VESPER.modelComparisons = new function () {

    this.modelCoverageToSelection = function (model1, model2, linkField1, linkField2) {
        var small = smaller (model1, model2);
        var large = (small == model1 ? model2 : model1);
        var smallLinkField = (small == model1 ? linkField1 : linkField2);
        var largeLinkField = (small == model1 ? linkField2 : linkField1);
        var smallData = small.getData();
        var largeData = large.getData();
        VESPER.log ("lf", linkField1, linkField2);

        small.getSelectionModel().clear();
        large.getSelectionModel().clear();

        small.getSelectionModel().setUpdating (true);
        large.getSelectionModel().setUpdating (true);

        var invMap = {};
        for (var prop in smallData) {
            if (smallData.hasOwnProperty (prop)) {
                var rec = smallData[prop];
                var tdata = small.getTaxaData (rec);
                var val = tdata[smallLinkField];
                invMap[val] = prop;
            }
        }
       // VESPER.log ("invMap", invMap);
        var c = 0;
        for (var prop in largeData) {
            if (largeData.hasOwnProperty (prop)) {
                var rec = largeData[prop];
                var tdata = large.getTaxaData (rec);
                var val = tdata[largeLinkField];

                if (invMap[val]) {
                    small.getSelectionModel().addToMap (invMap[val]);
                    large.getSelectionModel().addToMap (prop);
                    //if (c % 100 == 0) {
                    //    VESPER.log ("match", val, invMap[val], prop);
                    //}
                    c++;
                }
            }
        }

        small.getSelectionModel().setUpdating (false);
        large.getSelectionModel().setUpdating (false);
    };

    function smaller (model1, model2) {
        var c1 = NapVisLib.countObjProperties (model1.getData());
        var c2 = NapVisLib.countObjProperties (model2.getData());
        return (c1 < c2 ? model1 : model2);
    }
};;var OccList = function (divid) {

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
};;// TimeLine

VESPER.Sanity = function(divid) {

    var model;
    var self = this;
	var thisView;

	var exitDur = 400, updateDur = 1000, enterDur = 400;
    var maxBarWidth = 100;
	var selected = {};


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
        var cellOrder;

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

        function popTable (rows, calcData, newCellOrder, cellFiller)  {
            rows.exit().remove();

            rows.enter()
                .append ("tr")
                .attr ("class", "sanityText")
            ;

            VESPER.log ("rows", rows, rows.enter());

            cellOrder = newCellOrder;

            rows.each(calcData).each(cellFiller);
        }

        var pcFormat = d3.format (".2%");
        var formats = [];

        function fillCells (d, i) {
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
            VESPER.log ("d", d, cellOrder, arr);

            var cells = d3.select(this).selectAll("td").data(arr);
            var newcells = cells.enter().append ("td");

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
                cells.append("span").attr("class", "sanityText");
            }
            cells.select("span").text (dstring);
            cells.attr ("title", dstring);
        }


        // Check missing data by vis type
        createTable ("visSanityTests", ["Vis Type", "some fields missing", "all fields missing"]);
        var rows = divSel.select("table.visSanityTests").selectAll("tr.sanityText")
            .data(testOutputs)
        ;
        function getPC (d, i) {}
        formats.length = 0; formats[3] = pcFormat; formats[4] = pcFormat;
        popTable (rows, getPC, ["listName", "some", "all"], fillCells);

        // Check missing data by field type
        if (!$.isEmptyObject(result2)) {
            createTable ("fieldSanityTests", ["Record Type", "Field Type", "fields missing"]);
            rows = divSel.select("table.fieldSanityTests").selectAll("tr.sanityText")
                .data(d3.values(result2))
            ;
            formats.length = 0; formats[3] = pcFormat;
            popTable (rows, getPC, ["recordType", "name", "count"], fillCells);
        }

        // Check fields with controlled vocabularies
        if (!$.isEmptyObject(result3)) {
            createTable ("vocabSanityTests", ["Field Type", "Vocabulary Size"]);
            //VESPER.log ("Result3", result3);
            rows = divSel.select("table.vocabSanityTests").selectAll("tr.sanityText")
                .data(d3.values(result3))
            ;
            formats.length = 0;
            popTable (rows, getPC, ["name", "count"], fillCells);
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
};;VESPER.FilterView = function (divID) {

    var model;
    var self = this;
    var nameField;

    this.set = function (fields, mmodel) {
        model = mmodel;
        nameField = fields.nameField;
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

        bindSearch ();
		this.update ();
	};

    function bindSearch () {
        var tfield = d3.select(divID).select("span input");
        tfield
            .on ("keyup", function() {
                VESPER.log (d3.select(this).node(), d3.select(this).property("value"));
                model.getSelectionModel().clear();
                var count = VESPER.Filters.filter2 (model, null, d3.select(this).property("value"), nameField);
            })
        ;
        VESPER.log (tfield);
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
    var nameField;


    this.set = function (fields, mmodel) {
        model = mmodel;
        nameField = fields.nameField;
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
                    VESPER.modelBag.push ({"model":model, "name":nameField});
                    VESPER.log ("ModelBag", VESPER.modelBag);
                    if (VESPER.modelBag.length > 1) {
                        VESPER.modelComparisons.modelCoverageToSelection(VESPER.modelBag[0].model, VESPER.modelBag[1].model, VESPER.modelBag[0].name, VESPER.modelBag[1].name);
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
};;// Tree

VESPER.Tree = function(divid) {

    var self = this;

	var svg;	// top level svg
	var treeG; // matrix rectangle (i.e. not the axes)
	
	var dims;

    var absRoot;
    var curRoot;
    var spaceAlloc;
    var layout;
	var curSort;

    var thisView;
    var model;

    var zoomObj = d3.behavior.zoom();	// zoom object, need to keep as we reference it later. calling d3.behavior.zoom() again gets us a different object/function
    zoomObj.scaleExtent ([1.0, 4.0]); // constrain zooming

    var exitDur = 400, updateDur = 1000, enterDur = 400;
    var keyField, nameField, rankField;
    var firstLayout = true;
    var color = d3.scale.category20c();
    var colourScale = d3.scale.linear().domain([0, 1]).range(["#ffcccc", "#ff6666"]);
    var cstore = {};

    var allowedRanks = {"superroot": true, "ROOT": true, "FAM": true, "ORD": true, "ABT": true, "KLA": true, "GAT": true, "SPE": true};
	var sortOptions = {
		"alpha": function (a,b) { var n1 = model.getTaxaData(a)[nameField]; var n2 = model.getTaxaData(b)[nameField];
								return ( n1 < n2 ) ? -1 : ( n1 > n2 ? 1 : 0 );},
		"descendants": function (a,b) { var s1 = model.getDescendantCount(a); var s2 = model.getDescendantCount(b); 
										//VESPER.log (s1,s2);
										if (s1 === undefined && s2 === undefined) {
											var sp1 = model.getSpecimens(a);
											s1 = sp1 ? sp1.length : 0;
											var sp2 = model.getSpecimens(b);
											s2 = sp2 ? sp2.length : 0;
										}
										s1 = s1 || 0;
										s2 = s2 || 0;
										//s1 = s1 || model.getSpecimens(a);
										//s2 = s2 || model.getSpecimens(b);
										//s1 = (s1 === undefined) ? 0 : s1.length;
										//s2 = (s2 === undefined) ? 0 : s2.length;
										return s1 > s2 ? 1 : ((s1 < s2) ? -1 : 0);
		},
        "selected": function (a,b) {
            var sModel = model.getSelectionModel();
            //console.log (a,b);
            var sel1 = sModel.contains(model.getTaxaData(a)[keyField]);
            var sel2 = sModel.contains(model.getTaxaData(b)[keyField]);
            return (sel1 === sel2) ? 0 :  (sel1 === true ? 1 : -1);
        }
	};

    function tooltipString (node, model) {
        var td = model.getTaxaData(node);
        var specs = model.getSpecimens(node);
        var desc = model.getDescendantCount(node);
        var sdesc = model.getSelectedDescendantCount(node);
        var subt = model.getSubTaxa(node);

        return td[nameField]+": "+td[rankField]
        + (subt === undefined ?
                (specs ? "<br>"+specs.length+" specimens" : "")
                : "<br>"+desc+" descendants")
        + (sdesc > 0 ?
                (subt === undefined ?
                (specs ? "<br>"+sdesc+" selected specimens" : "")
                : "<br>"+sdesc+" selected descendants")
            : "")
        ;
    }

    var spaceAllocationOptions = {
        bottomUp: AdaptedD3.partition3()
            .sort (null)
            //.value(function(d) { return 1; })// having a value for err value, makes the layout append .value fields to each node, needed when doing bottom-up layouts
            .value(function(d) { return model.getLeafValue (d); }) // having a value for err value, makes the layout append .value fields to each node, needed when doing bottom-up layouts
            .children (function (d) { return model.getSubTaxa(d); })
            .nodeId (function (d) { return model.getTaxaData(d)[keyField]; })
        ,

        bottomUpLog: AdaptedD3.logPartition()
            .sort (null)
            .value (function(d) { return model.getLeafValue (d); })
            .children (function (d) { return model.getSubTaxa(d); })
            .nodeId (function (d) { return model.getTaxaData(d)[keyField]; })
        ,

        topDown: AdaptedD3.topdown()
            .sort (null)
            .value (null)
            .children (function (d) { return model.getSubTaxa(d); })
            .nodeId (function (d) { return model.getTaxaData(d)[keyField]; })
           // .filter (function (d) { return allowedRanks[model.getTaxaData(d)[rankField]]; })
    };


    var partitionLayout = {

        cutoffVal: 4,

        sizeBounds: function () {
            return [dims[1], dims[0]];
        },

        sharedAttrs: function (group) {
            group
                .attr ("class", function(d) { var node = getNode (d.id) /*d*/; return model.getSelectionModel().contains(d.id) ? "selected" : (node.sdcount > 0 ? "holdsSelected" : "unselected"); })
                .attr ("y", function (d) { return d.x; })
                .attr ("x", function (d) { return d.y; })
                .attr("width", function (d) { return d.dy; })
                .attr("height", function (d) { return d.dx; })
                //.style("fill", function(d) { var node = getNode (d.id) /*d*/; return model.getSelectionModel().contains(d.id) ? "#ff0000" : (node.sdcount > 0 ? "#ffa080" : null /*"#00ff00"*/); })
            ;
        },

        sharedTextAttrs: function (sel) {
            function rotate (d, elem) {
                return d.dx > d.dy && d3.select(elem).node().getComputedTextLength() < d.dx - 4;
            }

            sel
                .attr ("transform", function (d) {
                return "translate ("+ (d.y)+","+(d.x + Math.max (((d.dx - 14) / 2) + 14, 14))+")"
                    + " rotate ("+(rotate(d, this) ? 90 : 0)+" "+(d.dy/2)+" 0)"
                    //: "rotate (0 0,0)"
                    ;
                })
                .attr ("clip-path", function (d) { var node = getNode (d.id) /*d*/; return rotate(d, this) ? null : "url(#depthclip0)"; /*"url(#depthclip"+node.depth+")";*/})
            ;
        },

        prep: function (coordSet) {
            treeG.attr("transform", "translate(0,0)");
            partitionLayout.makeTextClips (coordSet);
        },

        removeOld: function (exitSel) {
            clearMouseController (exitSel);
            NapVisLib.d3fadeAndRemoveGroups ([exitSel], exitDur, 0);
        },

        makeNew: function (enterSel) {
            var newNodes = enterSel
                .append ("svg:g")
                .attr("class", "treeNode")
                .style("opacity", 0)
            ;

            newNodes.append ("svg:rect")
                .style ("visibility", function (d) { return d.dx >= partitionLayout.cutoffVal ? "visible": "hidden"; })
                .call (partitionLayout.sharedAttrs)
                .call (mouseController)
                //.append("svg:title")
               // .text(function(d) {
                //    return tooltipString (getNode (d.id), model);
               // })
            ;

            newNodes.append ("svg:text")
                .text (function(d) { var node = getNode (d.id) /*d*/; return model.getTaxaData(node)[nameField]; })
                .style ("visibility", function (d) { return d.dx > 15 && d.dy > 15 ? "visible": "hidden"; })
                .call (partitionLayout.sharedTextAttrs)
                //.attr ("clip-path", function (d) { var node = getNode (d.id) /*d*/; return "url(#depthclip"+node.depth+")"; })
            ;

            return newNodes;
        },

        redrawExistingNodes: function (group, delay) {
            group.select("rect")
                .style ("visibility", function (d) { return d.dx >= partitionLayout.cutoffVal ? "visible": "hidden"; })
                .transition()
                .delay (delay)
                .duration (updateDur)
                .call (partitionLayout.sharedAttrs)
            ;

            group.select("text")
                .style ("visibility", function (d) { return d.dx > 15 && d.dy > 15 ? "visible": "hidden"; })
                //.attr ("clip-path", function (d) { var node = getNode (d.id) /*d*/; return "url(#depthclip"+node.depth+")"; })
                .transition()
                .delay (delay)
                .duration (updateDur)
                .call (partitionLayout.sharedTextAttrs)
            ;
        },

        makeTextClips: function (viewableNodes) {
            var height = svg.node().getBoundingClientRect().height;
            var depths = [];
            for (var n = 0; n < viewableNodes.length; n++) {
                var coord = viewableNodes[n];
                var node = getNode (coord.id);
                if (!depths [node.depth]) {
                    // right, right, right. Because these are text clips I have to offset the clips so they actually show the text
                    // that's what the -20 on y is doing
                    depths [node.depth] = {depth: node.depth, x: coord.y, y: -20, width: coord.dy, height: height + 20}; // y/x swap - horizontal icicle remember
                    //depths [node.depth] = {depth: node.depth, x: node.cd[1], y: 0, width: node.cd[3], height: height}; // y/x swap - horizontal icicle remember
                }
            }
            //VESPER.log ("depths", depths);

            // aaargh, webkit has a bug that means camelcase elements can't be selected
            // which meant I spent a fruitless morning trying to select "clipPath" elements.
            // Instead you have to add a class type to the clipPaths and select by that class.
            // http://stackoverflow.com/questions/11742812/cannot-select-svg-foreignobject-element-in-d3
            // https://bugs.webkit.org/show_bug.cgi?id=83438

            var clipBind = svg
                .select ("defs")
                .selectAll (".napierClip")
                .data (depths)
            ;


            var sharedClipAttrs = function (group) {
                group
                    .attr ("x", function(d) { return d.x; })
                    .attr ("y", function(d) { return d.y; })
                    .attr ("width", function(d) { return d.width; })
                    .attr ("height", function(d) { return d.height; })
                ;
            };

            clipBind.exit().remove();

            clipBind
                .select ("rect")
                .call (sharedClipAttrs)
            ;

            clipBind.enter()
                .append ("clipPath")
                .attr ("class", "napierClip")
                .attr ("id", function(d) { return "depthclip"+d.depth; })
                .append ("rect")
                .call (sharedClipAttrs)
            ;
        }
    };




    var π = Math.PI, ε = 1e-6;
    d3.svg.parc = function() {
        var innerRadius = d3_svg_arcInnerRadius, outerRadius = d3_svg_arcOuterRadius, startAngle = d3_svg_arcStartAngle, endAngle = d3_svg_arcEndAngle;
        function arc() {
            VESPER.log ("this", this);
            var r1 = outerRadius.apply(this, arguments), a0 = startAngle.apply(this, arguments) + d3_svg_arcOffset, a1 = endAngle.apply(this, arguments) + d3_svg_arcOffset, da = (a1 < a0 && (da = a0,
                a0 = a1, a1 = da), a1 - a0), df = da < π ? "0" : "1", c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
            return da >= d3_svg_arcMax
                ? ("M0," + r1 + "A" + r1 + "," + r1 + " 0 1,1 0," + -r1 + "A" + r1 + "," + r1 + " 0 1,1 0," + r1)
                : ("M" + r1 * c0 + "," + r1 * s0 + "A" + r1 + "," + r1 + " 0 " + df + ",1 " + r1 * c1 + "," + r1 * s1)
                ;
        }
        arc.innerRadius = function(v) {
            if (!arguments.length) return innerRadius;
            innerRadius = d3.functor(v);
            return arc;
        };
        arc.outerRadius = function(v) {
            if (!arguments.length) return outerRadius;
            outerRadius = d3.functor(v);
            return arc;
        };
        arc.startAngle = function(v) {
            if (!arguments.length) return startAngle;
            startAngle = d3.functor(v);
            return arc;
        };
        arc.endAngle = function(v) {
            if (!arguments.length) return endAngle;
            endAngle = d3.functor(v);
            return arc;
        };
        arc.centroid = function() {
            var r = (innerRadius.apply(this, arguments) + outerRadius.apply(this, arguments)) / 2, a = (startAngle.apply(this, arguments) + endAngle.apply(this, arguments)) / 2 + d3_svg_arcOffset;
            return [ Math.cos(a) * r, Math.sin(a) * r ];
        };
        return arc;
    };
    var d3_svg_arcOffset = -π / 2, d3_svg_arcMax = 2 * π - 1e-6;
    function d3_svg_arcInnerRadius(d) {
        return d.innerRadius;
    }
    function d3_svg_arcOuterRadius(d) {
        return d.outerRadius;
    }
    function d3_svg_arcStartAngle(d) {
        return d.startAngle;
    }
    function d3_svg_arcEndAngle(d) {
        return d.endAngle;
    }

    var sunburstLayout = {

        cutoffVal: 0.05,

        sizeBounds: function () {
            var radius = d3.min(dims) / 2;
            VESPER.log ("DIMS", dims, radius);
            return [2 * Math.PI, radius * radius];
        },

        sharedAttrs: function (group) {
            group
                //.style ("fill", function(d) { var node = getNode (d.id); var s = model.getSelectionModel().contains(d.id); var p = (node.sdcount || 0) / (node.dcount || 1); return (p && !s) ? colourScale (p) : null; })
                .attr ("class", function(d) { var node = getNode (d.id) /*d*/; return "fatarc "+ (model.getSelectionModel().contains(d.id) ? "selected" : (node.sdcount > 0 ? "holdsSelected" : "unselected")); })
            ;
        },

        sharedTextAttrs: function (sel) {
            function rotate (d, elem) {
                return d.dx > d.dy && d3.select(elem).node().getComputedTextLength() < d.dx - 4;
            }

            sel
                .attr ("transform", function (d) {
                return "translate ("+ (d.x)+","+ d.y+")"
                   // + " rotate ("+(rotate(d, this) ? 90 : 0)+" "+(d.dy/2)+" 0)"
                    //: "rotate (0 0,0)"
                    ;
                })
                //.attr ("clip-path", function (d) { var node = getNode (d.id) /*d*/; return rotate(d, this) ? null : "url(#depthclip0)"; /*"url(#depthclip"+node.depth+")";*/})
            ;
        },



        arc: d3.svg.arc()
            .startAngle(function(d) { return d.x; })
            .endAngle(function(d) { return d.x + d.dx; })
            .innerRadius(function(d) { return Math.sqrt(d.y); })
            .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); })
        ,

        parc: d3.svg.parc()
            .startAngle(function(d) { return d.x; })
            .endAngle(function(d) { return d.x + d.dx; })
            .innerRadius(function(d) { return Math.sqrt(d.y); })
            .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); })
        ,


        // Stash the old values for transition.
        stash: function (d) {
            cstore[d.id] = {x0: d.x, dx0: d.dx, y0: d.y, dy0: d.dy};
        },

        // Interpolate the arcs in data space.
        arcTween: function (a) {
            //VESPER.log ("a", a, a.dx0);
            var cs = cstore [a.id];
            var i = d3.interpolate({x: cs.x0, dx: cs.dx0, y: cs.y0, dy: cs.dy0}, a);
            return function(t) {
                var b = i(t);
                cs.x0 = b.x;
                cs.dx0 = b.dx;
                cs.y0 = b.y;
                cs.dy0 = b.dy;
                return sunburstLayout.arc(b);
            };
        },

        prep: function (coordSet) {
            treeG.attr("transform", "translate(" + dims[0] / 2 + "," + dims[1] * .52 + ")");
           // partitionLayout.makeTextClips (coordSet);
        },

        removeOld: function (exitSel) {
            clearMouseController (exitSel);
            exitSel
                .each (function() {
                    var id = d3.select(this).datum().id;
                    cstore[id] = undefined;
                })
            ;
            NapVisLib.d3fadeAndRemoveGroups ([exitSel], exitDur, 0);
        },

        makeNew: function (enterSel) {

            var newNodes = enterSel
                .append ("svg:g")
                .attr("class", "treeNode")
                .style("opacity", 0)
            ;

            /*
            var tegs = newNodes
                    .append("path")
                    //.attr("display", function(d) { var node = getNode (d.id); return node.depth ? null : "none"; }) // hide inner ring
                    .attr("d", sunburstLayout.parc)
                    .attr ("id", function(d) { return "tarc"+ d.id; })
                    .style ("visibility", "hidden")
                    //.each(sunburstLayout.stash)
                ;
            */
            var newSegs = newNodes
                .append("path")
                //.attr("display", function(d) { var node = getNode (d.id); return node.depth ? null : "none"; }) // hide inner ring
                .attr("d", sunburstLayout.arc)
                .attr ("id", function(d) { return "arc"+ d.id; })
                //.style("fill", function(d) { var node = getNode (d.id); return color(model.getTaxaData(model.getSubTaxa(node) ? node : node.parent)[rankField]); })
                .call (sunburstLayout.sharedAttrs)
                .call (mouseController)
                .each(sunburstLayout.stash)
            ;

            /*
            newNodes.append ("svg:text")
                //.text (function(d) { return model.getTaxaData(node)[nameField]; })
                //.attr ("text-anchor", "middle")
                .style ("visibility", function (d) { return d.dx > 1 ? "visible": "collapse"; })
                //.call (sunburstLayout.sharedTextAttrs)
                .append ("svg:textPath")
                    .attr ("startOffset", "0%")
                    .attr ("spacing", "auto")
                    .attr ("xlink:href", function(d) { return "#tarc"+ d.id; })
                    //.attr("dy","1em")
                    .append ("svg:tspan")
                        .attr ("dy", "1em")
                        //.attr ("text-anchor", "middle")
                        .text (function(d) { var node = getNode (d.id); return model.getTaxaData(node)[nameField]; })

                //.attr ("clip-path", function (d) { var node = getNode (d.id); return "url(#depthclip"+node.depth+")"; })
            ;
            */
            //newSegs
            //    .append("svg:title")
            //    .text(function(d) {
            //        return tooltipString (getNode (d.id), model);
            //    })
           // ;

            return newNodes;
        },

        redrawExistingNodes: function (group, delay) {
           group
               .select("path.fatarc")
               .call (sunburstLayout.sharedAttrs)
                .transition()
                .delay (delay)
                .duration(updateDur)
                .attrTween("d", sunburstLayout.arcTween)
                //.style("fill", function(d) { var node = getNode (d.id) /*d*/; return model.getSelectionModel().contains(d.id) ? "#ff0000" :
                 //   (node.sdcount > 0 ? "#ffa080" : color(model.getTaxaData(model.getSubTaxa(node) ? node : node.parent)[rankField])); })
                .each ("end", sunburstLayout.stash)
            ;

            group.select("text")
                .style ("visibility", function (d) { return d.dx > 1 ? "visible": "collapse"; })
                //.attr ("clip-path", function (d) { var node = getNode (d.id) /*d*/; return "url(#depthclip"+node.depth+")"; })
                //.transition()
                //.delay (delay)
                //.duration (updateDur)
                //.call (sunburstLayout.sharedTextAttrs)
            ;
        }
    };

    var layoutOptions = {icicle: partitionLayout, sunburst: sunburstLayout};

    this.set = function (fields, mmodel) {
        VESPER.log ("set args", arguments, d3.select(divid).node());
        keyField = fields.identifyingField;
        nameField = fields.nameField;
        rankField = fields.rankField;
        dims = NapVisLib.getWidthHeight (d3.select(divid).node());
        model = mmodel;
    };

	
	this.go = function () {
        var vals = model.getSelectionModel().values();
        var root = (vals.length == 1) ? getNode(vals[0]) : model.getRoot();
        if (root === undefined) {
            VESPER.log ("no root defined for tree");
            return;
        }

		absRoot = root;
		thisView = this;
		
		svg = d3.select(divid)
			.append("svg:svg")
			.attr("class", "visContainer")
			.attr("pointer-events", "all")
		;
		
		svg.append ("defs");
		
		treeG = svg
			.append ("svg:g")
			.attr("class", "treeSVG")
		;

        var spaceAllocs = d3.values(spaceAllocationOptions);
        for (var n = 0; n < spaceAllocs.length; n++) {
            var indAlloc = spaceAllocs[n];
            //indAlloc.size ([dims[1], dims[0]]);
            //indAlloc.size (partitionLayout.sizeBounds());
        }
        spaceAlloc = spaceAllocationOptions.bottomUp;
		curSort = sortOptions.alpha;
        layout = layoutOptions.sunburst;

		//depthCharge (root);
        setupControls ();

        //$('[title!=""]').qtip();
		
		this.update ();
	};



    function setupControls () {
        var noHashId = divid.substring (1);
        var cpanel = d3.select(divid)
            .append("span")
            .attr ("class", "visControl")
            .attr ("id", noHashId+"controls")
        ;

        cpanel.append("p").html("Space Allocation");
        var allocBinds = cpanel.selectAll("button.allocChoice")
            .data(d3.entries (spaceAllocationOptions), function(d) { return d.key; });
        var aHolders = allocBinds.enter()
            .append ("span")
            .attr ("class", "fieldGroup")
        ;
        aHolders.append("input")
            .attr ("class", "allocChoice")
            .attr ("type", "radio")
            .attr ("id", function(d) { return noHashId+ d.key; })
            .attr ("name", function(d) { return noHashId+"alloc"; })
            .property ("checked", function(d) { return spaceAlloc === d.value; })
            .on ("change", function(d) {
               // if (spaceAlloc !== d.value) {
                    spaceAlloc = d.value;
                    reroot (curRoot);
                    //thisView.update();
               // }
                return false;
            })
        ;
        aHolders.append("label")
            .attr ("for", function(d) { return noHashId+ d.key; })
            .html (function(d) { return d.key; })
        ;

        cpanel.append("p").html("Layout Style");
        var layoutBinds = cpanel.selectAll("button.layoutChoice")
            .data(d3.entries (layoutOptions), function(d) { return d.key; });
        var lHolders = layoutBinds.enter()
            .append ("span")
            .attr ("class", "fieldGroup")
        ;
        lHolders.append ("input")
            .attr ("class", "layoutChoice")
            .attr ("type", "radio")
            .attr ("id", function(d) { return noHashId+ d.key; })
            .attr ("name", function(d) { return noHashId+"layout"; })
            .property ("checked", function(d) { return layout === d.value; })
            .on ("change", function(d) {
               // if (layout !== d.value) {
                    layout = d.value;
                    var nodeBind = treeG.selectAll(".treeNode");
					clearMouseController (nodeBind);
                    nodeBind.remove();
                    reroot (curRoot);
               // }
                return false;
            })
            .html (function(d) { return d.key; })
        ;
        lHolders.append ("label")
            .attr("for", function(d) { return noHashId+ d.key; })
            .html (function(d) { return d.key; })
        ;
		
		cpanel.append("p").html("Sort");
        var sortBinds = cpanel.selectAll("button.sortChoice")
            .data(d3.entries (sortOptions), function(d) { return d.key; });
        var sHolders = sortBinds.enter()
            .append ("span")
            .attr ("class", "fieldGroup")
        ;
        sHolders.append ("input")
            .attr ("class", "sortChoice")
            .attr ("type", "radio")
            .attr ("id", function(d) { return noHashId+ d.key; })
            .attr ("name", function(d) { return noHashId+"sort"; })
            .property ("checked", function(d) { return curSort === d.value; })
            .on ("change", function(d) {
               // if (layout !== d.value) {
                    curSort = d.value;
                    reroot (curRoot);
               // }
                return false;
            })
            .html (function(d) { return d.key; })
        ;
        sHolders.append ("label")
            .attr("for", function(d) { return noHashId+ d.key; })
            .html (function(d) { return d.key; })
        ;

        $(function() {
            $("#"+noHashId+"controls").draggable();
        });
    }


	function getNode (id) {
        return model.getNodeFromID(id);
    }


    function reroot (root) {
        if (firstLayout) {
            if (VESPER.alerts) { alert ("about to calc layout"); }
            firstLayout = false;
        }

        spaceAlloc
            .size (layout.sizeBounds())
            .cutoff (layout.cutoffVal)
			.sort (curSort)
        ;
        VESPER.log ("what alloc reports ",spaceAlloc.size());
        VESPER.log ("root", root);
        var coordSet = spaceAlloc.nodes (root);
        VESPER.log (coordSet.length, coordSet);
        curRoot = root;

        var nodeBind = treeG
                .selectAll(".treeNode")
                .data(coordSet, function(d) { return d.id /*d[DWCAParser.TDATA][keyField]*/; })
            ;

        layout.prep (coordSet);

        // remove old nodes
        layout.removeOld (nodeBind.exit());
        var cumDelay = (nodeBind.exit().empty() ? 0 : exitDur);

        // process existing nodes
        layout.redrawExistingNodes (nodeBind, cumDelay);
        cumDelay += (nodeBind.empty()) ? 0 : updateDur;

        // add new nodes
        var newNodes = layout.makeNew (nodeBind.enter());
        VESPER.log (newNodes);
        NapVisLib.d3fadeInNewGroups ([newNodes], enterDur, cumDelay);
    }


	this.update = function () {
        var vals = model.getSelectionModel().values();
        var root = (vals.length == 1) ? getNode(vals[0]) : model.getRoot();
        VESPER.log ("Root", root, vals[0]);

        model.countSelectedDesc (root, keyField);
        //VESPER.DWCAParser.countSelectedDesc (root, model.getSelectionModel(), keyField);
        reroot (root);
	};

    this.updateVals = this.update;


    this.redraw = function () {
        var nodes = treeG.selectAll(".treeNode");
        layout.redrawExistingNodes (nodes, 0);
    };


    this.destroy = function () {
        clearMouseController (treeG.selectAll(".treeNode"));
        treeG.selectAll(".treeNode").remove();
        model.removeView (self);
        model = null;
        DWCAHelper.twiceUpRemove(divid);
    };


    function clearMouseController (group) {
        group
            .on ("click", null)	// remove event handler
            .on ("mouseover", null)	// remove event handler
            .on ("mouseout", null)	// remove event handler
            .on ("contextmenu", null) // remove event handler
        ;
    }

	function mouseController (group) {
        group.on("click", function (d) {
            var node = getNode (d.id) /*d*/;
            reroot ((node == curRoot && node.parent != undefined) ? node.parent : node);
        })
        .on("mouseover", function(d) {
            d3.select(this).classed("highlight", true);
            //handle mouse over
            var node = getNode (d.id) /*d*/;
            var val = tooltipString (node, model);
            VESPER.tooltip.updateText (model.getTaxaData(node)[nameField], val);
            VESPER.tooltip.updatePosition (d3.event);
        })
        .on ("mouseout", function(d) {
            d3.select(this).classed("highlight", false);
        })
        .on("contextmenu", function(d) {
            //handle right click
            selectSubTree (getNode (d.id));
            //stop showing browser menu
            d3.event.preventDefault();
        });

    }

    function selectSubTree (node) {
        model.getSelectionModel().clear();
        var ids = [];
        selectSubTreeR (node, ids);
        model.getSelectionModel().addAllToMap(ids);
    }

    function selectSubTreeR (node, ids) {
        var id = model.getTaxaData(node)[keyField];
        ids.push(id);

        var taxa = model.getSubTaxa (node);
        if (taxa != undefined) {
            for (var n = 0; n < taxa.length; n++) {
                selectSubTreeR (taxa[n], ids);
            }
        }
        var specs = model.getSpecimens (node);
        if (specs != undefined) {
            for (var n = 0; n < specs.length; n++) {
                selectSubTreeR (specs[n], ids);
            }
        }
    }


	function reset() {
		d3.event.scale = 1.0;
		d3.event.translate = [0,0];
		zoomObj.translate([0,0]).scale(1);
		//redraw ();
	}
};;VESPER.tooltip = new function () {
    this.holdDuration = 10000;
    this.fadeDuration = 200;
    var self = this;

    this.init = function () {
        var tooltip = d3.select("body").selectAll("#vesperTooltip").data([0])
            .enter()
            .append("div")
                .attr ("id", "vesperTooltip")
                .attr ("class", "vesperTooltip")
                .style ("visibility", "hidden")
        ;
        tooltip.append("h2");
        tooltip.append("p");
    };

    this.setToFade = function () {
        var tooltip = d3.select("#vesperTooltip");
        tooltip
            .transition()
            .duration (self.fadeDuration)
            .style ("opacity", 0)
            .each ("end", function () {
                d3.select(this).style ("visibility", "hidden");
            })
        ;
    };

    this.updateText = function (title, str) {
        var tooltip = d3.select("#vesperTooltip");
        tooltip.select("h2").text(title);
        tooltip.select("p").html(str);
        tooltip
            .style ("visibility", "visible")
            .style ("opacity", null)
            .transition()
            .duration(self.holdDuration)
            .each ("end", function() {
                d3.select(this)
                    .transition()
                    .duration (self.fadeDuration)
                    .style ("opacity", 0)
                    .each ("end", function () {
                        d3.select(this).style ("visibility", "hidden");
                    })
                ;
            })
        ;
    };

    this.updatePosition = function (e) {
        var tooltip = d3.select("#vesperTooltip");
        tooltip
            .style ("top", (e.pageY+10)+"px")
            .style ("left", (e.pageX+10)+"px")
        ;
     };
};;/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 02/10/13
 * Time: 16:05
 * To change this template use File | Settings | File Templates.
 */

VESPER.VisLauncher = function (divid) {

    var model;
    var self = this;
    var keyField, nameField, dims, choiceData;
    var handleElement = "h3";

    this.set = function (fields, mmodel) {
        keyField = fields.identifyingField;
        nameField = fields.nameField;
        choiceData = fields.visChoiceData;
        dims = NapVisLib.getWidthHeight (d3.select(divid).node());
        model = mmodel;
    };


    this.go = function () {
        var buttonVisBlockSel = d3.select(divid);
        setVisChoices (choiceData, buttonVisBlockSel);
        showButtons (buttonVisBlockSel);
        setSelectionOps ();
    };

    this.update = function () {};

    this.updateVals = this.update;


    function setVisChoices (data, parentDivSel) {
        var visChoices = parentDivSel.selectAll("button").data (data);
        visChoices.enter()
            .append ("button")
            .attr ("class", "visChoice")
            .attr ("type", "button")
            .attr ("id", function(d) { return d.title;})
            .text (function(d) { return d.title; })
            .on ("click", function(d) {
                self.makeVis (d, model);
                return false;
            })
        ;
    }

    function setSelectionOps () {
        d3.select(divid).append("hr");
        d3.select(divid).append ("h4").text("Selection Ops");


        if (window.requestFileSystem) {
            d3.select(divid).append("button")
                .attr ("type", "button")
                //.attr ("id", "save")
                .text ("SAVE")
                .on ("click", function(d) {
                    NapVisLib.prepareForWrite (NapVisLib.writeArray, model.getSelectionModel().values());
                })
            ;
        } else {
            NapVisLib.html5Lacks(d3.select(divid), "[Browser does not support FileWriter]");
        }

        d3.select(divid).append("button")
            .attr ("type", "button")
            //.attr ("id", "compareSel")
            .text ("COMPARE MODEL")
            .on ("click", function() {
                VESPER.modelBag.push ({"model":model, "name":nameField});
                VESPER.log ("ModelBag", VESPER.modelBag);
                if (VESPER.modelBag.length > 1) {
                    VESPER.modelComparisons.modelCoverageToSelection(VESPER.modelBag[0].model, VESPER.modelBag[1].model, VESPER.modelBag[0].name, VESPER.modelBag[1].name);
                    VESPER.modelBag.length = 0;
                }
            })
        ;

        d3.select(divid).append("button")
            .attr ("type", "button")
            //.attr ("id", "clearSel")
            .text ("CLEAR")
            .on ("click", function(d) {
            model.getSelectionModel().clear();
            model.getSelectionModel().update();
        })
        ;
    }

    function showButtons (divSel) {
        var visChoices = divSel.selectAll("button.visChoice");
        visChoices.style("display", function(d) {
            var fileData = model.getMetaData().fileData;
            var indices = VESPER.DWCAParser.findFields (fileData, d.attList, "filteredFieldIndex");
            var nullCount = NapVisLib.countNulls (indices);
            //VESPER.log (d.title, nullCount);
            return (indices.length == 0 || (d.matchAll && nullCount === 0) || (!d.matchAll && nullCount < indices.length))
                ? "block" : "none"
                ;
        })
    }

    this.makeVis = function (details, aModel) {
        var id = aModel.name + "view" + (details.multiple ? aModel.getNextSessionModelViewID() : "");
        id = id.replace(/\s+/g, '');    // Spaces not allowed in html5 ID's
        var vid = details.title + " " + aModel.name;

        if (d3.select("#"+id).empty()) {
            var newDiv = d3.select("#allVisDiv")
                .append("div")
                .attr("class", "visWrapper")
                .attr ("id", id+"container")
                .style("width", details.width ? details.width : "50%")
            ;
            newDiv.append(handleElement).text(vid);
            var indVisDiv = newDiv.append("div").attr("class", "vis").attr("id", id).style("height", details.height);

            var coreType = aModel.getMetaData().coreRowType;
            var fileData = aModel.getMetaData().fileData;
            var coreFieldIndex = fileData[coreType].filteredFieldIndex;

            var newVis = details.newVisFunc ("#"+id);
            VESPER.log ("newvis", newVis, newVis.set);
            var keyFields = details.setupFunc (coreFieldIndex) || {};
            keyFields.identifyingField = VESPER.DWCAParser.getFilteredIdIndex (aModel.getMetaData());
            newVis.set (keyFields, aModel);
            aModel.addView (newVis);
            newVis.go (aModel);

            DWCAHelper.addKillViewButton (newDiv.select(handleElement), newDiv, newVis);
            // draggy causing more problems in timeline

            //if (details.title != "Map") { // map selection goes funny if I make it draggable
                $(function() {
                    $("#"+id+"container").draggable({ handle: handleElement});
                });
           // }

        }
    };

    this.destroy = function () {
        var vizzes = model.getSelectionModel().getVis();
        for (var n = 0; n < vizzes.length; n++) {
            if (vizzes[n] !== self) {
                if (vizzes[n].destroy) {
                    vizzes[n].destroy ();
                }
                model.removeView (vizzes[n]);
            }
        }

        DWCAHelper.recurseClearEvents (d3.select(divid));

        model.removeView (self);
        model = null;
        DWCAHelper.twiceUpRemove(divid);
    }
};
