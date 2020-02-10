'use strict';

(function() {

  let data = "no data";
  let svgContainer = ""; // keep SVG reference in global scope

  // load data and make scatter plot after window loads
  window.onload = function() {
    svgContainer = d3.select('body')
      .append('svg')
      .attr('width', 800)
      .attr('height', 600);
    // d3.csv is basically fetch but it can be be passed a csv file as a parameter
    d3.csv("gapminder.csv")
      .then((data) => makeScatterPlot(data));
  }

  // make scatter plot with trend line
  function makeScatterPlot(csvData) {
    data = csvData; // assign data as global variable

    // get arrays of fertility  data and life Expectancy data
    //let fertility_data = data.map((row) => parseFloat(row["fertility"]));
    //let life_expectancy_data = data.map((row) => parseFloat(row["life_expectancy"]));
    let fertility_data = [];
    let life_expectancy_data = [];
    for (let i =0; i < data.length; i++) {
      fertility_data.push(parseFloat(data[i]["fertility"]))
      life_expectancy_data.push(parseFloat(data[i]["life_expectancy"]))
    }
    // find data limits
    let axesLimits = findMinMax(fertility_data, life_expectancy_data);
    // draw axes and return scaling + mapping functions
    let mapFunctions = drawAxes(axesLimits, fertility_data, life_expectancy_data, svgContainer,50,750,550,16,8);

    // plot data as points and add tooltip functionality
    plotData(mapFunctions);

    // draw title and axes labels
    makeLabels();
  }

  // make title and axes labels
  function makeLabels() {
    svgContainer.append('text')
      .attr('x', 100)
      .attr('y', 40)
      .style('font-size', '14pt')
      .text("Fertility vs Life Expectancy (1980)");

    svgContainer.append('text')
      .attr('x', 330)
      .attr('y', 590)
      .style('font-size', '10pt')
      .text('Fertility (Avg Children per Woman)');

    svgContainer.append('text')
      .attr('transform', 'translate(15, 360)rotate(-90)')
      .style('font-size', '10pt')
      .text('Life Expectancy (years)');
  }

  // plot all the data points on the SVG
  // and add tooltip functionality
  function plotData(map) {
    // get population data as array
    let pop_data = data.map((row) => +row["population"]);
    let pop_limits = d3.extent(pop_data);
    // make size scaling function for population
    let pop_map_func = d3.scaleLinear()
      .domain([pop_limits[0], pop_limits[1]])
      .range([3, 20]);

    // mapping functions
    let xMap = map.x;
    let yMap = map.y;
    let xMap20 =[];
    for (let j=0;j<map.x.length;j++) {
      let num = parseFloat(xMap[j])+20;
      xMap20.push(num);
    }
    // make tooltip
    let div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

    svgContainer.selectAll("text")
      .data(data)
      .enter()
      .append("text")
        .attr('alignment-baseline','central')
        .attr('x', function(d,i) {return xMap20[i];})
        .attr('y', function(d,i) {return yMap[i];})
        .attr("class", function(d){
          if(d["population"]<=100000000 || d["year"]!=1980){
            return "hide";}
          })
        .text(function (d) {return d["country"];})
        .attr("fill","black");

    // append data to SVG and plot as points
    let circles = svgContainer.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
        .attr('class', function(d){
          if(d["year"]!=1980){
            return "hide";
          }
        })
        .attr('cx', function(d,i) {return xMap[i];})
        .attr('cy', function(d,i) {return yMap[i];})
        .attr('r', (d) => pop_map_func(d["population"]))
        .attr('stroke', "#3e72a3")
        .attr('stroke-width', "2")
        .attr('fill',"none")
        // add tooltip functionality to points
        .on("mouseover", function(d,i) {
          div.transition()
            .duration(200)
            .style("opacity", .9);
          div.html(d.location)
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
            //graph
          var tipSVG = div.append("svg")
            .attr("width",300)
            .attr("height",300)
          var popdata = [];
          var yeardata = [];
          var units = "Thousands";
          for (let j = 0; j < data.length; j++) {
            if (data[j]["country"] == data[i]["country"]) {
              popdata.push(data[j]["population"]/1000);
              yeardata.push(data[j]["year"]);
            }
          }
          // find data limits
          let axesLimit = findMinMax(yeardata, popdata);
          if (axesLimit.yMin > 1000) {
            units = "Millions";
            axesLimit.yMin = axesLimit.yMin/1000;
            axesLimit.yMax = axesLimit.yMax/1000;
            for (let k = 0; k < popdata.length; k++) {
              popdata[k]=popdata[k]/1000;
            }
          }
          // draw axes and return scaling + mapping functions
          let mapFunction = drawAxes(axesLimit, yeardata, popdata, tipSVG, 55, 250,250,7,5);
          tipSVG.append('text')
            .attr('x', 150)
            .attr('y', 20)
            .attr('text-anchor','middle')
            .style('font-size', '10pt')
            .text(data[i]["country"]);
          tipSVG.append('text')
            .attr('x', 140)
            .attr('y', 280)
            .style('font-size', '10pt')
            .text('Year');
          tipSVG.append('text')
            .attr('transform', 'translate(15, 210)rotate(-90)')
            .style('font-size', '10pt')
            .text('Population (in '+units+')');
          
          var graphData =[];
          for (let j=0; j< popdata.length; j++) {
            if (!isNaN(popdata[j])){
              graphData.push([mapFunction.x[j], mapFunction.y[j]]);
            }
            
          }
          tipSVG.append("path")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", "1.5")
            .attr("d", d3.line()(graphData)
          );
          
        })
        .on("mouseout", (d) => {
          div.transition()
            .duration(500)
            .style("opacity", 0);
        });

    
  }
  // draw the axes and ticks
  function drawAxes(limits, x, y, svg, border, xRange, yRange, xTick,yTick) {
    // function to scale x value
    let xScale = d3.scaleLinear()
      .domain([limits.xMin - 0.5, limits.xMax + 0.5]) // give domain buffer room
      .range([border, xRange]);

    let xMap = [];
    for (let i = 0; i < x.length; i++) {
      xMap.push(xScale(x[i]));
    }

    // plot x-axis at bottom of SVG
    let xAxis = d3.axisBottom(xScale).ticks(xTick);
    svg.append("g")
      .attr('transform', 'translate(0, '+ yRange +')')
      .call(xAxis);

    // function to scale y
    let yScale = d3.scaleLinear()
    .domain([limits.yMax + 1, limits.yMin - 1]) // give domain buffer
    .range([border, yRange]);

    let yMap = [];
    for (let i =0; i < y.length; i++) {
      yMap.push(yScale(y[i]));
    }

    // plot y-axis at the left of SVG
    let yAxis = d3.axisLeft(yScale).ticks(yTick);
    svg.append('g')
      .attr('transform', 'translate('+border +', 0)')
      .call(yAxis);

    // return mapping and scaling functions
    return {
      x: xMap,
      y: yMap,
      xScale: xScale,
      yScale: yScale
    };
  }

  // find min and max for arrays of x and y
  function findMinMax(x, y) {
    // get min/max x values
    let xMin = Math.min.apply(null, x.filter(function(n) { return !isNaN(n); }));
    let xMax = Math.max.apply(null, x.filter(function(n) { return !isNaN(n); }));
    // get min/max y values
    let yMin = Math.min.apply(null, y.filter(function(n) { return !isNaN(n); }));
    let yMax = Math.max.apply(null, y.filter(function(n) { return !isNaN(n); }));
    // return formatted min/max data as an object
    return {
      xMin : xMin,
      xMax : xMax,
      yMin : yMin,
      yMax : yMax
    }
  }
})();