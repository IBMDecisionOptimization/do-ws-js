// requires
//  <script src="https://cdn.jsdelivr.net/npm/vega@4.4.0"></script>
// <script src="https://cdn.jsdelivr.net/npm/vega-lite@3.0.0-rc12"></script>
// <script src="https://cdn.jsdelivr.net/npm/vega-embed@3.29.1"></script>

function vegalitechart(containerId, table, vegacfg = undefined) {

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

 
  let myvegacfg = {};
  if (vegacfg != undefined)
    myvegacfg = JSON.parse(JSON.stringify(vegacfg))

  myvegacfg['$schema'] = 'https://vega.github.io/schema/vega-lite/v2.0.json';
  myvegacfg.data = { values: data };

  vegaEmbed('#'+containerId, myvegacfg);
          
}

function vegalitechart2(containerId, scenarios, tableName, vegacfg = undefined) {

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

  let myvegacfg = {};
  if (vegacfg != undefined)
    myvegacfg = JSON.parse(JSON.stringify(vegacfg))

  myvegacfg['$schema'] = 'https://vega.github.io/schema/vega-lite/v2.0.json';
  myvegacfg.data = { values: data };

//   let vegadiv = document.getElementById(containerId)
  
  vegaEmbed('#'+containerId, myvegacfg);
          
}

function redrawScenarioChart(div) {
  div.cfg.parameter = document.getElementById('CHART_PARAMETER').value;
  div.cfg.kpi = document.getElementById('CHART_KPI').value;
  div.vegacb();
}
function showAsScenarioChart(scenariomgr, divId, cb, cfg ={}) {
 
  let headerDiv = document.getElementById(divId+'_header');
  let html = '  Parameter: <select id="CHART_PARAMETER" onChange="redrawScenarioChart(' + divId +')">'
  for (let scenario in scenariomgr.scenarios) {
    let parametersTableId = scenariomgr.config['$parameters'].tableId; 
     if (parametersTableId in scenariomgr.scenarios[scenario].tables) {
          let parameters = scenariomgr.scenarios[scenario].tables[parametersTableId];
          for (let row in parameters.rows) {              
              html += '<option value="'+row+'"';
              if ( ('parameter' in cfg) && (cfg.parameter == row) )
                html += ' selected';
              html += '>'+row+'</option>';              
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
              html = html + '<option value="'+row+'"'
              if ( ('kpi' in cfg) && (cfg.kpi == row) )
                html += ' selected';
              html += '>'+row+'</option>';              
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
  div.cfg = cfg;

  function vegacb() {
    data = []

    function printDate(d) {
      return ("0"+(d.getDate()+1)).slice(-2)+'/'+("0"+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();
    }

    let dates = []

    let kpi = document.getElementById('CHART_KPI').value;
    let parameter = document.getElementById('CHART_PARAMETER').value;

    for (let scenario in scenariomgr.scenarios) {
        if (scenario != ".DS_Store"){
            let parametersTableId = scenariomgr.config['$parameters'].tableId; 
            let vals = {
              name:scenario,
            };

            if ('date' in scenariomgr.scenarios[scenario].tables[parametersTableId].rows)
              vals.date = scenariomgr.scenarios[scenario].tables[parametersTableId].rows['date'].value;
            else 
              vals.date = printDate(new Date());

            if (parametersTableId in scenariomgr.scenarios[scenario].tables) {
                let parameters = scenariomgr.scenarios[scenario].tables[parametersTableId];
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

            dates.push(vals['date']);

            data.push(vals);

            vals = JSON.parse(JSON.stringify(vals));

        }
    }

    let vw = div.parentNode.clientWidth-200;
    let vh = div.parentNode.clientHeight-80;
    let vegacfg = {
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

    vegacfg['$schema'] = 'https://vega.github.io/schema/vega-lite/v2.0.json';
    vegacfg.data = { values: data };

    vegaEmbed('#'+divId, vegacfg);
  }

  vegacb()
}