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
        let idIndex = 0;
        for (let c in cols) {
            data.addColumn('string', cols[c]);
            if ( ('id' in tableConfig) && (cols[c] == tableConfig.id) )
                tableConfig.idIndex = idIndex;
            idIndex++;
        }
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


        container.tableConfig = tableConfig;
        tableConfig.allowHtml = true;

        if (tableConfig.allowEdition)
            google.visualization.events.addListener(table, 'select', function () {
                myClickToEdit(scenario, tableId, container, divId, config, data, table.getSelection());
            });

        if ( (reference != undefined) && ('idIndex' in tableConfig) ) {
            let refrows = reference.getTableRows(tableId);
            function drawDiff() {
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
                                
                                let tr = undefined;
                                let rowIndex = 0;
                                while (rowIndex < MAX_SIZE) {
                                     tr = container.getElementsByTagName('TR')[rowIndex+1];
                                     if (tr == undefined)
                                        continue; // not all rows are shown (MAX_SIZE)
                                     td = tr.getElementsByTagName('TD')[container.tableConfig.idIndex];
                                     if (td.innerHTML == o)
                                        break;
                                     rowIndex++                                     
                                }
                                //table.getSortInfo().sortedIndexes.indexOf(i);
                                tr = container.getElementsByTagName('TR')[rowIndex+1];
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
            }
            google.visualization.events.addListener(table, 'ready', drawDiff );
            google.visualization.events.addListener(table, 'sort', drawDiff );
        }

        table.draw(data, tableConfig);
    }
}



function openTab(divId, btnId, category, subDivId) {
    // Declare all variables
    var i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        if (tabcontent[i].classList.contains(category) &&
            tabcontent[i].id.includes(divId))
            tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        if (tablinks[i].classList.contains(category) &&
            tabcontent[i].id.includes(divId))
            tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(subDivId).style.display = "block";
    document.getElementById(btnId).className += " active";
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
                let btnId = divId+'_btn_'+category+'_'+tableId;
                let subDivId = divId+'_div_'+category+'_'+tableId;
                html = html + ' <button id="'+btnId+'" class="tablinks '+category +'" onclick="openTab(\''+divId+'\', \''+btnId+'\', \''+category +'\', \''+subDivId+'\')">' + title + '</button>\n';
                if (initCall == undefined) {
                    initCall = {}
                    initCall.category = category;
                    initCall.btnId = btnId;
                    initCall.subDivId = subDivId;
                }
            }
        }
        html = html + '</div>\n';

        for (let tableId in tables) {
            if (order != undefined)
                tableId = tables[tableId];
            if (scenario.tables[tableId].category == category) {
                let subDivId = divId+'_div_'+category+'_'+tableId;
                html = html + '<div id="'+subDivId+'" class="tabcontent '+category +'" style="width: 100%; height: 90%"></div>\n';
            }
        }

        container.innerHTML = html;
        container.headerDone = true;

        if (initCall != undefined) {
            openTab(divId, initCall.btnId, initCall.category, initCall.subDivId);
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
            if ( (scenariocfg != undefined) &&
                (tableId in scenariocfg) &&
                "id" in scenariocfg[tableId] )
                config.id = scenariocfg[tableId].id;
            let subDivId = divId+'_div_'+category+'_'+tableId;
            showAsGoogleTable(scenario, tableId, subDivId,  config)
        }
    }
}


function showAsScenarioList(scenariomgr, divId, cb) {
    google.charts.load('current', {'packages':['table']});
    google.charts.setOnLoadCallback(drawTable);

    let div = document.getElementById(divId);
    div.scenariomgr = scenariomgr;
    div.cb = cb;
    function drawTable() {
        var data = new google.visualization.DataTable();

        data.addColumn('string', 'Scenario');
        data.addColumn('string', 'Date');

        // Add paramas and KPIs from first scenario
        for (let scenario in scenariomgr.scenarios) {                
            if ('parameters' in scenariomgr.scenarios[scenario].tables) {
                let parameters = scenariomgr.scenarios[scenario].tables['parameters'];
                for (let row in parameters.rows)
                    data.addColumn('string', row);
            }                
            if ('kpis' in scenariomgr.scenarios[scenario].tables) {
                let kpis = scenariomgr.scenarios[scenario].tables['kpis'];
                for (let row in kpis.rows)
                    data.addColumn('string', row);
            }
            break;
        }

        function printDate(d) {
            return ("0"+(d.getDate()+1)).slice(-2)+'/'+("0"+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear() +
            ' ' + ("0"+(d.getHours()+1)).slice(-2)+':'+("0"+(d.getMinutes()+1)).slice(-2);
          }

        let date = new Date();
        for (let scenario in scenariomgr.scenarios) {
            if (scenario != ".DS_Store"){
                let vals = [scenario, printDate(date)];
                if ('parameters' in scenariomgr.scenarios[scenario].tables) {
                    let parameters = scenariomgr.scenarios[scenario].tables['parameters'];
                    for (let row in parameters.rows)
                        vals.push(parameters.rows[row].value);
                }
                if ('kpis' in scenariomgr.scenarios[scenario].tables) { 
                    let kpis = scenariomgr.scenarios[scenario].tables['kpis'];                    
                    for (let row in kpis.rows) {
                        let value = kpis.rows[row].value; 
                        if (value == undefined)
                            value = kpis.rows[row].VALUE;
                        vals.push(value);
                    }
                }
                data.addRows([vals]);

                date.setTime(date.getTime() - 1000*60*60*24 + Math.floor(Math.random() * 1000*60*20))
            }
        }
        let container = document.getElementById(divId);            
        let table = new google.visualization.Table(container);        

        let tableConfig = {
            allowHtml: true,
            //title: tableId, 
            sortAscending: true, 
            sortColumn: 0, 
            showRowNumber: false, 
            width: '100%', 
            height: '100%'
        }
        table.draw(data, tableConfig);
    }
}