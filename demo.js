/**
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
        {title:"VisChoices", multiple: false, attList: ["unachievable"], matchAll: true, image: "img/tree.png", height: "null", width: "200px",
            newVisFunc: function (div) { return new VESPER.VisLauncher (div);},
            setupFunc: function (coreFieldIndex) {return {"nameField":coreFieldIndex[nameLabelField.result], "visChoiceData":visChoiceData}}
        },
        {title:"Implicit Taxonomy", multiple: true,  attList: VESPER.DWCAParser.neccLists.impTaxonomy, matchAll: true, image: "img/tree.png", height: "600px",
            newVisFunc: function (div) { return new VESPER.Tree (div);},
            setupFunc: function (coreFieldIndex) {return {"nameField":coreFieldIndex[nameLabelField.result], "rankField":coreFieldIndex["taxonRank"]}}
        },
        {title:"Explicit Taxonomy", multiple: true, attList: VESPER.DWCAParser.neccLists.expTaxonomy, matchAll: false, image: "img/tree.png", height: "600px",
            newVisFunc: function (div) { return new VESPER.Tree (div);},
            setupFunc: function (coreFieldIndex) {return {"nameField":coreFieldIndex[nameLabelField.result], "rankField":coreFieldIndex["taxonRank"]}}
        },
        {title:"Map", multiple: true, attList: VESPER.DWCAParser.neccLists.geo, matchAll: true, image: "img/world.png", height: "400px",
            newVisFunc: function (div) { return new VESPER.DWCAMapLeaflet (div);},
            setupFunc: function (coreFieldIndex) {return {"latitude":coreFieldIndex["decimalLatitude"], "longitude":coreFieldIndex["decimalLongitude"], "nameField":coreFieldIndex[nameLabelField.result]}}
        },
        {title:"Timeline", multiple: true, attList: VESPER.DWCAParser.neccLists.basicTimes, matchAll: true, image: "img/geo.png", height: "200px",
            newVisFunc: function (div) { return VESPER.TimeLine (div);},
            setupFunc: function (coreFieldIndex) { return {"dateField":coreFieldIndex["eventDate"], "nameField":coreFieldIndex[nameLabelField.result]}}
        },
        {title:"Sanity Check", multiple: true, attList: [], matchAll: false, image: "img/geo.png", height: "400px",
            newVisFunc: function (div) { return new VESPER.Sanity (div);},
            setupFunc: function (coreFieldIndex) { return undefined; }
        },
        {title:"Taxa Distribution", multiple: true, attList: VESPER.DWCAParser.neccLists.impTaxonomy, matchAll: true, image: "img/tree.png", height: "200px",
            newVisFunc: function (div) { return VESPER.TaxaDistribution (div);},
            setupFunc: function (coreFieldIndex) { return {"realField":coreFieldIndex["acceptedNameUsageID"], "nameField":coreFieldIndex[nameLabelField.result], "rankField":coreFieldIndex["taxonRank"]}}
        },
        {title:"Search Box", multiple: true, attList: [], matchAll: false, image: "img/geo.png", height: "150px", width: "200px",
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
        console.log ("ZIP:", zip);
        //DWCAZipParse.setNotifyFunc (notifyFunc);

        // read selected data from zip
        $.each (selectedStuff, function (key, value) {
            var fileData = mdata.fileData[key];
            var fileName = fileData.fileName;
            var readFields = NapVisLib.newFilledArray (fileData.invFieldIndex.length, false);

            $.each (value, function (key, value) {
                readFields [fileData.fieldIndex[key]] = value;
            });

            console.log ("readFields", readFields);
            VESPER.DWCAZipParse.set (fileData, readFields);
            zip.zipEntries.readLocalFile (fileName, VESPER.DWCAZipParse.zipStreamSVParser2);
            fileRows[fileData.rowType] = zip.zipEntries.getLocalFile(fileName).uncompressedFileData;
            VESPER.DWCAParser.updateFilteredLists (fileData, readFields);
        });

        if (VESPER.alerts) { alert ("mem monitor point 1"); }

        // make taxonomy (or list)
        model = new DWCAModel (mdata, VESPER.DWCAParser.setupStrucFromRows (fileRows, mdata));
        console.log ("MODEL", model);
        if (VESPER.alerts) { alert ("mem monitor point X"); }

        DWCAHelper.divDisplay(["#selDiv"], "none");
        DWCAHelper.divDisplay(["#allVisDiv"], "block");

        model.name = d3.select("#filenamePlaceholder").text();
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
        console.log (visCheckBoxGroup);
        visCheckBoxGroup
            .property ("checked", false)
            .style ("display", function(d) {
                var poss = DWCAHelper.fieldListExistence (metaData, d.attList, d.matchAll);
                return poss ? null : "none";
            })
        ;

        var nameChoiceGroup = d3.select("#labelSelectDiv").selectAll("label.nameChoice");
        console.log (nameChoiceGroup);
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
