var VESPER = VESPER || {};

VESPER.tooltip = new function () {
    this.holdDuration = 10000;
    this.fadeDuration = 200;
    var mouseOffset = 10;
    var self = this;

    this.init = function () {
        var tooltip = d3.select("body").selectAll("#vesperTooltip").data([0])
            .enter()
            .append("div")
                .attr ("id", "vesperTooltip")
                .attr ("class", "vesperTooltip")
                .style ("visibility", "hidden")
        ;
        tooltip.append("h2");
        tooltip.append("p");
        return this;
    };

    this.setToFade = function () {
        var tooltip = d3.select("#vesperTooltip");
        tooltip
            .transition()
            .duration (self.fadeDuration)
            .style ("opacity", 0)
            .each ("end", function () {
                d3.select(this).style ("visibility", "hidden");
            })
        ;
        return this;
    };

    this.updateText = function (title, str) {
        var tooltip = d3.select("#vesperTooltip");
        tooltip.select("h2").text(title);
        tooltip.select("p").html(str);
        tooltip
            .transition()
            .style ("visibility", "visible")
            .style ("opacity", null)
            .transition()
            .duration(self.holdDuration)
            .each ("end", function() {
                self.setToFade();
            })
        ;
        return this;
    };

    this.updatePosition = function (e) {
        if (e) {
            // need the following measurements to ensure tooltip stays within visible and current bounds of document
            var tooltip = d3.select("#vesperTooltip");
            var dw = $(document).width();
            var dh = $(document).height();
            var ww = $(window).width();
            var wh = $(window).height();
            var sx = $(document).scrollLeft();
            var sy = $(document).scrollTop();

            var tx = e.pageX;
            var ty = e.pageY;
            var tw = $("#vesperTooltip").outerWidth();
            var th = $("#vesperTooltip").outerHeight();

            var allDefinedAndNonZero = (dw && dh && tw && th && ww && wh); // test all widths/heights are non-zero and defined
            var newtx, newty;

            if (allDefinedAndNonZero) {
                var roomBelow = ty + th + mouseOffset < Math.min (dh, wh + sy);
                newty = roomBelow ? ty + mouseOffset : ty - th - mouseOffset;

                var roomRight = tx + tw + mouseOffset < Math.min (dw, ww + sx);
                newtx = roomRight ? tx + mouseOffset : tx - tw - mouseOffset;
            } else {
                newtx = tx;
                newty = ty;
            }

            //console.log ("coords", "page xy: {",e.pageX, e.pageY, "}, client xy:{", e.clientX, e.clientY, "}, doc wh: {", dw, dh,"}, tooltip wh: {", tw, th,
            //    "}, window wh: {", $(window).width(), $(window).height(), "}, docscroll xy: {", $(document).scrollLeft(), $(document).scrollTop());
            tooltip
                .style ("top", newty+"px")
                .style ("left", newtx+"px")
            ;
        }
        return this;
     };

    return this;
}();