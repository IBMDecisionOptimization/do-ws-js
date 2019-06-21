// requires
// <script src="https://cdn.rawgit.com/novus/nvd3/v1.8.1/build/nv.d3.min.js"></script>
// <link href="https://cdn.rawgit.com/novus/nvd3/v1.8.1/build/nv.d3.css" rel="stylesheet" />

function nvd3chart(containerId, data) {

  nv.addGraph(function() {
    var chart = nv.models.stackedAreaChart()
            .margin({right: 100})
           // .x(function(d) { return d[0] })   //We can modify the data accessor functions...
           // .y(function(d) { return d[1] })   //...in case your data is formatted differently.
            .useInteractiveGuideline(true)    //Tooltips which show all data points. Very nice!
            .rightAlignYAxis(true)      //Let's move the y-axis to the right side.
            //.transitionDuration(500)
            .showControls(true)       //Allow user to choose 'Stacked', 'Stream', 'Expanded' mode.
            .clipEdge(true);

    //Format x-axis labels with custom function.
    // chart.xAxis
    // .tickFormat(function(d) { 
    // return d3.time.format('%x')(new Date(d)) 
    // });

    chart.yAxis
    .tickFormat(d3.format(',.2f'));

    d3.select('#'+containerId+' svg')
    .datum(data)
    .call(chart);

    nv.utils.windowResize(chart.update);

    return chart;
  });
          
}


function nvd3scatterchart(containerId, data, xLabel=undefined, yLabel = undefined, useOrdinal = false, min = 0, max= 100) {

  nv.addGraph(function() {
    let scale = d3.scale.category10().range()
    if (useOrdinal)
      scale = d3.scale.linear().domain([min,max]).range([min,max]);
    var chart = nv.models.scatterChart()
//             .showDistX(true)
//             .showDistY(true)
            .useVoronoi(true)
            .color(scale)
            .duration(300);
        
            
        //     chart = nv.models.scatterChart()
        //     .showDistX(true)
        //     .showDistY(true)
        //     .useVoronoi(true)
        //     .color(d3.scale.category10().range())
        //     .duration(300)
        // ;

    if (xLabel != undefined)
      chart.xAxis.axisLabel(xLabel)
    if (yLabel != undefined)
      chart.yAxis.axisLabel(yLabel)
      
    //Format x-axis labels with custom function.
    // chart.xAxis
    // .tickFormat(function(d) { 
    // return d3.time.format('%x')(new Date(d)) 
    // });

    chart.yAxis
    .tickFormat(d3.format(',.2f'));

    d3.select('#'+containerId+' svg')
    .datum(data)
    .call(chart);

    nv.utils.windowResize(chart.update);

    return chart;
  });
          
}

function redrawSensitivityChart(div) {
  let divId = div.id;
  div.cfg.select['SENSITIVITY_CHART_KEY'] = document.getElementById(divId+'_'+'SENSITIVITY_CHART_KEY').value;
  div.cfg.select['SENSITIVITY_CHART_SIZE'] = document.getElementById(divId+'_'+'SENSITIVITY_CHART_SIZE').value;
  div.cfg.select['SENSITIVITY_CHART_X'] = document.getElementById(divId+'_'+'SENSITIVITY_CHART_X').value;
  div.cfg.select['SENSITIVITY_CHART_Y'] = document.getElementById(divId+'_'+'SENSITIVITY_CHART_Y').value;
  div.chartcb();
}

