/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 24/05/13
 * Time: 14:02
 * To change this template use File | Settings | File Templates.
 */

VESPER.Filters = new function () {

    this.filter2 = function (model, searchTerms, regex, nameField) {
        console.log ("regex", regex);
        console.log ("filedata", model.getMetaData().fileData);
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
                    //console.log ("name2", name2);
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
