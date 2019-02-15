function showKPIsAsGoogleTable(scenariomgr, divId) {
    
    google.charts.load('current', {'packages':['corechart', 'bar']});
    google.charts.setOnLoadCallback(drawChart);

    function drawChart() {

        var header = ['KPIs'];
        var kpis = {}
        for (let scenarioId in scenariomgr.scenarios) {
            let scenario = scenariomgr.scenarios[scenarioId];
            if ('kpis' in scenario.tables) {
                let rows = scenario.getTableRows("kpis");
                if (Object.keys(rows).length != 0){
                  header.push(scenarioId);
                  for (let r  in rows) {
                      let row = rows[r];
                      let val = row['\"VALUE\"'];
                      if (val == undefined)
                          val = row['VALUE'];
                      if (val == undefined)
                          val = row['Value'];
                      if (val == undefined)
                          val = row['value'];

                      val = val.replace(/['"]+/g, '');
                      val = parseFloat(val);
                      let name = row['\"NAME\"'];
                      if (name == undefined)
                          name = row['NAME'];
                      if (name == undefined)
                          name = row['Name'];
                      if (name == undefined)
                          name = row['kpi'];
                      name = name.replace(/['"]+/g, '');

                      if (!(name in kpis))
                          kpis[name] = [name];
                      kpis[name].push(val);
                  }
              }
            }
        }
        var darray = [header];
        for (let k in kpis)
            darray.push(kpis[k])

      if (darray.length != 1){
            var data = google.visualization.arrayToDataTable(darray);

            var options = {
                title: 'KPIs comparison',
                hAxis: {
                    title: 'Scenarios'
                  }
            };

            var chart = new google.visualization.ColumnChart(document.getElementById(divId));

            chart.draw(data, options);
        }
    }
}

function myChangeValue(input) {
    input.data.row[input.data.id] = input.value;      
}
function myRefresh(btn) {
    showAsGoogleTable(btn.data.scenario, btn.data.tableId, btn.data.divId, btn.data.config)
}
function myClickToEdit(scenario, tableId, container, divId, config, data, selected) {
    let idx = selected[0].row;

    let row = scenario.tables[tableId].rows[data.getValue(idx, 0)]; // TODO id not always at column 0
    container.innerHTML = "";

    let table = document.createElement("table");
    for (id in row) {
        let tr = document.createElement("tr");
        let td =  document.createElement("td");
        var txt = document.createTextNode(id + ': ');
        td.appendChild(txt);
        tr.appendChild(td);
        td =  document.createElement("td");
        var input = document.createElement("input");
        input.type = "text";
        input.size = 30;
        input.name = id;
        input.value = row[id];

        input.data = {}
        input.data.id = id;
        input.data.row = row

        input.setAttribute("onkeyup", 'myChangeValue(this)');
        td.appendChild(input);
        tr.appendChild(td);
        table.appendChild(tr);
    }
    container.appendChild(table);
    var btn = document.createElement('button');
    btn.text = "CLOSE";
    btn.value = "CLOSE";
    btn.innerHTML = "CLOSE";
    btn.data = {}
    btn.data.scenario = scenario;
    btn.data.tableId = tableId;
    btn.data.divId = divId;
    btn.data.config = config;
    btn.addEventListener('click', function () {myRefresh(this)});
    container.appendChild(btn);
}

function humanize(val) {
    let fval = parseFloat(val);
    if (isNaN(fval))
        return val;
       else
        return fval.toFixed(6).replace(/\.?0*$/,'');
}
function showAsGoogleTable(scenario, tableId, divId, config) {
    let tableConfig = config;
    google.charts.load('current', {'packages':['table']});
    google.charts.setOnLoadCallback(drawTable);

    let reference = scenario.mgr.getReferenceScenario();

    function drawTable() {
        var data = new google.visualization.DataTable();
        let cols = scenario.getTableCols(tableId)
        if ('columns' in config)
            cols = config.columns
        for (let c in cols)
                data.addColumn('string', cols[c]);
        let rows = scenario.getTableRows(tableId);
        let MAX_SIZE = 100;
        if ("maxSize" in tableConfig)
            MAX_SIZE = tableConfig.maxSize;
        for (let o in rows) {
                let row  = rows[o];
                let vals = [];
                for (let c in cols) 
                    vals.push(humanize(row[cols[c]]));              
                data.addRows([vals]);
                if (data.getNumberOfRows() == MAX_SIZE)
                    break;
        }
        let container = document.getElementById(divId);            
        let table = new google.visualization.Table(container);

        tableConfig.allowHtml = true;

        if (tableConfig.allowEdition)
            google.visualization.events.addListener(table, 'select', function () {
                myClickToEdit(scenario, tableId, container, divId, config, data, table.getSelection());
            });

        if (reference != undefined) {
            let refrows = reference.getTableRows(tableId);
            google.visualization.events.addListener(table, 'ready', function () {
                let i = 0;
                for (let o in rows) {
                    if (i > MAX_SIZE + 1)
                        break;
                    let row  = rows[o];
                    if (!(o in refrows))
                        container.getElementsByTagName('TR')[i+1].style.backgroundColor = 'yellow';
                    else {
                        let j = 0;
                        for (let c in cols) {
                            if (j > MAX_SIZE + 1)
                                break;
                            let col = cols[c];
                            if (row[col] != refrows[o][col]) {
                                let tr = container.getElementsByTagName('TR')[i+1];
                                if (tr == undefined)
                                    break; // not all rows are shown (MAX_SIZE)
                                tr.getElementsByTagName('TD')[j].style.backgroundColor = 'yellow';
                                tr.getElementsByTagName('TD')[j].innerHTML = humanize(row[col]) + " (" + humanize(refrows[o][col]) + ")";
                            }
                            j++;
                        }
                    }
                    i++;
                }
            });
        }

        table.draw(data, tableConfig);
    }
}
function showAsGoogleTables(scenario, divId, category, order = undefined, scenariocfg = undefined, clear = false) {
    let container = document.getElementById(divId);
    let tables = order;
    if (tables == undefined)
        tables = scenario.tables;

    let initCall = undefined;
    if ((container.headerDone == undefined) || (clear == true)) {
        let html = "";
        html = html + '<div class="tab" style="width: 100%">\n';
        for (let tableId in tables) {
            if (order != undefined)
                tableId = tables[tableId];
            if (scenario.tables[tableId].category == category) {
                let title = tableId;
                if ( (scenariocfg != undefined) &&
                    (tableId in scenariocfg) &&
                    "title" in scenariocfg[tableId] )
                    title = scenariocfg[tableId].title;
                let btnId = 'btn_'+category+'_'+tableId;
                let divId = 'div_'+category+'_'+tableId;
                html = html + ' <button id="'+btnId+'" class="tablinks '+category +'" onclick="openTab(\''+btnId+'\', \''+category +'\', \''+divId+'\')">' + title + '</button>\n';
                if (initCall == undefined) {
                    initCall = {}
                    initCall.category = category;
                    initCall.btnId = btnId;
                    initCall.divId = divId;
                }
            }
        }
        html = html + '</div>\n';

        for (let tableId in tables) {
            if (order != undefined)
                tableId = tables[tableId];
            if (scenario.tables[tableId].category == category) {
                let divId = 'div_'+category+'_'+tableId;
                html = html + '<div id="'+divId+'" class="tabcontent '+category +'" style="width: 100%; height: 90%"></div>\n';
            }
        }

        container.innerHTML = html;
        container.headerDone = true;

        if (initCall != undefined) {
            openTab(initCall.btnId, initCall.category, initCall.divId);
        }
    }


    for (let tableId in tables) {
        if (order != undefined)
                tableId = tables[tableId];
        if (scenario.tables[tableId].category == category) {
            let config = {title: tableId, sortAscending: true, sortColumn: 0, showRowNumber: false, width: '100%', height: '100%'};
            if ( (scenariocfg != undefined) &&
                (tableId in scenariocfg) &&
                "allowEdition" in scenariocfg[tableId] )
                config.allowEdition = scenariocfg[tableId].allowEdition;
            else
                config.allowEdition = false;
            if ( (scenariocfg != undefined) &&
                (tableId in scenariocfg) &&
                "maxSize" in scenariocfg[tableId] )
                config.maxSize = scenariocfg[tableId].maxSize;
            if ( (scenariocfg != undefined) &&
                (tableId in scenariocfg) &&
                "columns" in scenariocfg[tableId] )
                config.columns = scenariocfg[tableId].columns;
            let divId = 'div_'+category+'_'+tableId;
            showAsGoogleTable(scenario, tableId, divId,  config)
        }
    }
}