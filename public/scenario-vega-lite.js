// requires
//  <script src="https://cdn.jsdelivr.net/npm/vega@4.4.0"></script>
// <script src="https://cdn.jsdelivr.net/npm/vega-lite@3.0.0-rc12"></script>
// <script src="https://cdn.jsdelivr.net/npm/vega-embed@3.29.1"></script>

function vegalitechart(containerId, table, config = undefined) {

  data =[]

  for (r in table.rows) {
          let row = table.rows[r]
          let d = {}
          for (c in table.cols) {
            let column = table.cols[c];
            d[column] = row[column];
          }
          data.push(d);
  }

  if (config == undefined)
    config = {};

  config['$schema'] = 'https://vega.github.io/schema/vega-lite/v2.0.json';
  config.data = { values: data };

  vegaEmbed('#'+containerId, config);
          
}

function vegalitechart2(containerId, scenarios, tableName, config = undefined) {

  data = [];

  for (let s in scenarios) {
    let scenario = scenarios[s];
    if (tableName in scenario.tables) {
      let table = scenario.tables[tableName];
      for (r in table.rows) {
              let row = table.rows[r]
              let d = {}
              for (c in table.cols) {
                let column = table.cols[c];
                d[column] = row[column];
                d['$scenario'] = scenario.getName();
              }
              data.push(d);
      }
    }
  }

  if (config == undefined)
    config = {};

  config['$schema'] = 'https://vega.github.io/schema/vega-lite/v2.0.json';
  config.data = { values: data };

  vegaEmbed('#'+containerId, config);
          
}

function redrawScenarioChart(div) {
  //let div = document.getElementById(mydivId);  
  div.vegacb();
}
function showAsScenarioChart(scenariomgr, divId, cb) {
 
  let headerDiv = document.getElementById(divId+'_header');
  let html = '  Parameter: <select id="CHART_PARAMETER" onChange="redrawScenarioChart(' + divId +')">'
  for (let scenario in scenariomgr.scenarios) {
     if ('parameters' in scenariomgr.scenarios[scenario].tables) {
          let parameters = scenariomgr.scenarios[scenario].tables['parameters'];
          for (let row in parameters.rows) {              
              html = html + '<option value="'+row+'">'+row+'</option>';              
          }
      }
      break;
  }                
  html = html + '</select>';
  html = html + '  KPI: <select id="CHART_KPI" onChange="redrawScenarioChart(' + divId +')">'
  for (let scenario in scenariomgr.scenarios) {
     if ('kpis' in scenariomgr.scenarios[scenario].tables) {
          let parameters = scenariomgr.scenarios[scenario].tables['kpis'];
          for (let row in parameters.rows) {              
              html = html + '<option value="'+row+'">'+row+'</option>';              
          }
      }
      break;
  }
                
  html = html + '</select>';

  headerDiv.innerHTML = html;

  let div = document.getElementById(divId);
  
  div.scenariomgr = scenariomgr;
  div.cb = cb;
  div.vegacb = vegacb;

  function vegacb() {
    data = []

    function printDate(d) {
      return ("0"+(d.getDate()+1)).slice(-2)+'/'+("0"+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();
    }

    let dates = []
    let date = new Date();
    date = new Date(date.getTime() - 30*1000*60*60*24);

    let kpi = document.getElementById('CHART_KPI').value;
    let parameter = document.getElementById('CHART_PARAMETER').value;

    for (let scenario in scenariomgr.scenarios) {
        if (scenario != ".DS_Store"){
            let vals = {
              name:scenario,
              date: printDate(date)
              //date: date
            };
            dates.push(printDate(date));

            if ('parameters' in scenariomgr.scenarios[scenario].tables) {
                let parameters = scenariomgr.scenarios[scenario].tables['parameters'];
                for (let row in parameters.rows) {
                  if (row == parameter) {
                  
                    let value = parameters.rows[row].value;
                    if (value == undefined)
                      value = parameters.rows[row].VALUE;
                    vals[row] = value;
                  }
                }
            }
            if ('kpis' in scenariomgr.scenarios[scenario].tables) { 
                let kpis = scenariomgr.scenarios[scenario].tables['kpis'];
                for (let row in kpis.rows) {
                  if (row == kpi) {
                    value = kpis.rows[row].value;
                    if (value == undefined)
                      value = kpis.rows[row].VALUE;
                    vals[kpi] = value
                  }
                }
            }
            data.push(vals);

            vals = JSON.parse(JSON.stringify(vals));
            date.setTime(date.getTime() + 1000*60*60*24)
        }
    }

    let vw = div.parentNode.clientWidth-200;
    let vh = div.parentNode.clientHeight-80;
    config = {
            "width" : vw,
            "height" : vh,
            "mark" : "bar",
            "encoding": {
                    "x": {
                            "field": "date",
                            "type": "ordinal",
                            //"timeUnit": "yearmonthdate",
                            "scale": {
                                    "domain": dates
                            },
                            "axis": {
                                    "labels": true,
                                    "labelAngle":0
                            }
                    },
                    "y": {
                            "field": kpi,
                            "type": "quantitative",
                            "aggregate": "sum"
                    },
                    "tooltip": {
                            "field": kpi                    },
                    "color": {
                            "field": parameter,
                            "type": "nominal"
                    }
            }
    }

    config['$schema'] = 'https://vega.github.io/schema/vega-lite/v2.0.json';
    config.data = { values: data };

    vegaEmbed('#'+divId, config);
  }

  vegacb()
}