/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 11/06/13
 * Time: 13:02
 * To change this template use File | Settings | File Templates.
 */
var VESPER = (function() {
    var vesper = {};
    vesper.alerts = false;
    vesper.logRun = true;
    vesper.log = function (obj) {
        if (vesper.logRun) {
            //console.log.apply (console, arguments);
            Function.prototype.apply.call(console.log, console, arguments);
        }
    };
    vesper.imgbase = "../img/";
    vesper.log (vesper);
    return vesper;
}());