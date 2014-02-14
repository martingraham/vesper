/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 17/06/13
 * Time: 14:59
 * To change this template use File | Settings | File Templates.
 */

/*
VESPER.Model = function (metaData, data) {
    VESPER.Model.prototype = {
        getNodeFromID: function (id) {},

        getTaxaData: function (node) {},
        getSubTaxa: function (node) {}
    };

}
*/

VESPER.DWCAModel = function (metaData, data) {
    this.getMetaData = function (){ return this.metaData; };
    // In an implicit taxonomy, data.records and data.tree are the same object, so getData and getImplicitTaxonomy return the same
    // In an explicit taxonomy i.e. a tree of specimens, data.records is the specimens, and data.tree is the taxonomy we generated on top.
    this.getData = function (){ return this.data.records; };
    this.getImplicitTaxonomy = function () { return this.data.impTree; };
    this.getImplicitRoot = function (){ return this.data.impRoot; };
    this.getExplicitTaxonomy = function () { return this.data.expTree; };
    this.getExplicitRoot = function (){ return this.data.expRoot; };

    var viewCount = 0;
    var sessionModelViewID = 0;
    var selectionModel = new MGNapier.SharedSelection ();

    this.getSelectionModel = function () { return selectionModel; };

    // Has to be here, as selectionModel has no access to model
    this.invertSelection = function () {
        var d = this.getData();
        var s = this.getSelectionModel();
        var arr = [];
        //var tempField = {fieldType:"acceptedNameUsageID", rowType:this.getMetaData().coreRowType};
        for (var iid in d) {
            if (!s.contains(iid)) {
                //var n = this.getNodeFromID(iid);
                //var accv = this.getDataPoint (n, tempField);
                //if (accv == iid) {
                    arr.push (iid);
                //}
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

    this.getSynonyms = function (node) {
        return node[VESPER.DWCAParser.SYN];
    };

    this.getRowData = function (node, rid) {
        if (rid == undefined) {
            return this.getTaxaData (node);
        }
        return this.getExtraData(node) == undefined ? undefined : this.getExtraData(node)[rid];
    };

    this.getSubTaxa = function (node) {
        return node[VESPER.DWCAParser.TAXA];
    };

    this.getSpecimens = function (node) {
        return node[VESPER.DWCAParser.SPECS];
    };


    // Recursive count getters
    this.getDescendantCount = function (node) {
        return node.dct;
    };

    // All synonyms in the node and node subtaxa
    this.getSynonymCount = function (node) {
        return node.syct || (this.getSynonyms(node) ? this.getSynonyms(node).length : 0);
    };

    // All specimens in the node and node subtaxa
    this.getSpecimenCount = function (node) {
        //console.log ("this", this);
        return node.spcount || (this.getSpecimens(node) ? this.getSpecimens(node).length : 0);
    };

    this.getObjectCount = function (node) {
        return (node.dct || 0) + this.getSynonymCount(node) + this.getSpecimenCount(node);
    };

    this.getSelectedDescendantCount = function (node) {
        return node.Sdct;
    };

    this.getSelectedSynonymCount = function (node) {
        return node.Ssyct;
    };

    this.getSelectedSpecimenCount = function (node) {
        return node.Sspcount;
    };

    this.getSelectedObjectCount = function (node) {
        return (node.Sdct || 0) + (node.Ssyct || 0) + (node.Sspcount || 0);
    };

    this.getLeafValue = function (node) {
        var s = this.getSpecimens(node);
        return s ? s.length : 1;
    };

    this.getNodeFromID = function (id) {
        return this.getData()[id] || (this.getExplicitTaxonomy() ? this.getExplicitTaxonomy()[id] : undefined);
    };

    this.getLabel = function (node) {
        var nameField = this.getMetaData().vesperAdds.nameLabelField;
        return this.getDataPoint (node, nameField);
    };

    this.getDataPoint = function (node, fieldAndRowObj) {
        var rowData = this.getMetaData().fileData[fieldAndRowObj.rowType];
        if (rowData == undefined) {
            VESPER.log ("UNDEFINED ROW", fieldAndRowObj, this.getMetaData());
        }
        var findexer = rowData.filteredFieldIndex;
        var fid = findexer[fieldAndRowObj.fieldType];
        if (fid == undefined) { return undefined; }
        var rid = rowData.extIndex;
        if (rid == undefined) {
            return this.getTaxaData(node)[fid];
        }
        return this.getExtraData(node) ? this.getExtraData(node)[rid][0][fid] : undefined;
    };

    this.getIndexedDataPoint = function (node, index) {
        if (index == undefined || index.fieldType == undefined) { return undefined; }
        if (index.rowIndex == undefined) {
            return this.getTaxaData(node)[index.fieldIndex];
        }
        return (this.getExtraData(node)) ? this.getExtraData(node)[index.rowIndex][0][index.fieldIndex] : undefined;
    };

    // Plural indexed data points requires an array to return multiple results
    this.getIndexedDataPoints = function (node, index, arr) {
        if (index !== undefined && index.fieldType !== undefined) {
            if (index.rowIndex == undefined) {
                arr.push (this.getTaxaData(node)[index.fieldIndex]);
            }
            else if (this.getExtraData(node)) {
                var dats = this.getExtraData(node)[index.rowIndex];
                //Array.prototype.push.apply (arr, dats);
                for (var n = 0; n < dats.length; n++) {
                    arr.push (dats[n]);
                }
            }
        }
    };

    // Finds first instance of field name in filedata structure
    this.makeIndices = function (fieldNames) {
        var fieldData = [];
        for (var n = 0, len = fieldNames.length; n < len; n++) {
            fieldData.push (this.makeIndex (fieldNames[n]));
        }
        return fieldData;
    };


    this.makeIndex = function (fieldName) {
        var fileData = this.getMetaData().fileData;
        for (var type in fileData) {
            if (fileData.hasOwnProperty(type)) {
                var i = fileData[type].filteredFieldIndex[fieldName];
                if (i !== undefined) {
                    return {"rowIndex": fileData[type].extIndex, "rowType": type, "fieldIndex": i, "fieldType":fieldName};
                }
            }
        }

        return null;
    };

    this.getRowRecords = function (node, rid) {
        if (rid == undefined) {
            return this.getTaxaData (node); // a single array
        }
        return this.getExtraData(node) ? this.getExtraData(node)[rid] : undefined; // an array of arrays
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

    this.countSelectedDesc = function (taxon, idField) {
        //var stopwatch = {base: 0};
        //MGNapier.NapVisLib.resetStopwatch (stopwatch);
        this.countSelectedDescNew (taxon, idField);
        //console.log ("new", MGNapier.NapVisLib.elapsedStopwatch (stopwatch), "ms");
    };


    this.countSelectedDescNew = function (taxon, idField) {
        this.doSelectCount (taxon, idField, "Sdct", this.getSubTaxa, this.getDescendantCount);
        this.doSelectCount (taxon, idField, "Ssyct", this.getSynonyms, this.getSynonymCount);
        this.doSelectCount (taxon, idField, "Sspcount", this.getSpecimens, this.getSpecimenCount);
    };

    // need to figure this out...
    this.doSelectCount = function (taxon, idField, countField, func, totFunc) {
        var taxa = this.getSubTaxa (taxon);
        var countables = func ? func (taxon) : undefined;
        var maxPossible = totFunc ? totFunc.call (this, taxon) : 0;
        var len = (countables ? countables.length : 0);
        var c = 0;

        if (maxPossible || len) { // no point testing for selections if no selectable objects beneath this point

            if (len) {
                for (var n = len; --n >= 0;) {
                    c += this.getSelectionModel().contains (this.getIndexedDataPoint (countables[n], idField)) ? 1 : 0;
                }
            }
            if (maxPossible > len) {  // no point burrowing further down the tree if maxpossible is zero
                for (var n = taxa.length; --n >= 0;) {
                    c += this.doSelectCount (taxa[n], idField, countField, func, totFunc);
                }
            }

            taxon[countField] = c;
        }

        return c || 0;
    };

    this.data = data;
    this.metaData = metaData;
};
