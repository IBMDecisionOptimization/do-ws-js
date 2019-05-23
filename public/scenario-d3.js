


d3.sankey = function() {
    var sankey = {},
        nodeWidth = 24,
        nodePadding = 8,
        size = [1, 1],
        nodes = [],
        links = [];
  
    sankey.nodeWidth = function(_) {
      if (!arguments.length) return nodeWidth;
      nodeWidth = +_;
      return sankey;
    };
  
    sankey.nodePadding = function(_) {
      if (!arguments.length) return nodePadding;
      nodePadding = +_;
      return sankey;
    };
  
    sankey.nodes = function(_) {
      if (!arguments.length) return nodes;
      nodes = _;
      return sankey;
    };
  
    sankey.links = function(_) {
      if (!arguments.length) return links;
      links = _;
      return sankey;
    };
  
    sankey.size = function(_) {
      if (!arguments.length) return size;
      size = _;
      return sankey;
    };
  
    sankey.layout = function(iterations) {
      computeNodeLinks();
      computeNodeValues();
      computeNodeBreadths();
      computeNodeDepths(iterations);
      computeLinkDepths();
      return sankey;
    };
  
    sankey.relayout = function() {
      computeLinkDepths();
      return sankey;
    };
  
    sankey.link = function() {
      var curvature = .5;
  
      function link(d) {
        var x0 = d.source.x + d.source.dx,
            x1 = d.target.x,
            xi = d3.interpolateNumber(x0, x1),
            x2 = xi(curvature),
            x3 = xi(1 - curvature),
            y0 = d.source.y + d.sy + d.dy / 2,
            y1 = d.target.y + d.ty + d.dy / 2;
        return "M" + x0 + "," + y0
             + "C" + x2 + "," + y0
             + " " + x3 + "," + y1
             + " " + x1 + "," + y1;
      }
  
      link.curvature = function(_) {
        if (!arguments.length) return curvature;
        curvature = +_;
        return link;
      };
  
      return link;
    };
  
    // Populate the sourceLinks and targetLinks for each node.
    // Also, if the source and target are not objects, assume they are indices.
    function computeNodeLinks() {
      nodes.forEach(function(node) {
        node.sourceLinks = [];
        node.targetLinks = [];
      });
      links.forEach(function(link) {
        var source = link.source,
            target = link.target;
        if (typeof source === "number") source = link.source = nodes[link.source];
        if (typeof target === "number") target = link.target = nodes[link.target];
        source.sourceLinks.push(link);
        target.targetLinks.push(link);
      });
    }
  
    // Compute the value (size) of each node by summing the associated links.
    function computeNodeValues() {
      nodes.forEach(function(node) {
        node.value = Math.max(
          d3.sum(node.sourceLinks, value),
          d3.sum(node.targetLinks, value)
        );
      });
    }
  
    // Iteratively assign the breadth (x-position) for each node.
    // Nodes are assigned the maximum breadth of incoming neighbors plus one;
    // nodes with no incoming links are assigned breadth zero, while
    // nodes with no outgoing links are assigned the maximum breadth.
    function computeNodeBreadths() {
      var remainingNodes = nodes,
          nextNodes,
          x = 0;
  
      while (remainingNodes.length) {
        nextNodes = [];
        remainingNodes.forEach(function(node) {
          node.x = x;
          node.dx = nodeWidth;
          node.sourceLinks.forEach(function(link) {
            if (nextNodes.indexOf(link.target) < 0) {
              nextNodes.push(link.target);
            }
          });
        });
        remainingNodes = nextNodes;
        ++x;
      }
  
      //
      moveSinksRight(x);
      scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
    }
  
    function moveSourcesRight() {
      nodes.forEach(function(node) {
        if (!node.targetLinks.length) {
          node.x = d3.min(node.sourceLinks, function(d) { return d.target.x; }) - 1;
        }
      });
    }
  
    function moveSinksRight(x) {
      nodes.forEach(function(node) {
        if (!node.sourceLinks.length) {
          node.x = x - 1;
        }
      });
    }
  
    function scaleNodeBreadths(kx) {
      nodes.forEach(function(node) {
        node.x *= kx;
      });
    }
  
    function computeNodeDepths(iterations) {
      var nodesByBreadth = d3.nest()
          .key(function(d) { return d.x; })
          .sortKeys(d3.ascending)
          .entries(nodes)
          .map(function(d) { return d.values; });
  
      //
      initializeNodeDepth();
      resolveCollisions();
      for (var alpha = 1; iterations > 0; --iterations) {
        relaxRightToLeft(alpha *= .99);
        resolveCollisions();
        relaxLeftToRight(alpha);
        resolveCollisions();
      }
  
      function initializeNodeDepth() {
        var ky = d3.min(nodesByBreadth, function(nodes) {
          return (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value);
        });
  
        nodesByBreadth.forEach(function(nodes) {
          nodes.forEach(function(node, i) {
            node.y = i;
            node.dy = node.value * ky;
          });
        });
  
        links.forEach(function(link) {
          link.dy = link.value * ky;
        });
      }
  
      function relaxLeftToRight(alpha) {
        nodesByBreadth.forEach(function(nodes, breadth) {
          nodes.forEach(function(node) {
            if (node.targetLinks.length) {
              var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
              node.y += (y - center(node)) * alpha;
            }
          });
        });
  
        function weightedSource(link) {
          return center(link.source) * link.value;
        }
      }
  
      function relaxRightToLeft(alpha) {
        nodesByBreadth.slice().reverse().forEach(function(nodes) {
          nodes.forEach(function(node) {
            if (node.sourceLinks.length) {
              var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
              node.y += (y - center(node)) * alpha;
            }
          });
        });
  
        function weightedTarget(link) {
          return center(link.target) * link.value;
        }
      }
  
      function resolveCollisions() {
        nodesByBreadth.forEach(function(nodes) {
          var node,
              dy,
              y0 = 0,
              n = nodes.length,
              i;
  
          // Push any overlapping nodes down.
          nodes.sort(ascendingDepth);
          for (i = 0; i < n; ++i) {
            node = nodes[i];
            dy = y0 - node.y;
            if (dy > 0) node.y += dy;
            y0 = node.y + node.dy + nodePadding;
          }
  
          // If the bottommost node goes outside the bounds, push it back up.
          dy = y0 - nodePadding - size[1];
          if (dy > 0) {
            y0 = node.y -= dy;
  
            // Push any overlapping nodes back up.
            for (i = n - 2; i >= 0; --i) {
              node = nodes[i];
              dy = node.y + node.dy + nodePadding - y0;
              if (dy > 0) node.y -= dy;
              y0 = node.y;
            }
          }
        });
      }
  
      function ascendingDepth(a, b) {
        return a.y - b.y;
      }
    }
  
    function computeLinkDepths() {
      nodes.forEach(function(node) {
        node.sourceLinks.sort(ascendingTargetDepth);
        node.targetLinks.sort(ascendingSourceDepth);
      });
      nodes.forEach(function(node) {
        var sy = 0, ty = 0;
        node.sourceLinks.forEach(function(link) {
          link.sy = sy;
          sy += link.dy;
        });
        node.targetLinks.forEach(function(link) {
          link.ty = ty;
          ty += link.dy;
        });
      });
  
      function ascendingSourceDepth(a, b) {
        return a.source.y - b.source.y;
      }
  
      function ascendingTargetDepth(a, b) {
        return a.target.y - b.target.y;
      }
    }
  
    function center(node) {
      return node.y + node.dy / 2;
    }
  
    function value(link) {
      return link.value;
    }
  
    return sankey;
  };

