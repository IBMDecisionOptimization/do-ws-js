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

  if (config == undefined)
    config = {};

  config['$schema'] = 'https://vega.github.io/schema/vega-lite/v2.0.json';
  config.data = { values: data };

  vegaEmbed('#'+containerId, config);
          
}