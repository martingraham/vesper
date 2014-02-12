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
    };

    this.updatePosition = function (e) {
        var tooltip = d3.select("#vesperTooltip");
        var bw = $(document).width();
        var bh = $(document).height();
        var tw = $("#vesperTooltip").width();
        var th = $("#vesperTooltip").height();
        var allDefinedAndNonZero = (bw && bh && tw && th);

        var ty = allDefinedAndNonZero
            ? ((bh - e.pageY > th + mouseOffset) ? (e.pageY + mouseOffset) : Math.max (0, e.pageY - mouseOffset - th))
            : e.pageY
        ;
        var tx = allDefinedAndNonZero
            ? ((bw - e.pageX > tw + mouseOffset) ? (e.pageX + mouseOffset) : Math.max (0, e.pageX - mouseOffset - tw))
            : e.pageX
        ;
        //console.log ("e", e, bw, bh, tw, th);
        tooltip
            .style ("top", ty+"px")
            .style ("left", tx+"px")
        ;
     };

    return this;
}();