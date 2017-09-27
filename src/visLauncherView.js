/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 02/10/13
 * Time: 16:05
 * To change this template use File | Settings | File Templates.
 */

VESPER.VisLauncher = function (divid, options) {

    var model;
    var self = this;
    var keyField, dims, choiceData;
    var heightCache = {};

    this.set = function (fields, mmodel) {
        keyField = fields.identifyingField;
        choiceData = fields.visChoiceData;
        dims = [$(divid).width(), $(divid).height()];
        model = mmodel;
    };


    this.go = function () {
        var buttonVisBlockSel = d3.select(divid);
        setVisChoices (choiceData);
        showButtons (buttonVisBlockSel);
        setSelectionOps ();
        setModelCompareOps ();

        $(function() {
            $(divid).accordion({
                heightStyle: "content",
                collapsible: true,
                active: false
            });
        });

        if (options && options.autoLaunch === "on") {
            for (var n = 0; n < choiceData.length; n++) {
                var visData = choiceData[n];
                if (isVisDoable(visData) && isVisDataDependent(visData)) {
                    self.makeVis (visData, model);
                }
            }
        }
    };

    this.update = function () {};

    this.updateVals = this.update;


    function isVisDoable (visData) {
        var indices = model.makeIndices (visData.attList);
        var nullCount = MGNapier.NapVisLib.countNulls (indices);
        return (indices.length === 0 || (visData.matchAll && nullCount === 0) || (!visData.matchAll && nullCount < indices.length));
    }

    function isVisDataDependent (visData) {
        var indices = model.makeIndices (visData.attList);
        return (indices.length > 0);
    }

    function setVisChoices (data) {
       // MGNapier.NapVisLib.makeSectionedDiv (d3.select(divid), [{"header":"Launch Visualisation", "sectionID":"Vis", "init":"none"}], "encloser");
        d3.select(divid).append("H3").text($.t("launcher.launchHeader"));
       // var visChoices = d3.select(divid).select(divid+"Vis").selectAll("button").data (data);
        var visChoices = d3.select(divid).append("div").attr("id", divid+"Vis").selectAll("button").data (data);

        var buttons = visChoices.enter()
            .append ("button")
            .attr ("class", "visChoice")
            .attr ("type", "button")
            .on ("click", function(d) {
                var d3Sel = self.makeVis (d, model);
                if (d3Sel) {    // bring new vis to top if made
                    d3Sel.style("z-index", 100);
                }
                return false;
            })
            .on ("mouseover", function(d) {
                VESPER.tooltip
                    .updateText (
                        VESPER.titles [d.type],
                        $.t("vesper.visHelpTips."+ d.type)
                    )
                    .updatePosition (d3.event)
                ;
            })
            .on ("mouseout", function() {
                VESPER.tooltip.setToFade();
            })
        ;

        buttons.append ("img")
                .attr("src", function(d) { return d.icon || d.image; })
                .attr ("class", "vesperIcon")
        ;

        buttons.append ("span")
            .text (function(d) { return VESPER.titles [d.type]; })
        ;
    }

    function setSelectionOps () {
        d3.select(divid).append("H3").text($.t("launcher.selectHeader"));
        var encloser = d3.select(divid).append("div").attr("id", divid+"Sel");

        encloser.append("button")
            .attr ("type", "button")
            .attr ("value", "launcher.selectSave")
            .text ($.t("launcher.selectSave"))
        ;

        if (window.requestFileSystem) {
            encloser.select("button")
                .on ("click", function() {
                    MGNapier.NapVisLib.prepareForWrite (MGNapier.NapVisLib.writeArray, model.getSelectionModel().values());
                })
            ;
        } else {
            MGNapier.NapVisLib.html5LacksOnButton(encloser.select("button"), $.t("launcher.noFileWriter"));
        }


        encloser.append("button")
            .attr ("type", "button")
            .attr ("value", "launcher.selectInvert")
            .text ($.t("launcher.selectInvert"))
            .on ("click", function() {
                model.invertSelection ();
            })
        ;

        encloser.append("button")
            .attr ("type", "button")
            .attr ("value", "launcher.selectClear")
            //.attr ("id", "clearSel")
            .text ($.t("launcher.selectClear"))
            .on ("click", function() {
                model.getSelectionModel().clear();
                model.getSelectionModel().update();
            })
        ;

        encloser.selectAll("button")
            .style("display", "block")
            .attr("class", "safetyGap")
            .on("mouseover", function() {
                var elem = d3.select(this);
                var partVal = elem.attr("value");
                var text = elem.text();
                VESPER.tooltip
                    .updateText (text, $.t("launcher.helpTips"+partVal.substring (partVal.indexOf("."))) )
                    .updatePosition (d3.event)
                ;
            })
            .on("mouseout", function () { VESPER.tooltip.setToFade(); })
        ;
    }



    function setModelCompareOps () {
        d3.select(divid).append("H3").text($.t("launcher.compareHeader"));
        var encloser = d3.select(divid).append("div").attr("id", divid+"TComp");
        var basicText = $.t("launcher.compareLabel");

        encloser.append("button")
            .attr ("type", "button")
            .attr ("class", "compareVesperModel")
            .text (basicText)
            .on ("click", function() {
                VESPER.modelBag.push ({"model":model});
                VESPER.log ("ModelBag", VESPER.modelBag);
                if (VESPER.modelBag.length > 1) {
                    VESPER.modelComparisons.modelCoverageToSelection(VESPER.modelBag[0].model, VESPER.modelBag[1].model,
                        VESPER.modelBag[0].model.getMetaData().vesperAdds.nameLabelField,
                        VESPER.modelBag[1].model.getMetaData().vesperAdds.nameLabelField
                    );
                    VESPER.modelBag.length = 0;
                    d3.selectAll("button.compareVesperModel")
                        .classed ("taxonomyCompareActive", false)
                        .text (basicText)
                    ;
                } else {
                    var curButtonSel = d3.select(this);
                    curButtonSel.classed ("taxonomyCompareActive", true);
                    d3.selectAll("button.compareVesperModel").filter("*:not(.taxonomyCompareActive)").text (basicText+" to "+model.name); // smart alec way using css conditional selectors
                    //d3.selectAll("button.compareVesperModel").text (basicText+" to "+model.name);
                    //curButtonSel.text (basicText);
                }
            })
            .on("mouseover", function() {
                VESPER.tooltip
                    .updateText (basicText, $.t("launcher.helpTips.compareLabel"))  // cos its multi-line in the json (an array of strings)
                    .updatePosition (d3.event)
                ;
            })
            .on("mouseout", function () { VESPER.tooltip.setToFade(); })
        ;

        encloser.selectAll("button").style("display", "block");
    }



    function showButtons (divSel) {
        var visChoices = divSel.selectAll("button.visChoice");
        visChoices.style("display", function(d) {
            var allowed = isVisDoable (d);
            return allowed ? "block" : "none";
        });
    }

    this.makeVis = function (details, aModel) {
        var index = aModel.getNextSessionModelViewID();
        var id = aModel.name + "view" + (details.multiple ? index : "");
        // Spaces not allowed in html5 ID's. They can start with a number but that knackers css style selection so begin with a D
        id = "D" + id.replace(/\s+[a-z]/g, function(x) { return x.toUpperCase(); }).replace(/\s+/g, '');
        var title = VESPER.titles [details.type];
        var vid = title + " " + aModel.name;

        var pcent = ((index % 10) * 10) +"%";
        if (d3.select("#"+id).empty()) {
            var containerID = id+"container";
            var newDiv = d3.select("#allVisDiv")
                .append("div")
                .attr("class", "visWrapper")
                .attr ("id", containerID)
                .style("width", details.width ? details.width : "40%")
                .style ("left", pcent)
                .style ("top", pcent)
                //.style ("right", "auto")
                //.style ("bottom", "auto")
            ;

            var topBar = newDiv.append("div").attr("class","dragbar").attr("id", id+"dragBar");
            var buttonSpan = topBar.append("div").attr("class", "buttonBank");
            topBar.append("div").attr("class", "visTitle").text(vid);

            /*var indVisDiv = */newDiv.append("div")
                .attr("class", "vis")
                .attr("id", id)
                .style("height", details.height != "null" ? details.height : "auto")
            ;
            
            newDiv
                .style("min-height", "200px")
                .style("min-width", "200px")
            ; // stop being able to do silly small resizes

            //var coreType = aModel.getMetaData().coreRowType;
            var fileData = aModel.getMetaData().fileData;
            // var coreFieldIndex = fileData[coreType].filteredFieldIndex;

            var newVis = details.newVisFunc ("#"+id);
            VESPER.log ("newvis", newVis, newVis.set);
            var fields = details.setupFunc () || {};
            var keyFieldName = fileData["core"].filteredInvFieldIndex [aModel.getParser().getFilteredIdIndex (aModel.getMetaData())];
            fields.identifyingField = keyFieldName;
            newVis.set (fields, aModel);
            aModel.addView (newVis);
            newVis.go (aModel);


            addHideShowButton (buttonSpan, "#"+id, "#"+containerID);
            addKillViewButton (buttonSpan, newVis);
            $("#"+containerID).draggable({ 
                handle: "div.dragbar", 
                containment: "#allVisDiv", 
                stack: ".visWrapper",
                stop: function() {
                    //return $(this).css({
                    //  height: 'auto'
                    //});
                },
            })
            .resizable({
                stop: function () {
                    console.log ("newVis", newVis);
                    if (newVis.resized) {
                        newVis.resized();   // not necessary for html / map vis's, but svg based views need to be told what to do
                    }
                },
            })
            ;
            
            newDiv.style("position", "absolute");   // bugfix for resizable setting it to relative and causing issues
            
            return newDiv;
        }
        return null;
    };

    // where and div are d3 single selections, view is a view object
    function addKillViewButton (where, view) {
        where.append("button")
            .attr("type", "button")
            .on ("click", function() {
                if (view && view.destroy) { view.destroy(); }
                d3.select(d3.event.target).on ("click", null); // remove event from this very button to avoid dom holding refs to data
            } )
            .attr ("title", $.t("launcher.closeTooltip"))
            .append ("span")
            .text ("X")
            .attr ("alt", "Close")
        ;
    }

    function addHideShowButton (where, toggleThisID, containerID) {
        where.append("button")
            .attr("type", "button")
            .on ("click", function() {
                var vdiv = d3.select(toggleThisID);
                var cdiv = d3.select(containerID);
                var dstate = vdiv.style("display");
                var isCurNone = dstate === "none";
            
                if (!isCurNone) {
                    heightCache[toggleThisID] = cdiv.style("height");
                }
                cdiv
                    .style("min-height", isCurNone ? "200px" : null)
                    .style("height", isCurNone ? heightCache[toggleThisID] : cdiv.select(".dragbar").style("height"))
                ;
            
                //dstate is current vis display state, not the one we are switching it into...
                //d3.select(containerID).style("height", "auto"); // cos draggable sets it to a specific height in FF, which doesnt seem to get recalced on the display hide here
                vdiv.style("display", isCurNone ? null : "none");

                d3.select(this).select("span")
                    .text(isCurNone ? "▲" : "▼")
                ;
            } )
            .attr ("title", $.t("launcher.hideTooltip"))
            .append("span")
            .text ("▲")
            .attr("class", "showHideColours")
        ;
    }


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

        // remove model from modelbag if it's in there, memory leak if we don't
        var modelIndex = $.inArray (model, VESPER.modelBag);
        if (modelIndex >= 0) {
            // supersafe and redundant code
            VESPER.modelBag[modelIndex] = undefined;
            VESPER.modelBag = VESPER.modelBag.splice (modelIndex, 1);
            VESPER.modelBag.length = 0;
        }

        VESPER.DWCAHelper.recurseClearEvents (d3.select(divid));

        model.removeView (self);
        model.getSelectionModel().clear();
        model = null;
        VESPER.DWCAHelper.twiceUpRemove(divid);
    };

};
