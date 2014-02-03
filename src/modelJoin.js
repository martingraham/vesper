/**
 * Created with JetBrains WebStorm.
 * User: cs22
 * Date: 03/10/13
 * Time: 15:17
 * To change this template use File | Settings | File Templates.
 */
VESPER.modelComparisons = new function () {

    this.modelCoverageToSelectionOld = function (model1, model2, linkField1, linkField2) {
        var small = smaller (model1, model2);
        var large = (small === model1 ? model2 : model1);
        var smallLinkField = (small === model1 ? linkField1 : linkField2);
        var largeLinkField = (small === model1 ? linkField2 : linkField1);
        var smallData = [small.getExplicitTaxonomy(), small.getImplicitTaxonomy()];
        var largeData = [large.getExplicitTaxonomy(), large.getImplicitTaxonomy()];
        var smallSelection = small.getSelectionModel();
        var largeSelection = large.getSelectionModel();
        VESPER.log ("lf", linkField1, linkField2);

        smallSelection.clear();
        largeSelection.clear();

        smallSelection.setUpdating (true);
        largeSelection.setUpdating (true);

        var invMap = {};
        for (var stset = 0; stset < smallData.length; stset++) {
            var tree = smallData[stset];
            if (tree) {
                for (var prop in tree) {
                    if (tree.hasOwnProperty (prop)) {
                        var val = small.getDataPoint (tree[prop], smallLinkField);
                        invMap[val] = prop;
                    }
                }
            }
        }
       // VESPER.log ("invMap", invMap);
       // var c = 0;
        for (var ltset = 0; ltset < largeData.length; ltset++) {
            var tree = largeData[ltset];
            if (tree) {
                for (var prop in tree) {
                    if (tree.hasOwnProperty (prop)) {
                        var val = large.getDataPoint (tree[prop], largeLinkField);

                        if (invMap[val]) {
                            smallSelection.addToMap (invMap[val]);
                            largeSelection.addToMap (prop);
                            //if (c % 100 == 0) {
                            //    VESPER.log ("match", val, invMap[val], prop);
                            //}
                            //c++;
                        }
                    }
                }
            }
        }

        smallSelection.setUpdating (false);
        largeSelection.setUpdating (false);
    };

    this.modelCoverageToSelection = function (model1, model2, linkField1, linkField2) {
        var small = smaller (model1, model2);
        var large = (small === model1 ? model2 : model1);
        var smallLinkField = (small === model1 ? linkField1 : linkField2);
        var largeLinkField = (small === model1 ? linkField2 : linkField1);
        var smallData = [small.getExplicitTaxonomy(), small.getData()];
        var largeData = [large.getExplicitTaxonomy(), large.getData()];
        var smallSelection = small.getSelectionModel();
        var largeSelection = large.getSelectionModel();
        VESPER.log ("lf", linkField1, linkField2);

        smallSelection.clear();
        largeSelection.clear();

        smallSelection.setUpdating (true);
        largeSelection.setUpdating (true);

        var invMap = [];
        for (var stset = 0; stset < smallData.length; stset++) {
            var tree = smallData[stset];
            if (tree) {
                for (var prop in tree) {
                    if (tree.hasOwnProperty (prop)) {
                        var val = small.getDataPoint (tree[prop], smallLinkField);
                        invMap.push ([prop, val]);
                    }
                }
            }
        }

        var stopwatch = {base: 0};
        MGNapier.NapVisLib.resetStopwatch (stopwatch);

        invMap.sort (function(a,b) {
            if ( a[1] < b[1] )
                { return -1; }
            if ( a[1] > b[1] )
                { return 1; }
            return 0;
        });
        console.log ("sorted array", invMap);

        console.log ("sort", MGNapier.NapVisLib.elapsedStopwatch (stopwatch), "ms");
        MGNapier.NapVisLib.resetStopwatch (stopwatch);

        var c = 0;

        var lastVal, lastWhere;
        for (var ltset = 0; ltset < largeData.length; ltset++) {
            var tree = largeData[ltset];
            if (tree) {

                for (var prop in tree) {
                    if (tree.hasOwnProperty (prop)) {
                        var val = large.getDataPoint (tree[prop], largeLinkField);
                        // lastVal === val is a useful shortcut when we have lots of specimens of the same name, usually they are grouped sequentially in the record data
                        var where = (lastVal === val ? lastWhere : binaryIndexOf (invMap, val));
                        //var where = binaryIndexOf (invMap, val);
                        lastVal = val;
                        lastWhere = where;
                        c++;

                        // exact match
                        if (where >= 0) {
                            smallSelection.addToMap (invMap[where][0]);
                            largeSelection.addToMap (prop);
                            //if (c % 100 == 0) {
                            //    VESPER.log ("match", val, invMap[val], prop);
                            //}
                            //c++;
                        }
                        else {
                            where = Math.abs (where);
                            if (c % 1000 === 0) {
                                console.log (prop, val, invMap[Math.max(0, where-1)], invMap[where]);

                            }
                            partMatch (prop, val, where, invMap, smallSelection, largeSelection);
                        }
                    }
                }
            }
        }

        console.log ("search", MGNapier.NapVisLib.elapsedStopwatch (stopwatch), "ms");
        console.log ("Done",c,"comparisons");

        smallSelection.setUpdating (false);
        largeSelection.setUpdating (false);
    };

    function smaller (model1, model2) {
        var c1 = MGNapier.NapVisLib.countObjProperties (model1.getData());
        var c2 = MGNapier.NapVisLib.countObjProperties (model2.getData());
        return (c1 < c2 ? model1 : model2);
    }

    function jointPrefixLength (s1, s2) {
        var min = Math.min ((s1 ? s1.length : 0), (s2 ? s2.length : 0));
        for (var n = 0; n < min; n++) {
            if (s1[n] !== s2[n]) {
                return n;
            }
        }
        return min;
    }

    function partMatch (prop, val, where, invMap, smallSel, largeSel) {
        var valL = val.length;
        var e1 = invMap[Math.max(0, where-1)];
        var e2 = invMap[where];
        var l1 = Math.min (valL, e1[1].length);
        var l2 = Math.min (valL, e2[1].length);

        var m1 = jointPrefixLength (val, e1[1]);
        var m2 = jointPrefixLength (val, e2[1]);
        if (m1 < 10 && m2 < 10) {
            return; // no reasonable match
        }
        if (m1 === l1) {
            smallSel.addToMap (e1[0]);
            largeSel.addToMap (prop);
        }
        if (m2 === l2) {
            smallSel.addToMap (e2[0]);
            largeSel.addToMap (prop);
        }
    }

    /**
     * Performs a binary search on the host array. This method can either be
     * injected into Array.prototype or called with a specified scope like this:
     * binaryIndexOf.call(someArray, searchElement);
     *
     * @param {*} searchElement The item to search for within the array.
     * @return {Number} The index of the element which defaults to -1 when not found.
     */
    // http://oli.me.uk/2013/06/08/searching-javascript-arrays-with-a-binary-search/
    function binaryIndexOf (arr, searchElement) {
        var minIndex = 0;
        var maxIndex = arr.length - 1;
        var currentIndex;
        var currentElement;
        var resultIndex;

        while (minIndex <= maxIndex) {
            resultIndex = currentIndex = (minIndex + maxIndex) / 2 | 0;
            currentElement = arr[currentIndex][1]; // cos its an array of arrays

            if (currentElement < searchElement) {
                minIndex = currentIndex + 1;
            }
            else if (currentElement > searchElement) {
                maxIndex = currentIndex - 1;
            }
            else {
                return currentIndex;
            }
        }

        return (-(Math.max(maxIndex,minIndex)));
    }

    this.test1 = function () {
        var arr = [["345", "ant"], ["2013","bat"], ["45", "cat"], ["133", "dog"], ["708", "eel"]];
        var tests = ["rabbit", "aardvark", "cat", "cattus fattus"];
        for (var n = 0; n < tests.length; n++) {
            console.log ("binary test", tests[n], binaryIndexOf (arr, tests[n]));
        }
    };


    return this;
}();