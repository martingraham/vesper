var MGNapier = MGNapier || {};

MGNapier.NapVisLib = new function () {

    // Requires D3
	// shared functions for visualisations

    var NapVisLib = this;   // local ref so I don't have to change everything
	
	this.getDivDims = function (divid) {
		var div = document.getElementById (divid.substring(1)); // hack off '#' from beginning of id
		//var w = div.scrollWidth;	// make svg fit div area
		//var h = div.scrollHeight;
		var w = div.clientWidth;	// make svg fit div area
		var h = div.clientHeight;
		return {"width" :w, "height" : h};
	};
	
	
	//From http://stackoverflow.com/questions/641857/javascript-window-resize-event
	//Used to hook into window resize events
	this.addEvent = function (elem, type, eventHandle) {
		 if (elem == null || elem == undefined) return;
		 if (elem.addEventListener) {
		     elem.addEventListener (type, eventHandle, false);
		 } else if (elem.attachEvent) {
		     elem.attachEvent ("on" + type, eventHandle);
		 } else {
		     elem["on"+type]=eventHandle;
		 }
	};
	
	
	this.showProps = function (whatever) {
		
		var arr = [];
		
		for (var prop in whatever) {
			if (whatever.hasOwnProperty (prop) && prop !== "responseText" && prop !== "responseXML") {
				arr.push (prop);
			}
		}

        /*
		arr.sort (function (val1, val2) {
			return (val1 > val2 ? 1 : (val1 < val2 ? -1 : 0));
		});
		*/
		
		for (var n = 0; n < arr.length; n++) {
			console.log (arr[n]+" : ", whatever[arr[n]]);
		}
	};
	
	
	this.getStyle = function (elem) {
		var computedStyle;
		if (typeof elem.currentStyle != 'undefined') {
			computedStyle = elem.currentStyle; }
		else {
			computedStyle = document.defaultView.getComputedStyle (elem, null);
		}
		return computedStyle;
	};
	
	
	this.getStyle3 = function (styleSheetIndex, styleSheetURL, mySelectorText) {
		if (document.styleSheets) {
			//console.log (document.styleSheets);
			var styleSheet;
			
			// Attempt to match stylesheet by url ending
			for (var i = 0; i < document.styleSheets.length; i++) {
				if (document.styleSheets[i].href.search(styleSheetURL) >= 0) {
					styleSheet = document.styleSheets[i];
					break;
				}
			}
			//console.log ("match by url", styleSheet);
			
			if (styleSheet === undefined) {
				styleSheet = document.styleSheets[styleSheetIndex];
			}
			//console.log (styleSheet);
			
			 if (styleSheet !== undefined) {
				 var rules;
				 
				 //console.log ("stylesheet", styleSheet);
				 
				 if (styleSheet.cssRules) {
					 rules = styleSheet.cssRules;
				 }
				 else if (styleSheet.rules) {
					 rules = styleSheet.rules;
				 }
				 
				 var found = -1;
				 if (rules) {
					 for (var i = 0; i < rules.length; i++) {
						 if (rules[i].selectorText === mySelectorText) {
							 found = i;
							 break;
						 }
					 }
					 return (found === -1 ? null : rules[i]);
				 }
			 }
		}
		
		return null;
	};

    this.getWidthHeight = function (elem, zeroIsWrong) {
        var dims = [elem.clientWidth, elem.clientHeight];
        if (dims[0] === 0 && zeroIsWrong) {
            var style = this.getStyle (elem);
            dims = [parseInt(style.width), parseInt(style.height)];
        }
        //console.log ("dims", dims);
        return dims;
    };
	
	
	this.getValueFromRule = function (rule, property) {
		return rule == null ? null : rule.style[property];
	};
		 
	
	
	this.getSelectedStylesheetRefs = function (doc) {
		//console.log ("DOC", doc, doc.selectedStyleSheetSet);
		//NapVisLib.showProps (doc);
		var selectedStyle = doc.selectedStyleSheetSet;
		var refs = [];
		
		if (doc.styleSheets) {
			for (var n = 0; n < doc.styleSheets.length; n++) {
				if (doc.styleSheets[n].title === selectedStyle) {
					refs.push (doc.styleSheets[n].href);
				}
			}
		}
		
		//console.log ("Refs", refs);
		return refs;
	};
	
	
	this.drawButton = function (appendHere, text, x, y, width, height) {
		var button = appendHere.append ("svg:g")
			.attr ("transform", "translate("+x+","+y+")")
		;
		
		var baseElem = button.append("svg:rect")
			.attr ("class", "buttonbase")
			.attr ("width", width)
			.attr ("height", height)
			.attr ("x", 0)
			.attr ("y", 0)
			.attr ("ry", 10)
		;
		var textElem = button.append ("svg:text")
			.attr ("x", width / 2)
			.attr ("y", ((height + 10) / 2))
			.attr ("text-anchor", "middle")
			.attr ("class", "controlText")
			.text (text)
		;
		
		return {"base":baseElem, "text":textElem};
	};
	
	
	// funcArray is array of objects with properties
	// name: name of function
	// func: function
	// args: args to apply to that function
	// iterations decides how mnay times to run each function
	// output is timings for functions for speed testing
	this.speedTest  = function(funcArray, iterations) {	
		for (var n = 0; n < funcArray.length; n++) {
			var funcRecord = funcArray [n];
			var func = funcRecord.func;
			var args = funcRecord.args;
			var start = makeTime();
			for (var  m= 0; m < iterations; m++) {
				func.apply (this, args);
			}
			var diff = makeTime() - start;
			console.log ("time for "+funcRecord.name+": "+diff+" ms.");
		}
	};
	
	
	// fires an array of stuff to log4javascript's log.info function
	// but not before turning the array into a tab-separated string so the output can be cut'n'pasted as a .tsv file
	this.loginfowrap = function (llog, details) {
		if (llog) {
			var str = "";
			for (var n = 0; n < details.length; n++) {
				str += details[n];
				if (n < details.length - 1) {
					str += "\t";
				}
			}
			
			//console.log ("str", str, llog);
			llog.info (str);
		}
	};
	
	
	
	
	this.resetStopwatch = function (stopwatch) {
		stopwatch.base = this.makeTime();
	};
	
	
	this.elapsedStopwatch = function (stopwatch) {
		return NapVisLib.makeTime() - stopwatch.base;
	};
	
	
	// Fades out old groups (usually .exit() sets)
	this.d3fadeAndRemoveGroups = function (groupArray, fadeDur, fWait) {
		for ( var ai = 0; ai < groupArray.length; ai++) {
			groupArray[ai].transition().delay(fWait).duration(fadeDur)
                .style("opacity", 0.0).remove();
		}
	};

	// Fades in new groups (usually .enter() sets)
	this.d3fadeInNewGroups = function (groupArray, fadeDur, fWait) {
		for ( var ai = 0; ai < groupArray.length; ai++) {
			groupArray[ai].transition().delay(fWait).duration(fadeDur)
                .style("opacity", 1.0);
		}
	};

	// From http://stackoverflow.com/questions/1295584/most-efficient-way-to-create-a-zero-filled-javascript-array
	this.newFilledArray = function (length, val) {
		var array = [];
		var i = 0;
		while (i < length) {
			array[i++] = val;
		}
		return array;
	};

	this.arrayClear2D = function (arrayToClear) {
		for ( var i = 0; i < arrayToClear.length; i++) {
			for ( var j = 0; j < arrayToClear[i].length; j++) {
				arrayToClear[i][j] = 0;
			}
		}
	};

	this.arrayCopy2D = function (copyFrom, copyTo) {
		for ( var i = 0; i < copyFrom.length; i++) {
			for ( var j = 0; j < copyFrom[i].length; j++) {
				copyTo[i][j] = copyFrom[i][j];
			}
		}
	};

	this.makeGraph = function (dataModel, linkThese, byThese, linkTheseName, byTheseName) {
		var nodeCount = linkThese.length;
		//var byCount = byThese.length;
		//var i = 0;
		var final_array = {};

		// set up final array
		for ( var j = 0; j < nodeCount; j++) {
			final_array[linkThese[j].key] = {};
		}
		
		var lmap = {};
		for (var n = 0; n < linkThese.length; n++) {
			var lEntry = linkThese [n];
			var bArray = lEntry.value[byTheseName];

			if (bArray && bArray instanceof Array && bArray.length > 0) {
				for (var m = 0; m < bArray.length; m++) {
					var bid = bArray [m];
					if (! lmap[bid]) {
						lmap[bid] = [];
					}
					lmap[bid].push (lEntry.key);
				}
			}
		}
		
		for (var bid in lmap) {
			if (lmap.hasOwnProperty (bid)) {
				fullSubGraph (lmap[bid], final_array);
			}
		}

		return final_array;
	};


    this.makeGraph2 = function (dataModel, fromThese, toThese, byThese, linkTheseName, andTheseName, byTheseName) {
        var xnodeCount = fromThese.length;
        //var ynodeCount = toThese.length;
        //var byCount = byThese.length;
        //var i = 0;
        var final_array = {};
        var sources = [];
        var targets = [];
        var bid, bArray;

        //console.log ("ARGS", arguments);

        var selflink = (linkTheseName === andTheseName);

        // set up final array
        for ( var j = 0; j < xnodeCount; j++) {
            final_array[fromThese[j].key] = {};
        }
        var lmap = {};

        for (var n = 0; n < fromThese.length; n++) {
            var lEntry = fromThese [n];
            sources.push (lEntry.key);
            bArray = lEntry.value[byTheseName];
            if (bArray && bArray instanceof Array && bArray.length > 0) {
                for (var m = 0; m < bArray.length; m++) {
                    bid = bArray [m];
                    if (! lmap[bid]) {
                        lmap[bid] = {from:[], to:[]};
                    }
                    lmap[bid].from.push (lEntry.key);
                }
            }
        }

        for (n = 0; n < toThese.length; n++) {
            var tEntry = toThese [n];
            targets.push (tEntry.key);
            bArray = tEntry.value[byTheseName];
            if (bArray && bArray instanceof Array && bArray.length > 0) {
                for (var m = 0; m < bArray.length; m++) {
                    bid = bArray [m];
                    if (! lmap[bid]) {
                        lmap[bid] = {from:[], to:[]};
                    }
                    lmap[bid].to.push (tEntry.key);
                }
            }
        }

        for (bid in lmap) {
            if (lmap.hasOwnProperty (bid)) {
                fullSubGraph2 (lmap[bid], final_array);
            }
        }

        if (selflink) {
            for (j = 0; j < sources.length; j++) {
                var source = sources[j];
                for ( var k = 0; k < targets.length; k++) {
                    var target = targets[k];
                    if (final_array[source] && final_array[source][target]) {
                        final_array[source][target] /= 2;
                    }
                }
            }
        }

        //console.log ("FINAL_ARRAY", final_array, sources, targets);
        return {data: final_array, sources: sources, targets: targets};
    };


    function fullSubGraph2 (list, array2D) {
        for ( var j = 0; j < list.from.length; j++) {
            var source = list.from[j];

            for ( var k = 0; k < list.to.length; k++) {
                var target = list.to[k];

                if (array2D[source] == undefined) {
                    array2D[source] = {};
                }

                if (array2D[target] == undefined) {
                    array2D[target] = {};
                }

                if (array2D[source][target] == undefined) {
                    array2D[source][target] = 0;
                    array2D[target][source] = 0;
                }

                array2D[source][target]++;
                array2D[target][source]++;
            }
        }
    }


	function fullSubGraph (list, array2D) {
		for ( var j = 0; j < list.length; j++) {
			var source = list[j];

			for ( var k = j; k < list.length; k++) {
				var target = list[k];

				if (array2D[source] == undefined) {
					console.log("no " + source + " defined");
				}

				if (array2D[source][target] == undefined) {
					array2D[source][target] = 0;
					array2D[target][source] = 0;
				}

				array2D[source][target]++;
				if (source !== target) { // don't mirror count self refs
					array2D[target][source]++;
				}
			}
		}
	}



	this.makeTime = function () {
		if (window.performance && window.performance.now) {
		    //console.log("Using high performance timer");
		    getTimestamp = function() { return window.performance.now(); };
		} else {
		    if (window.performance && window.performance.webkitNow) {
		        //console.log("Using webkit high performance timer");
		        getTimestamp = function() { return window.performance.webkitNow(); };
		    } else {
		        //console.log("Using low performance timer");
		        getTimestamp = function() { return new Date().getTime(); };
		    }
		}
		
		return getTimestamp();
	};
	
	
	
	
	this.zip = function (arrays) {
	    return arrays[0].map(function(_,i){
	        return arrays.map(function(array){return array[i];});
	    });
	};
	
	
	// Object version of array filter
	this.objFilter = function (obj, predicate) {
	    var result = {};
	
	    for (var key in obj) {
	        if (obj.hasOwnProperty(key) && !predicate(obj[key])) {
	            result[key] = obj[key];
	        }
	    }
	
	    return result;
	};


    // object property count
    this.countObjProperties = function (obj) {
        var c = 0;
        for(var p in obj) {
            if(obj.hasOwnProperty(p)) { c++; }
        }
        return c;
    };


	
	// IE Fudge
	// Adapted from http://stackoverflow.com/questions/1095102/how-do-i-load-binary-image-data-using-javascript-and-xmlhttprequest
	// IE-specific logic here
	// helper to convert from responseBody to a "responseText" like thing
	this.getBinaryFromXHR = function (xhr) {
      var binary = xhr.responseBody; // only available in ie
      var byteMapping = {};
      for ( var i = 0; i < 256; i++ ) {
         for ( var j = 0; j < 256; j++ ) {
            byteMapping[ String.fromCharCode( i + (j << 8) ) ] =
               String.fromCharCode(i) + String.fromCharCode(j);
         }
      }
      var rawBytes = IEBinaryToArray_ByteStr(binary);
      var lastChr = IEBinaryToArray_ByteStr_Last(binary);
      return rawBytes.replace(/[\s\S]/g, function( match ) {
            return byteMapping[match];
      }) + lastChr;
   };
   
   
	// Until JQuery supports binary reads in IE
	this.xhr = function(url, mime, callback) {
	    var req = new window.XMLHttpRequest ();
	   
	    if (arguments.length < 3) { 
            callback = mime, mime = null;
	    }
	    else if (mime && req.overrideMimeType) {
            req.overrideMimeType(mime);
	    }
	    req.open("GET", url, true);

	    if (mime) {
            req.setRequestHeader("Accept", mime);
	    }
	    req.onreadystatechange = function() {
	      if (req.readyState === 4) {
	        var s = req.status;
	        callback(!s && req.response || s >= 200 && s < 300 || s === 304 ? req : null);
	      }
	    };
	    req.send(null);
	  };
	  
	  
	this.jqueryXhr = function(url, mime, callback) {
		 $.ajax(
             url ,
             {
			  mimeType: mime,
			  headers: {"Accept":mime}
		})
        .done(function (data, ts, req) {
	        callback (req);
		});
	};


    // Until JQuery supports binary reads in IE
    this.xhr2 = function(url, mime, callback) {
        var req = new XMLHttpRequest ();

        if (arguments.length < 3) {
            callback = mime, mime = null;
        }
        //else if (mime && req.overrideMimeType) {
            //req.overrideMimeType(mime);
        //}
        req.open("GET", url, true);
        req.responseType = "arraybuffer";

        if (mime) {
            req.setRequestHeader("Accept", mime);
        }
        req.onreadystatechange = function() {
            if (req.readyState === 4) {
                var s = req.status;
                callback(!s && req.response || s >= 200 && s < 300 || s === 304 ? req : null);
            }
        };
        req.send(null);
    };




    this.jqueryXhr2 = function(url, mime, callback) {
        $.ajax(
            url ,
            {
                responseType: "arrayBuffer",
                mimeType: mime,
                headers: {"Accept":mime}
            })
            .done(function (data, ts, req) {
                callback (req);
            });
    };

    this.getText = function (xhr) {
        var textLoaded;

        // Browser differences with xhr:
        // IE9 (and below):
        // return data in xhr.responseText but this is prematurely truncated as soon as it reads a zero (the eof for strings),
        // therefore this is no good for binary data. The correct data is returned in xhr.responseBody as defined but unreachable from javascript so
        // a VB script hack is needed.
        // IE11:
        // returns data correctly in xhr.response. Trying to read xhr.responseText causes an IllegalStateError though, so always check for
        // xhr.response first in any conditional checks or assignments. Also, IE11 withdraws support for VBScript so without using a line like
        // <meta http-equiv="x-ua-compatible" content="IE=10"> in the page header it will crash when trying to access VBScript, but with the
        // correct data in xhr.response we don't need the VBScript anyways.
        // To differentiate between IE11 and IE9 we check for the presence of the overrrideMimeType function, IE9 doesn't have it, IE11 does.
        // Thus we can successfully funnel off IE9 browsers down the VBScript route.
        // IE10:
        // Don't know yet. reading indicates it is more IE9 inclined.
        // Firefox/Safari/Opera/Chrome:
        // Return data correctly in xhr.response or xhr.responseText

        // xhr.overrideMimeType in IE9 is undefined, but is defined as a function in IE11
        if (/*$.browser.msie*/ xhr.responseBody !== undefined && xhr.overrideMimeType == undefined) {
            console.log ("Having to get binary out of XHR using VBScript in IE.");
            textLoaded = NapVisLib.getBinaryFromXHR (xhr); // calling VBScript if in IE, cos IE is brok
        }
        else {
            textLoaded = xhr && (xhr.response || xhr.responseText);
        }
        console.log ("text loaded:", textLoaded.length, "bytes");
        return textLoaded;
    };


    // http://www.w3schools.com/dom/dom_parser.asp
    this.parseXML = function (text) {
        var doc;

        if (window.DOMParser) {
            var parser = new DOMParser();
            doc = parser.parseFromString(text, "text/xml");
        }
        else if (window.ActiveXObject) {
            doc = new ActiveXObject("Microsoft.XMLDOM");
            doc.async = "false";
            doc.loadXML(text);
        }
        else {
            throw new Error("Cannot parse XML");
        }

        return doc;
    };

    this.xmlToString = function (xmlData) {

        var xmlString;
        //IE
        if (window.ActiveXObject){
            xmlString = xmlData.xml;
        }
        // code for Mozilla, Firefox, Opera, etc.
        else{
            xmlString = (new XMLSerializer()).serializeToString(xmlData);
        }
        return xmlString;
    };

    this.endsWith = function (str, suffix) {
	    return str.indexOf(suffix, str.length - suffix.length) !== -1;
	};


    this.removeNullsFromArray = function (arr) {
        var rtot = 0;
        for (var n = 0; n < arr.length; n++) {
            if (arr[n] != undefined && arr[n] != null) {
                if (rtot < n) {
                    arr [rtot] = arr [n];
                }
                rtot++;
            }
        }
        arr.length = rtot;
    };


    this.intersectArrays = function (a, b) {
        if (a === undefined || b === undefined) {
            return [];
        }

        return $.grep(a, function(i) {
            return $.inArray(i, b) > -1;
        });
    };

    this.countNulls = function (l) {
        var nullCount = 0;
        for (var n = 0; n < l.length; n++) {
            if (l[n] === null) { nullCount++; }
        }
        return nullCount;
    };

    this.html5Lacks = function (here, msg) {
        here.append("p")
            .attr ("class", "html5lack")
            .text (msg)
        ;
    };

    this.html5LacksOnButton = function (buttonD3Sel, msg) {
        buttonD3Sel.property ("disabled", true);
        buttonD3Sel.attr("title", msg);
    };


    this.makeFileLoadButton = function (where, klass, id, label, onchangeFunc) {

        var button = where.select("input[type=file]#"+id);
        //console.log ("MZ", Modernizr);

        if (button.empty()) {
            button = where.append("input")
                .attr ("class", klass)
                .attr ("id", id)
            ;

            if (window.FileReader) {
                button
                    .attr ("type", "file")
                    .on ("change", function() {
                        var r = new FileReader();
                        console.log ("local file loading");
                        r.onload = function(e) {
                            //console.log ("whee2", e);
                            var f = d3.select("#"+id).node().files[0];
                            var contents = e.target.result;
                            /*
                            console.log ( "Got the file\n"
                                +"name: " + f.name + "\n"
                                +"type: " + f.type + "\n"
                                +"size: " + f.size + " bytes\n"
                                //+ "starts with: " + contents.slice(0, 100)
                                + "starts with: " + contents.slice(0, 100)
                            );
                            */
                            //console.log ("ocf2", onchangeFunc);
                            onchangeFunc (f, contents);
                        };
                        r.readAsArrayBuffer(d3.select(d3.event.target).node().files[0]);
                    })
                ;
            }
            else {
                NapVisLib.html5Lacks (where, "This Browser does not support the HTML5 FileReader API");
            }
        }

        return button;
    };


    // HTML5 File Writing
    function errorHandler(e) {
        var msg = '';

        switch (e.code) {
            case FileError.QUOTA_EXCEEDED_ERR:
                msg = 'QUOTA_EXCEEDED_ERR';
                break;
            case FileError.NOT_FOUND_ERR:
                msg = 'NOT_FOUND_ERR';
                break;
            case FileError.SECURITY_ERR:
                msg = 'SECURITY_ERR';
                break;
            case FileError.INVALID_MODIFICATION_ERR:
                msg = 'INVALID_MODIFICATION_ERR';
                break;
            case FileError.INVALID_STATE_ERR:
                msg = 'INVALID_STATE_ERR';
                break;
            default:
                msg = 'Unknown Error';
                break;
        }

        console.log('Error: ' + msg);
    }


    this.prepareForWrite = function (makeStringFunc, data) {
        //console.log ("W", window);
        navigator.webkitPersistentStorage.requestQuota (1024*1024, function(grantedBytes) {
            console.log ("granted bytes", arguments);
            window.requestFileSystem (window.PERSISTENT, grantedBytes,
                function(a) { NapVisLib.writeLocalFile (a, makeStringFunc (data)); },
                errorHandler);
        }, function(e) {
            console.log('Error', e);
        });
    };

    this.writeArray = function (a) {
        return a.join("\n");
    };

    this.writeLocalFile = function (fs, toWrite) {
        console.log ("args", arguments);
        fs.root.getFile('Save.txt', {create: true}, function(fileEntry) {
            // Create a FileWriter object for our FileEntry (log.txt).
            var fileURL = fileEntry.toURL();

            fileEntry.createWriter(function(fileWriter) {

                fileWriter.onwriteend = function() {
                    console.log (this.isTruncated ? 'File truncated' : 'Write completed', ": ", this.position, 'bytes.');
                    // If not truncated, then truncate to remove any longer old data.
                    // Necessary as filewriter doesn't overwite old existing file, just appends from a given point (in this case zero, the start of the file).
                    // We need the flag to avoid an infinite loop, as truncate will call this .onwriteend function again
                    if (!this.isTruncated) {
                        this.isTruncated = true;
                        this.truncate (this.position); // snap off old stuff if newer data is smaller
                    }
                    else {
                        window.open(fileURL, '_blank', 'height=600,width=320,status=1,location=1');
                    }
                };

                fileWriter.onerror = function(e) {
                    console.log('Write failed: ' + e.toString());
                };

                // Create a new Blob and write it to log.txt.
                //var blob = new Blob([xmlClones[cluster]], {type: 'text/xml'});
                var blob = new Blob([toWrite], {type: 'text/plain'});
                fileWriter.isTruncated = false; //my flag to see if file has been truncated
                fileWriter.write(blob);

            }, errorHandler);

        }, errorHandler);

    };

    window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
    // Files show up in chrome omnibar under filesystem:http://localhost:8080/persistent/  ...need final slash

    // d3div is a single d3.select div element
    // sections is a list of objects containing headers for section labels and sectionids to build ids for each section
    this.makeSectionedDiv = function (d3div, sections, sectionKlass) {
         var id = d3div.attr("id");
         var makeSections = d3div.selectAll("div."+sectionKlass).data(sections, function(d) { return d.header; });
         var outerDivs = makeSections.enter()
             .append("div")
             .attr("class", sectionKlass)
         ;
         var headers = outerDivs.append ("p").attr("class", "controlHeading");

        headers.append ("span")
            .attr ("class", "expansionControl")
            .html(function(d) { return d.init === "none" ? "+" : "-"; })
            .on ("click", function(d) {
                var blockID = id + d.sectionID;
                var block = d3.select("#"+blockID);
                var visStatus = block.style ("display");
                block.style ("display", (visStatus === "block" ? "none" : "block"));
                d3.select(this).html (visStatus === "block" ? "+" : "-");
            })
        ;

        headers.append("span")
            .html (function(d) { return d.header; })
        ;

        outerDivs.append ("div")
            .attr ("id", function(d) {return id+ d.sectionID; })
            .style ("display", function(d) { return d.init || "block"; })
        ;
    };

    this.addHRGrooves = function (d3div) {
        var id = d3div.attr("id");
        var indiv = d3div.append("div")
            .attr("id", id+"dragger")
        ;
        indiv.append("hr");
        indiv.append("hr");
        indiv.append("hr");
        indiv.append("hr");
    };


    this.rangeSlider = function() {
        var scale = d3.scale.linear();
        var range = [scale.range()[0], scale.range()[1]];
        var orient;
        var _update;
        var _dragEndFunc = function (selRange, scale) { console.log ("drag end", d3.event, selRange, scale); };
        var _duringDragFunc = function (selRange, scale) {};
        var tooltipTemplates = {
            "min": function (r, s) { return "min: "+s.invert(r[0]); },
            "max": function (r, s) { return "max: "+s.invert(r[1]); },
            "bar": function () { return null; }
        };

        function rangeSlider(g) {
            var drag1 = d3.behavior.drag()
                .on("drag", function() {
                    range[0] = Math.max (scale.range()[0], Math.min (range[1], range[0] + d3.event.dx));
                    rangeSlider.update ();
                })
            ;

            var drag2 = d3.behavior.drag()
                .on("drag", function() {
                    range[1] = Math.min (scale.range()[1], Math.max (range[0], range[1] + d3.event.dx));
                    rangeSlider.update ();
                })
            ;

            var drag3 = d3.behavior.drag()
                .on("drag", function() {
                    var dx = (d3.event.dx > 0
                        ? Math.min (d3.event.dx, scale.range()[1] - range[1])
                        : Math.max (d3.event.dx, scale.range()[0] - range[0])
                    );
                    range[0] += dx;
                    range[1] += dx;
                    rangeSlider.update ();
                    //rangeSlider.duringDragFunc()(range, rangeSlider.scale());
                })
            ;

            function dragend () {
                _dragEndFunc (range, rangeSlider.scale());
            }
            drag1.on ("dragend", dragend);
            drag2.on ("dragend", dragend);
            drag3.on ("dragend", dragend);


            g.each(function() {
                var g = d3.select(this);

                g.append("rect")
                    .attr ("class", "sliderThumb sliderMin")
                    .attr ("width", 16)
                    .attr ("height", 16)
                    .call (drag1)
                    .append ("svg:title")
                ;

                g.append("rect")
                    .attr ("class", "sliderThumb sliderMax")
                    .attr ("width", 16)
                    .attr ("height", 16)
                    //.attr ("x", range[0] - 16)
                    .call (drag2)
                    .append ("svg:title")
                ;

                g.append("rect")
                    .attr ("class", "sliderBar")
                    .attr ("x", range[0])
                    .attr ("y", 2)
                    .attr ("width", range[1] - range[0])
                    .attr ("height", 12)
                    .call (drag3)
                    .append ("svg:title")
                ;
            });

            _update = function () {
                g.select("rect.sliderMax")
                    .attr("x", function() { return range[1]; })
                    .select("title")
                        .text (tooltipTemplates.max(range, scale))
                ;
                g.select("rect.sliderMin")
                    .attr("x", function() { return range[0] - d3.select(this).attr("width"); })
                    .select("title")
                        .text (tooltipTemplates.min(range, scale))
                ;
                g.select("rect.sliderBar")
                    .attr("x", function() { return range[0]; })
                    .attr("width", function() { return range[1] - range[0]; })
                    .select("title")
                        .text (tooltipTemplates.bar())
                ;
                return rangeSlider;
            };
        }
        rangeSlider.scale = function(x) {
            if (!arguments.length) { return scale; }
            scale = x.copy();
            range = [scale.range()[0], scale.range()[1]];
            return rangeSlider;
        };
        rangeSlider.orient = function(x) {
            if (!arguments.length) { return orient; }
            orient = x in d3_svg_axisOrients ? x + "" : d3_svg_axisDefaultOrient;
            return rangeSlider;
        };
        rangeSlider.update = function(x) {
            if (!arguments.length) { _update() ; return rangeSlider; }
            _update = x;
            return rangeSlider;
        };
        rangeSlider.dragEndFunc = function (x) {
            if (!arguments.length) { return _dragEndFunc; }
            _dragEndFunc = x;
            return rangeSlider;
        };
        rangeSlider.duringDragFunc = function (x) {
            if (!arguments.length) { return _duringDragFunc; }
            _duringDragFunc = x;
            return rangeSlider;
        };
        rangeSlider.tooltipTemplates = function (x) {
            if (!arguments.length) { return tooltipTemplates; }
            tooltipTemplates = x;
            return rangeSlider;
        };

        //console.log ("rangeSlider", rangeSlider);
        return rangeSlider;
    };
};