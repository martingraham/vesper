/**
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
