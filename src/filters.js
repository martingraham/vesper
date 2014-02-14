/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 24/05/13
 * Time: 14:02
 * To change this template use File | Settings | File Templates.
 */

VESPER.Filters = new function () {

    this.nameLabelFilter = function (model, regexString) {
        var regex = new RegExp (regexString);
        console.log ("regex", regex);
        var metaData = model.getMetaData();
        var nameLabel = metaData.vesperAdds.nameLabelField;
        var rowDescriptor = metaData.fileData[nameLabel.rowType];
        var rowIndex = rowDescriptor.extIndex;
        var nameIndex = rowDescriptor.filteredFieldIndex[nameLabel.fieldType];
        var oneArray = [];

        //VESPER.log ("FILTER", nameLabel, nameIndex, rowIndex);

        var specificFilter = function (model, taxon, regex) {
            var rowRecords = model.getRowRecords (taxon, rowIndex);

            if (rowIndex == undefined) {
                oneArray[0] = rowRecords;
                rowRecords = oneArray;
            }

            // Matching names against a string regex is much slower (2-3x) than when regex is a RegExp object.
            // Using test (which requires a regexp object) is about as fast as match with a regexp object.
            if (rowRecords) {
                for (var n = rowRecords.length; --n >= 0;) {
                    var name = rowRecords[n][nameIndex];
                    //if (name && name.match (regex) != null) {
                    if (name && regex.test (name)) {
                        return true;
                    }
                }
            }

            return false;
        };

        model.getSelectionModel().setUpdating (true);
        var count = VESPER.DWCAParser.selectNodes (regex, specificFilter, model, function(obj) { model.getSelectionModel().addToMap (obj); });
        //VESPER.log ("selected count", count, model.getSelectionModel().values());
        model.getSelectionModel().setUpdating (false);
        return count;
    };

    this.standardRankFilter = function (model) {
        var regex = new RegExp ("^("+VESPER.DWCAParser.explicitRanks.join("|")+")");
        console.log ("regex", regex);

        var metaData = model.getMetaData();
        var trIndex = model.makeIndex ("taxonRank");
        var rowDescriptor = metaData.fileData[trIndex.rowType];
        var extraRowIndex = rowDescriptor.extIndex;
        var taxonRankIndex = rowDescriptor.filteredFieldIndex[trIndex.fieldType];
        var oneArray = [];
        var first = true;
        //VESPER.log ("FILTER", nameLabel, nameIndex, rowIndex);

        var specificFilter = function (model, taxon, regex) {
            var rowRecords = model.getRowRecords (taxon, extraRowIndex);

            if (extraRowIndex == undefined) {
                oneArray[0] = rowRecords;
                rowRecords = oneArray;
            }

            /*
            if (first) {
                first = false;
                console.log ("sp 2 rr", rowRecords, rowRecords[0][taxonRankIndex], VESPER.DWCAParser.explicitRanks);
            }
            */

            if (rowRecords) {
                for (var n = rowRecords.length; --n >= 0;) {
                    var rank = rowRecords[n][taxonRankIndex];
                    if (rank && regex.test (rank)) {
                        return true;
                    }
                }
            }

            return false;
        };

        model.getSelectionModel().setUpdating (true);
        var sw = {};
        var t = MGNapier.NapVisLib.resetStopwatch (sw);
        var count = VESPER.DWCAParser.selectNodes (regex, specificFilter, model, function(obj) { model.getSelectionModel().addToMap (obj); });
        //VESPER.log ("selected count", count, model.getSelectionModel().values());
        console.log ("rank match took", MGNapier.NapVisLib.elapsedStopwatch (sw), "ms.");
        model.getSelectionModel().setUpdating (false);
        return count;
    };

    return this;
}();
