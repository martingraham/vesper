// return >0 if v1 > v2, <0 if v1 < v2, 0 if v1 == v2
var versionCompare = function (v1, v2) {
    var va1 = v1.split(".");
    var va2 = v2.split(".");

    var limit = Math.min (va1.length, va2.length);
    var result = 0;
    for (var n = 0; (n < limit) && (result == 0); n++) {
        result = (+va1[n]) - (+va2[n]);
        if (isNaN(result)) {
            return undefined;
        }
    }

    if (result == 0) {
        result = va1.length - va2.length;
    }
    return result;
};

test( "hello test", function() {
    ok( 1 == "1", "Passed!" );
});

test ("version smaller", function () {
   ok (versionCompare("0.6", "0.7") < 0, "Passed!")
});

test ("version bigger", function () {
    ok (versionCompare("0.7", "0.6") > 0, "Passed!")
});

test ("version equal", function () {
    ok (versionCompare("0.6", "0.6") == 0, "Passed!")
});

test ("version equal then longer", function () {
    ok (versionCompare("0.6.1", "0.6") > 0, "Passed!")
});

test ("version bigger but longer", function () {
    ok (versionCompare("1.6.1", "0.6") > 0, "Passed!")
});

test ("version smaller but longer", function () {
    ok (versionCompare("0.6.1", "1.6") < 0, "Passed!", "eh")
});

test ("returns undefined on text", function () {
    ok (versionCompare("0.6.1", "0.6.1-beta") == undefined, "Passed!")
});