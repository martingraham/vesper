VESPER.tooltip = new function () {
    this.holdDuration = 10000;
    this.fadeDuration = 200;
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
            .style ("visibility", "visible")
            .style ("opacity", null)
            .transition()
            .duration(self.holdDuration)
            .each ("end", function() {
                d3.select(this)
                    .transition()
                    .duration (self.fadeDuration)
                    .style ("opacity", 0)
                    .each ("end", function () {
                        d3.select(this).style ("visibility", "hidden");
                    })
                ;
            })
        ;
    };

    this.updatePosition = function (e) {
        var tooltip = d3.select("#vesperTooltip");
        tooltip
            .style ("top", (e.pageY+10)+"px")
            .style ("left", (e.pageX+10)+"px")
        ;
     };
};