function showAsSensitivityChart(scenariomgr, divId, cb, cfg) {
  let div = document.getElementById(divId);
  
  div.scenariomgr = scenariomgr;
  div.cb = cb;
  div.chartcb = chartcb;
  div.cfg = cfg;
  if (!('select' in cfg))
    cfg.select = {}

  let scenarios = scenariomgr.getScenarios();

  let values = []
  let tableNames = ['kpis', 'parameters', 'Weights'];
  for (let scenario in scenariomgr.scenarios) {
    for (t in tableNames) {
      let tableName = tableNames[t];
      if (tableName in scenariomgr.scenarios[scenario].tables) {
        let table = scenariomgr.scenarios[scenario].tables[tableName];
        for (let row in table.rows) {              
          values.push(row);
        }
      }
    }    
    break;
  }

  let headerDiv = document.getElementById(divId+'_header');
  let html = '  Key: <select id="'+divId+'_'+'SENSITIVITY_CHART_KEY" onChange="redrawSensitivityChart(' + divId +')">'
  for (let v in values) {              
    let value = values[v];
    html = html + '<option value="'+value+'"';
    if (('SENSITIVITY_CHART_KEY' in cfg.select) && (cfg.select['SENSITIVITY_CHART_KEY'] == value))
      html = html + ' selected ';
    html = html + '>'+value+'</option>';              
  }                   
  html = html + '</select>';

  html = html + '  SIZE: <select id="'+divId+'_'+'SENSITIVITY_CHART_SIZE" onChange="redrawSensitivityChart(' + divId +')">'
  for (let v in values) {              
    let value = values[v];
    html = html + '<option value="'+value+'"';
    if (('SENSITIVITY_CHART_SIZE' in cfg.select) && (cfg.select['SENSITIVITY_CHART_SIZE'] == value))
      html = html + ' selected ';
    html = html + '>'+value+'</option>';              
  }            
  html = html + '</select>';

  html = html + '  X: <select id="'+divId+'_'+'SENSITIVITY_CHART_X" onChange="redrawSensitivityChart(' + divId +')">'
  for (let v in values) {              
    let value = values[v];
    html = html + '<option value="'+value+'"';
    if (('SENSITIVITY_CHART_X' in cfg.select) && (cfg.select['SENSITIVITY_CHART_X'] == value))
      html = html + ' selected ';
    html = html + '>'+value+'</option>';             
  }             
  html = html + '</select>';

  html = html + '  Y: <select id="'+divId+'_'+'SENSITIVITY_CHART_Y" onChange="redrawSensitivityChart(' + divId +')">'
  for (let v in values) {              
    let value = values[v];
    html = html + '<option value="'+value+'"';
    if (('SENSITIVITY_CHART_Y' in cfg.select) && (cfg.select['SENSITIVITY_CHART_Y'] == value))
      html = html + ' selected ';
    html = html + '>'+value+'</option>';            
  }                
  html = html + '</select>';

  headerDiv.innerHTML = html;
    
  

  function chartcb() {
    let values = {}
    let useOrdinal = false;
    let max = -99999999999;
    let min = 9999999999;
    for (let s in scenarios) {
        let scenario = scenarios[s];
        
        
        let d = {}
        let key = undefined;

        let kpis = scenario.tables['kpis'].rows;
        for (let k in kpis) {
          if ('value' in kpis[k])
            d[k] = parseFloat(kpis[k].value);
          if ('VALUE' in kpis[k])
            d[k] = parseFloat(kpis[k].VALUE);
        }
        
        if ('Weights' in scenario.tables) {
          let rows = scenario.tables['Weights'].rows;
          for (let p in rows) {
              d[p] = parseFloat(rows[p].value);
          }
        }

        if ('parameters' in scenario.tables) {
          let parameters = scenario.tables['parameters'].rows;
          for (let p in parameters) {             
              d[p] = parameters[p].value;
              if (!isNaN(d[p]))
                d[p] = parseFloat(d[p]);
          }
        }

        key = d[document.getElementById(divId+'_'+'SENSITIVITY_CHART_KEY').value];
        d.size = d[document.getElementById(divId+'_'+'SENSITIVITY_CHART_SIZE').value];
        d.x = d[document.getElementById(divId+'_'+'SENSITIVITY_CHART_X').value];
        d.y = d[document.getElementById(divId+'_'+'SENSITIVITY_CHART_Y').value];
        d.shape = 'circle';

        // Does not work well
        // if (!isNaN(key)) {
        //   useOrdinal = true;
        //   min = Math.min(min, parseFloat(key))
        //   max = Math.max(max, parseFloat(key))
        // }
        if (!(key in values)) values[key] = [];
        values[key].push(d);
    }
    
        
    let data = []
    

    for (let u in values) {
            let d = {
                    values:values[u],
                    key:u
            };
            data.push(d)
    }

    nvd3scatterchart(divId, data, 
      document.getElementById(divId+'_'+'SENSITIVITY_CHART_X').value, 
      document.getElementById(divId+'_'+'SENSITIVITY_CHART_Y').value,
      useOrdinal,
      min,
      max)
  }

  chartcb();
}
