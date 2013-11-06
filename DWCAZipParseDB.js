/**
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
                                console.log ("new entry for", field, ":", newStr, newStr.length);
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
                console.log (lineNo, ": ", str);
            }
        }
        if (lineNo % 100 === 0) {
            var tt = NapVisLib.makeTime();
            if (tt - pTime > 1000) {
                pTime = tt;
                if (notifyFunc) {
                    notifyFunc (lineNo, str);
                } else {
                    console.log (lineNo, ": ", str);
                }
            }
        }
        //console.log (str);
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
            //    console.log (lineNo, utfwrap, "\nout", out.join(), "\nbuff", buff.length, i, buff.join(), "\n", buff[1023]);
            //}

            i += utfwrap; // cos we may have chars left over from not processing utf chars chopped between buffer calls
            // and i only returns new chars added to the buffer from inflateFunc. Led to off by one(or two) errors.

            var n = 0;
            utfwrap = 0;


            if (stt) {
                var possbom = String.fromCharCode(buff[0]) + String.fromCharCode(buff[1]) + String.fromCharCode(buff[2]);
                console.log ("possbom [", possbom, "]");
                if (possbom == "\xEF\xBB\xBF") {
                    console.log ("UTF8 bytemark detected");
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
            // console.log (out.length);

            if (utfwrap) {
                //console.log ("buffer ends during utf character sequence, ", utfwrap);
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
        console.log ("Time: ", mt/1000, " secs.");

        console.log ("Shared Maps: "+sharedMaps.length+", "+NapVisLib.countObjProperties (sharedMaps[1]));

        console.log ("pulled out "+pb+" characters from zip");
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

        console.log (VESPER.DWCAParser.sharedValuesTerms);
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

        console.log ("readFields", readFields);

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
                    //console.log ("Made", objStore, typeof objStore);
                    //versionTransaction.done();
                }
            }
        }).done (function(e) { console.log ("setup done"); doTrans(); });
        console.log ("WOT", wot);



        function doTrans () {
            var transaction = $.indexedDB(dbName).transaction([storeName], $.indexedDB.IDBTransaction.READ_WRITE);
            var i = 0;
            var ostore;

            function putNext() {
                if (i<1000000) {
                    if (i % 5000 == 0) {
                        console.log ("adding record", i);
                    }
                    ostore.add(data()).done (putNext);
                    ++i;
                } else {   // complete
                    console.log('populate complete');
                    //callback();
                }
            }


            transaction.progress(function(t){
                console.log ("Trans", t, t.objectStore("OldBookList"));
                ostore = t.objectStore("OldBookList");
                putNext();
                /*
                ostore.add(data())
                    .then(function(event) { console.info ("add done then", event); }, function(event) { console.log ("add fail then", event); })
                    .done(function(event) { console.info ("add done", event); })
                    .fail(function(event) { console.log ("add fail", event); })
                ;
                */
            });


            transaction.then(function(event) { console.log ("done then", event); }, function(event) { console.log ("fail then", event); });
            transaction.done(function(event) { console.log ("done", event); });
            transaction.fail(function(event) { console.log ("fail", event); });
        }
    }
};
