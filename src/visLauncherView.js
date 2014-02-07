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

    this.set = function (fields, mmodel) {
        keyField = fields.identifyingField;
        choiceData = fields.visChoiceData;
        dims = MGNapier.NapVisLib.getWidthHeight (d3.select(divid).node());
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
                collapsible: true
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
                self.makeVis (d, model);
                return false;
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
            .text ($.t("launcher.selectInvert"))
            .on ("click", function() {
                model.invertSelection ();
            })
        ;

        encloser.append("button")
            .attr ("type", "button")
            //.attr ("id", "clearSel")
            .text ($.t("launcher.selectClear"))
            .on ("click", function() {
                model.getSelectionModel().clear();
                model.getSelectionModel().update();
            })
        ;

        encloser.selectAll("button").style("display", "block").attr("class", "safetyGap");
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
        var id = aModel.name + "view" + (details.multiple ? aModel.getNextSessionModelViewID() : "");
        id = id.replace(/\s+/g, '');    // Spaces not allowed in html5 ID's
        var title = VESPER.titles [details.type];
        var vid = title + " " + aModel.name;

        if (d3.select("#"+id).empty()) {
            var newDiv = d3.select("#allVisDiv")
                .append("div")
                .attr("class", "visWrapper")
                .attr ("id", id+"container")
                .style("width", details.width ? details.width : "50%")
            ;

            var topBar = newDiv.append("div").attr("class","dragbar").attr("id", id+"dragBar");
            var buttonSpan = topBar.append("div").attr("class", "buttonBank");
            topBar.append("div").attr("class", "visTitle").text(vid);

            /*var indVisDiv = */newDiv.append("div").attr("class", "vis").attr("id", id).style("height", details.height != "null" ? details.height : "100%");

            var coreType = aModel.getMetaData().coreRowType;
            var fileData = aModel.getMetaData().fileData;
           // var coreFieldIndex = fileData[coreType].filteredFieldIndex;

            var newVis = details.newVisFunc ("#"+id);
            VESPER.log ("newvis", newVis, newVis.set);
            var fields = details.setupFunc () || {};
            var keyFieldName = fileData[coreType].filteredInvFieldIndex [VESPER.DWCAParser.getFilteredIdIndex (aModel.getMetaData())];
            fields.identifyingField = keyFieldName;
            newVis.set (fields, aModel);
            aModel.addView (newVis);
            newVis.go (aModel);


            addHideShowButton (buttonSpan, "#"+id);
            addKillViewButton (buttonSpan, newVis);
            $("#"+id+"container").draggable({ handle: "div.dragbar"});
        }
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
            .append ("img")
            .attr ("src", VESPER.imgbase+"close.png")
            .attr ("alt", "Close")
        ;
    }

    function addHideShowButton (where, toggleThisID) {
        var initPoly = "1,1 12,1";
        where.append("button")
            .attr("type", "button")
            .on ("click", function() {
                var vdiv = d3.select(toggleThisID);
                var dstate = vdiv.style("display");
                //dstate is current vis display state, not the one we are switching it into...
                vdiv.style("display", dstate === "none" ? null : "none");
                //var svg = d3.select(this).select("svg polygon");
                d3.select(this).select("svg polygon")
                    .attr("points", dstate === "none" ?
                         initPoly : "1,1 12,1 12,12 1,12"
                );
            } )
            .attr ("title", $.t("launcher.hideTooltip"))
            .append("svg")
            .attr ("width", 14)
           // .attr ("height", 13)
                .append("polygon")
                .attr("points", initPoly)
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