function d3sankey(containerId, graph, config) {
  
  var margin = {top: config.top, right: config.right, bottom: config.bottom, left: config.left},
  width = config.width - margin.left - margin.right,
  height = config.height - margin.top - margin.bottom;

  document.getElementById(containerId).innerHTML = "";

  // append the svg object to the body of the page
  var svg = d3.select("#"+containerId).append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", 
          "translate(" + margin.left + "," + margin.top + ")");

  // Set the sankey diagram properties
  var sankey = d3.sankey()
  .nodeWidth(16)
  .nodePadding(5)
  .size([width, height]);

  var path = sankey.link();

  sankey
  .nodes(graph.nodes)
  .links(graph.links)
  .layout(2);
  
  // add in the links
  var link = svg.append("g").selectAll(".link")
          .data(graph.links)
  .enter().append("path")
          .attr("class", "link")
          .attr("d", path)
          .style("stroke", function(d) { return d.color; })
          .style("stroke-width", function(d) { return Math.max(1, d.dy); })
          .sort(function(a, b) { return b.dy - a.dy; });
  
  // add the link titles
  link.append("title")
    .text(function(d) { return d.tooltip; });

  // add in the nodes
  var node = svg.append("g").selectAll(".node")
          .data(graph.nodes)
          .enter().append("g")
          .attr("class", "node")
          .attr("transform", function(d) { 
                  return "translate(" + d.x + "," + d.y + ")"; })
          .call(d3.behavior.drag()
          .origin(function(d) { return d; })
          .on("dragstart", function() { 
          this.parentNode.appendChild(this); })
          .on("drag", dragmove));
  
  // add the rectangles for the nodes
  node.append("rect")
          .attr("height", function(d) { return d.dy; })
          .attr("width", sankey.nodeWidth())
