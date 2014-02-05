/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 11/06/13
 * Time: 13:02
 * To change this template use File | Settings | File Templates.
 */

/*var VESPER =*/ (function() {
    var vesper = {};
    vesper.alerts = false;
    vesper.logRun = false;
    vesper.log = function () {
        if (vesper.logRun) {
            //console.log.apply (console, arguments);
            Function.prototype.apply.call(console.log, console, arguments);
        }
    };
    vesper.imgbase = "../img/";
    vesper.log (vesper);

    vesper.init = function () {
        vesper.tooltip.init();
        vesper.titles = $.t("vesper.visTitles", {"returnObjectTrees":true});
    };

    if (typeof define === "function" && define.amd) {
        define(vesper);
    } else if (typeof module === "object" && module.exports) {
        module.exports = vesper;
    } else {
        this.VESPER = vesper;
    }

    //return vesper;
}());