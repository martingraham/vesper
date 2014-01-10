/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 17/09/13
 * Time: 13:50
 * To change this template use File | Settings | File Templates.
 */




VESPER.demo = function (files, exampleDivID) {

    VESPER.tooltip.init();

    var selectionOptions = {useExtRows: true, selectFirstOnly: true};

    var visChoiceData = [
        {title:"Controls", multiple: false, attList: ["unachievable"], matchAll: true, image: VESPER.imgbase+"tree.png", height: "null", width: "200px",
            newVisFunc: function (div) { return new VESPER.VisLauncher (div);},
            setupFunc: function () {return {"visChoiceData":visChoiceData}}
        },
        {title:"Implicit Taxonomy", multiple: true,  attList: VESPER.DWCAParser.neccLists.impTaxonomy, matchAll: true, image: VESPER.imgbase+"tree.png", height: "600px",
            newVisFunc: function (div) { return new VESPER.Tree (div);},
            setupFunc: function () {return {"rankField":"taxonRank"}}
        },
        {title:"Explicit Taxonomy", multiple: true, attList: VESPER.DWCAParser.neccLists.expTaxonomy, matchAtLeast: 2, matchAll: false, image: VESPER.imgbase+"tree.png", height: "600px",
            newVisFunc: function (div) { return new VESPER.Tree (div);},
            setupFunc: function () {return {"rankField":"taxonRank"}}
        },
        {title:"Map", multiple: true, attList: VESPER.DWCAParser.neccLists.geo, matchAll: true, image: VESPER.imgbase+"world.png", height: "400px",
            newVisFunc: function (div) { return new VESPER.DWCAMapLeaflet (div);},
            setupFunc: function () {return {"latitude":"decimalLatitude", "longitude":"decimalLongitude"}}
        },
        {title:"Timeline", multiple: true, attList: VESPER.DWCAParser.neccLists.basicTimes, matchAll: true, image: VESPER.imgbase+"calendar.png", height: "200px",
            newVisFunc: function (div) { return VESPER.TimeLine (div);},
            //setupFunc: function (coreFieldIndex) { return {"dateField":coreFieldIndex["eventDate"]}}
            setupFunc: function () { return {"dateField":"eventDate"}}
        },
        {title:"Sanity Check", multiple: true, attList: [], matchAll: false, image: VESPER.imgbase+"comment.png", height: "400px",
            newVisFunc: function (div) { return new VESPER.Sanity (div);},
            setupFunc: function () { return undefined; }
        },
        {title:"Taxa Distribution", multiple: true, attList: VESPER.DWCAParser.neccLists.impTaxonomy, matchAll: true, image: VESPER.imgbase+"dist.png", height: "200px",
            newVisFunc: function (div) { return VESPER.TaxaDistribution (div);},
            setupFunc: function () { return {"realField":"acceptedNameUsageID", "rankField":"taxonRank"}}
        },
        {title:"Search Box", multiple: true, attList: [], matchAll: false, image: VESPER.imgbase+"search.png", height: "150px", width: "200px",
            newVisFunc: function (div) { return new VESPER.FilterView (div);},
            setupFunc: function () { return {} ;}
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
        d3.select("#loadButton").property("disabled", true);
    }

    function setChoices (choiceData) {
        var table = d3.select(exampleDivID).select("table");
        if (table.empty()) {
            table = d3.select(exampleDivID).append("table");
            var headerRow = table.append("tr");
            var headerText = ["Data Set", "Description", "Originator"];
            var headers = headerRow.selectAll("th").data(headerText);
            headers.enter().append("th").text(function(d) { return d; });
        }

        var choices = table.selectAll("tr").data (choiceData, function(d) { return d == undefined ? undefined : d.name; });
        var rows = choices.enter()
            .append ("tr")
        ;
        rows.append("td")
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

        rows.append("td").text(function(d) { return d.description; });
        rows.append("td").text(function(d) { return d.origin; });


        NapVisLib.makeFileLoadButton (d3.select("#yourData"), "choice", "localLoader", "Load",
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
            var onVisOptClickFunc = function (d) {
                var setVal = d3.select(this).property("checked");
                DWCAHelper.setAllFields (checkListParent, setVal, d.attList, DWCAHelper.isIdWrap, getMeta(), selectionOptions);

                var cBoxClass = d3.select(d3.select(this).node().parentNode).attr("class"); // up one
                var cGroup = bdiv.selectAll("span."+cBoxClass+" input[type='checkbox']");
                var ggroup = DWCAHelper.reselectActiveVisChoices (cGroup, checkListParent, function() { return getMeta(); }, selectionOptions);
                d3.select("#loadButton").property("disabled", ggroup.empty());
            };
            DWCAHelper.configureCheckbox (spanSelection, data.attList, onVisOptClickFunc);
        }

        var ldiv = d3.select ("#labelSelectDiv");
        for (var n = 0; n < radioChoices.length; n++) {
            var data = {"fieldType":radioChoices[n], "rowType":undefined};
            var elem = DWCAHelper.addRadioButton (ldiv, data, "fieldGroup", "nameChoice", function(d) { return d.fieldType; });
            DWCAHelper.configureRadioButton (elem, checkListParent,
                function(result) {
                    // had to make copy of result, as otherwise previous metafile objects will be pointing to the same object.
                    // (remember, we can have more than one dataset open at a time)
                    getMeta().vesperAdds.nameLabelField = $.extend ({}, result);
                    reselectVisChoices();
                },
                function() { return getMeta(); },
            selectionOptions);
        }

        var setVisOptionBoxes = function (bool) {
            var cboxes = d3.select("#dynamicSelectDiv").selectAll(".fieldGroup input");
            cboxes = cboxes.filter (function() {return d3.select(this).style("display") != "none"; });
            cboxes.property ("checked", bool);
            if (!bool) {
                var rbuts = d3.select("#labelSelectDiv").selectAll(".fieldGroup input");
                rbuts = rbuts.filter (function() {return d3.select(this).style("display") != "none"; });
                rbuts.property ("checked", bool);
                getMeta().vesperAdds.nameLabelField = null;
            }
        };

        DWCAHelper.addHelperButton (d3.select("#advancedSelectDiv"), checkListParent, "Remove Verbose Fields", VESPER.DWCAParser.flabbyLists.wordyList,
            false, null, "selButtonStyle listCon", function() { return getMeta(); }, selectionOptions);
        var excepFunc = function exceptionFunc (d, i) { return i == 0; };
        d3.select("#allButton").on("click", function() {
            DWCAHelper.setAllFields (checkListParent, true, undefined, excepFunc, getMeta(), selectionOptions);
            setVisOptionBoxes (true);
            return false;
          });
        d3.select("#clearButton").on("click", function() {
            DWCAHelper.setAllFields (checkListParent, false, undefined, excepFunc, getMeta(), selectionOptions);
            setVisOptionBoxes (false);
            return false;
          });
        var useExtBox = DWCAHelper.addCheckbox (d3.select("#advancedSelectDiv"), {title:"Search DWCA Extensions", image:null}, "fieldGroup");
        useExtBox.select("input")
            .property ("checked", selectionOptions.useExtRows)
            .on("click", function() {
                selectionOptions.useExtRows = !selectionOptions.useExtRows;
                refilterNameChoices (getMeta());
                refilterVisChoices (getMeta());
        });
        var selectFirstOnlyBox = DWCAHelper.addCheckbox (d3.select("#advancedSelectDiv"), {title:"Select First Matching Field Only", image:null}, "fieldGroup");
        selectFirstOnlyBox.select("input")
            .property ("checked", selectionOptions.selectFirstOnly)
            .on("click", function() {
                selectionOptions.selectFirstOnly = !selectionOptions.selectFirstOnly
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
        function notifyFunc (str, obj) {
            d3.select("#notifyStatusID").html(str+":"+obj);
            d3.select("#loadStatDiv").attr("offsetWidth");
        }
        //DWCAZipParse.setNotifyFunc (notifyFunc);

        model = VESPER.DWCAParser.filterReadZipEntriesToMakeModel (zip, mdata);
        VESPER.log ("META", meta);
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
        var pHolder = d3.select("#filesizePlaceholder");
        pHolder.html(null);
        pHolder.append("img")
            .attr("class", "vesperIcon")
            .attr("src", VESPER.imgbase+"zipIcon.gif")
        ;
        pHolder.append("span")
            .text ((bufferOrStringData.length | bufferOrStringData.byteLength).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") +" bytes")
        ;

        if (VESPER.alerts) { alert ("check memory use in task manager"); }
        var accessZip = VESPER.DWCAParser.accessZip (bufferOrStringData, "meta.xml");
        var metaData = accessZip.meta;
        meta = metaData;
        if (!meta.error) {
            var zip = accessZip.jszip;

            DWCAHelper.makeFieldSelectionBoxes (metaData, d3.select("#listDiv"));  // Makes checkboxes for all fields (normally hidden)
            d3.select("#loadButton").on("click", null).on("click", function() { proceed (zip, metaData); return false;});

            refilterVisChoices (metaData);
            refilterNameChoices (metaData);

            var nameChoiceGroup = d3.select("#labelSelectDiv").selectAll("span.fieldGroup");
            var first = true;
            nameChoiceGroup.each (function(d) {
                var disp = d3.select(this).style ("display");
                if (disp != "none" && first) {
                    first = false;
                    var button = d3.select(this).select("input");
                    // this is cross-browser
                    var click_ev = document.createEvent("MouseEvent");
                    click_ev.initEvent("click", true /* bubble */, true /* cancelable */);
                    button.node().dispatchEvent(click_ev);
                    //button.node().click(); // this wasn't (didn't work in safari)
                }
            });

            DWCAHelper.divDisplay (["#showOnZipLoadDiv"], "block");
        } else {
            alert (meta.error+" Check DWCA meta.xml compliance.");
            // flash up something to say not a dwca file (one we can read at least)
        }
    };

    // Decide which name options to show
    function refilterNameChoices (metaData) {
        var nameChoiceGroup = d3.select("#labelSelectDiv").selectAll("span.fieldGroup");
        nameChoiceGroup
            //.property ("checked", false)
            .style ("display", function(d) {
                var poss = DWCAHelper.fieldListExistence (metaData, [d.fieldType], true, undefined, selectionOptions.useExtRows);
                if (poss.fields.length > 0) {
                    d.rowType = poss.fields[0].rowName;
                }
                //VESPER.log ("NAME STATE", d, poss.match);
                return poss.match ? null : "none";
            })
        ;
    }

    // Decide which vis options to show
    function refilterVisChoices (metaData) {
        var visCheckBoxGroup = d3.select("#dynamicSelectDiv").selectAll("span.fieldGroup");
        VESPER.log (visCheckBoxGroup);
        visCheckBoxGroup
            .property ("checked", false)
            .style ("display", function(d) {
                var poss = DWCAHelper.fieldListExistence (metaData, d.attList, d.matchAll, d.matchAtLeast, selectionOptions.useExtRows);
                return poss.match ? null : "none";
            })
        ;
    }

    // Reselect active vis choices after a change (in case removing one vis or name choice removes fields another vis needs)
    function reselectVisChoices () {
        var visCheckBoxGroup = d3.select("#dynamicSelectDiv").selectAll("span.fieldGroup input");
        DWCAHelper.reselectActiveVisChoices (visCheckBoxGroup, d3.select("#listDiv"), function() { return getMeta(); });
    }

    setChoices (files);
    setPresets (visTiedToSpecificAttrs, VESPER.DWCAParser.labelChoiceData);
};