//           .style("fill", function(d) { 
//                   return d.color 
//           })
        .style("fill", function(d) { 
              //return d.color; 
              d3.select(this).attr("fill", function() {
                    return d.color;
              })
            })
            .on("mouseover", function(d) {
              //this.setState({ fillColour: 'red' });
              d3.select(this)
                .attr("fill", "red");
            })
            .on("mouseout", function(d) {
              // this.setState({ fillColour: d.color });
                d3.select(this).attr("fill", function() {
                    return d.color;
                });
            })
          .style("stroke", function(d) { 
                          return d3.rgb(d.color).darker(2); })
          .append("title")
          .text(function(d) { return d.tooltip; });

  
  // add in the title for the nodes
  node.append("text")
          .attr("x", -6)
          .attr("y", function(d) { return d.dy / 2; })
          .attr("dy", ".35em")
          .attr("text-anchor", "end")
          .attr("transform", null)
          .text(function(d) { return d.title; })
          .filter(function(d) { return d.x < width / 2; })
          .attr("x", 6 + sankey.nodeWidth())
          .attr("text-anchor", "start");
  
  // the function for moving the nodes
  function dragmove(d) {
  d3.select(this)
          .attr("transform", 
          "translate(" 
                  + d.x + "," 
                  + (d.y = Math.max(
                  0, Math.min(height - d.dy, d3.event.y))
                  ) + ")");
  sankey.relayout();
  link.attr("d", path);
  }
}

function d3chart(containerId, data, config) {
  
  // set the dimensions and margins of the graph
  var margin = {top: config.top, right: config.right, bottom: config.bottom, left: config.left},
  width = config.width - margin.left - margin.right,
  height = config.height - margin.top - margin.bottom;

  // set the ranges
  // var x = d3.scaleBand()
  //       .range([0, width])
  //       .padding(0.1);
  var x = d3.scale.ordinal().rangeRoundBands([0, width], .05);
  // var y = d3.scaleLinear()
  //       .range([height, 0]);
  var y = d3.scale.linear().range([height, 0]);

        
  document.getElementById(containerId).innerHTML = "";

  // append the svg object to the body of the page
  // append a 'group' element to 'svg'
  // moves the 'group' element to the top left margin
  var svg = d3.select("#"+containerId).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", 
          "translate(" + margin.left + "," + margin.top + ")");



  // Scale the range of the data in the domains
  x.domain(data.map(function(d) { return d.x; }));
  y.domain([0, d3.max(data, function(d) { return d.y; })]);

  // append the rectangles for the bar chart
  svg.selectAll(".bar")
    .data(data)
  .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function(d) { return x(d.x); })
//    .attr("width", x.bandwidth())
    .attr("width", x.rangeBand())
    .attr("y", function(d) { return y(d.y); })
    .style("fill", function(d) { 
      //return d.color; 
      d3.select(this).attr("fill", function() {
            return d.color;
      })
    })
    .on("mouseover", function(d) {
      //this.setState({ fillColour: 'red' });
      d3.select(this)
        .attr("fill", "red");
    })
    .on("mouseout", function(d) {
      // this.setState({ fillColour: d.color });
        d3.select(this).attr("fill", function() {
            return d.color;
        });
    })
    .style("text-anchor", "end")
    .attr("height", function(d) { return height - y(d.y); })
    .append("title")
          .text(function(d) { 
          return d.tooltip; 
          });

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    //.tickFormat(d3.time.format("%Y-%m"));
  
  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .ticks(10);

  // add the x Axis
  svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      //.call(d3.axisBottom(x))
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "start")
      .attr("y", 0)
      .attr("x", 5) ;

  // add the y Axis
  svg.append("g")
      //.call(d3.axisLeft(y));
      .call(yAxis);
          
}