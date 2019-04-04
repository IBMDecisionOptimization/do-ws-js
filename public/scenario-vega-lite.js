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



function showAsScenarioChart(scenariomgr, divId, cb) {
 
  let div = document.getElementById(divId);
  div.scenariomgr = scenariomgr;
  div.cb = cb;

  data = []

  function printDate(d) {
    return ("0"+(d.getDate()+1)).slice(-2)+'/'+("0"+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();
  }

  let dates = []
  let date = new Date();

  for (let scenario in scenariomgr.scenarios) {
      if (scenario != ".DS_Store"){
          let vals = {
            name:scenario,
            date: printDate(date)
            //date: date
          };
          dates.push(printDate(date));

//           if ('parameters' in scenariomgr.scenarios[scenario].tables) {
//               let parameters = scenariomgr.scenarios[scenario].tables['parameters'];
//               for (let row in parameters.rows) {
//                   //vals[row] = parameters.rows[row].value;
//                   vals['parameter'] = row;
//                   vals['value'] = parameters.rows[row].value;
//                   if (vals['value'] == undefined)
//                     vals['value'] = parameters.rows[row].VALUE;
//                   data.push(vals);
//                   vals = JSON.parse(JSON.stringify(vals));
//               }
//           }
          if ('kpis' in scenariomgr.scenarios[scenario].tables) { 
              let kpis = scenariomgr.scenarios[scenario].tables['kpis'];
              for (let row in kpis.rows) {
                  //vals[row] = kpis.rows[row].value;
                  vals['kpi'] = row;
                  vals['value'] = kpis.rows[row].value;
                  if (vals['value'] == undefined)
                    vals['value'] = kpis.rows[row].VALUE;
                  data.push(vals);
                  vals = JSON.parse(JSON.stringify(vals));
              }
          }
          //data.push(vals);

          date.setTime(date.getTime() - 1000*60*60*24)
      }
  }
  


  let vegadiv = document.getElementById('vega_div');
  let vw = div.parentNode.clientWidth-200;
  let vh = div.parentNode.clientHeight-50;
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
                          "field": "value",
                          "type": "quantitative",
                          "aggregate": "sum"
                  },
                  "color": {
                          "field": "value",
                          "type": "nominal"
                  }
          }
  }
  
  config['$schema'] = 'https://vega.github.io/schema/vega-lite/v2.0.json';
  config.data = { values: data };

  vegaEmbed('#'+divId, config);
}