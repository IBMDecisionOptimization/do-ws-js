function showKPIsAsGoogleTable(scenariomgr, divId) {
    
    google.charts.load('current', {'packages':['corechart', 'bar']});
    google.charts.setOnLoadCallback(drawChart);

    function drawChart() {

        var header = ['KPIs'];
        var kpis = {}

        let scenarioIds = scenariomgr.scenarios;
        if (scenariomgr.getReferenceScenario() != null) {
            scenarioIds = {}
            scenarioIds[scenariomgr.getSelectedScenario().name]= 0;
            scenarioIds[scenariomgr.getReferenceScenario().name] = 1;
        }

        for (let scenarioId in scenarioIds) {
            let scenario = scenariomgr.scenarios[scenarioId];
            let kpiTableName = 'kpis'
            if (kpiTableName in scenario.tables) {
                let rows = scenario.getTableRows(kpiTableName);
                if (Object.keys(rows).length != 0){
                  header.push(scenarioId);
                  for (let r  in rows) {
                      let row = rows[r];
                      
                      let name = undefined;
                      if ( ('kpis' in scenariomgr.config) && 'id' in scenariomgr.config.kpis)
                        name = row[scenariomgr.config.kpis.id];
                      if (name == undefined)
                          name = row['\"NAME\"'];
                      if (name == undefined)
                          name = row['NAME'];
                      if (name == undefined)
                          name = row['Name'];
                      if (name == undefined)
                          name = row['name'];
                      if (name == undefined)
                          name = row['kpi'];

                      if (name != undefined) {
                          name = name.replace(/['"]+/g, '');

                          let val = row['\"VALUE\"'];
                          if (val == undefined)
                              val = row['VALUE'];
                          if (val == undefined)
                              val = row['Value'];
                          if (val == undefined)
                              val = row['value'];

                          val = val.replace(/['"]+/g, '');
                          val = parseFloat(val);

                          if (!(name in kpis))
                              kpis[name] = [name];
                          kpis[name].push(val);
                      }
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
    val = "" + val;
    var fdate = val.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
    if (fdate != null) 
      return val;
    
    if (isNaN(val))
        return val;
       else {
        let fval = parseFloat(val);       
        return fval.toFixed(6).replace(/\.?0*$/,'');
       }
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

    if ((order == undefined) && (clear == false)) {
        // check no new tables
        if (!('nTables' in container))
            clear = true;
        if (container.nTables != Object.keys(tables).length)
            clear = true;
    }
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
        container.nTables = Object.keys(tables).length;

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


function redrawScenarioList(div) {
    //let div = document.getElementById(mydivId);  
    div.drawTable();
  }

  function mouseoverBox1(divId) {
    let headerDiv = document.getElementById(divId+'_header');
    headerDiv.style.height ="100%";
  }
  function mouseoutBox1(divId) {
    let headerDiv = document.getElementById(divId+'_header');
    headerDiv.style.height ="22px";
  }
  function addAlert(div) {
    div.cfg.nalerts = div.cfg.nalerts +1;
    showAsScenarioList(div.scenariomgr, div.id, div.cb, div.cfg);
  }
function showAsScenarioList(scenariomgr, divId, cb, cfg = {}) {

    let div = document.getElementById(divId);
    div.scenariomgr = scenariomgr;
    div.cb = cb;
    div.drawTable = drawTable;
    div.cfg = cfg;
    if (!('kpis' in cfg))
        cfg.kpis = {}
    if (!('parameters' in cfg)) {
        cfg.parameters = {}
        cfg.parameters.date = true;
    }
    if (!('nalerts' in cfg))
        cfg.nalerts = 0;

  let headerDiv = document.getElementById(divId+'_header');
  let html = '<b>Settings</b><br>';
  html = html +'<table><tr><td style="padding: 10px;">';
  html = html + '<b>Parameters:</b><br> <select multiple id="LIST_PARAMETER" onChange="redrawScenarioList(' + divId +')">'
  for (let scenario in scenariomgr.scenarios) {
     if ('parameters' in scenariomgr.scenarios[scenario].tables) {
          let parameters = scenariomgr.scenarios[scenario].tables['parameters'];
          for (let row in parameters.rows) {              
              let selected = '';
              if (cfg.parameters[row])
                selected = 'selected';
              html = html + '<option ' + selected + ' value="'+row+'">'+row+'</option>';              
          }
      }
      break;
  }                
  html = html + '</select>';

  html = html +'</td><td style="padding: 10px;">';

  html = html + '<b>KPI:</b><br> <select multiple id="LIST_KPI" onChange="redrawScenarioList(' + divId +')">'
  for (let scenario in scenariomgr.scenarios) {
     if ('kpis' in scenariomgr.scenarios[scenario].tables) {
          let parameters = scenariomgr.scenarios[scenario].tables['kpis'];
          for (let row in parameters.rows) {              
            let selected = '';
            if (cfg.kpis[row])
                selected = 'selected';
            html = html + '<option ' + selected + ' value="'+row+'">'+row+'</option>';              
          }
      }
      break;
  }                
  html = html + '</select>';

  html = html +'</td><td style="padding: 10px;">';

  html = html + '<b>Alerts:</b><br>';
  html = html + '<input type="button" value="ADD" onClick="addAlert(' + divId +')"><br>'; 
  for (let a = 0; a<cfg.nalerts; a++) {
    html = html + ' if : <select  id="ALERT_KPI_' + a + '" onChange="redrawScenarioList(' + divId +')">'
    for (let scenario in scenariomgr.scenarios) {
        if ('kpis' in scenariomgr.scenarios[scenario].tables) {
            let parameters = scenariomgr.scenarios[scenario].tables['kpis'];
            for (let row in parameters.rows) {              
                if (!( ('alert_kpi_'+a) in cfg))
                    cfg['alert_kpi_'+a] = row; 
                let selected = '';
                if (cfg['alert_kpi_'+a] == row)
                    selected = 'selected';
                html = html + '<option '+selected+' value="'+row+'">'+row+'</option>';              
            }
        }
        break;
    }                
    html = html + '</select>';

    html = html + '<select  id="ALERT_ORDER_' + a + '" onChange="redrawScenarioList(' + divId +')">'
    if (!( ('alert_order_'+a) in cfg))
        cfg['alert_order_'+a] = 0; 
    let selected = '';
    if (cfg['alert_order_'+a] == 0)
            selected = 'selected';
    html = html + '<option '+selected+' value="lower than">lower than</option>';           
    selected = '';
    if (cfg['alert_order_'+a] == 1)
            selected = 'selected';
    html = html + '<option '+selected+' value="higher than">higher than</option>';           
    html = html + '</select>';

    if (!( ('alert_value_'+a) in cfg))
        cfg['alert_value_'+a] = "20"; 
    html = html + '<input type="TEXT" id="ALERT_VALUE_' + a + '" value="'+ cfg['alert_value_'+a] + '" onChange="redrawScenarioList(' + divId +')">' 
    html = html + '<br>';
  }
  html = html + '';

  html = html +'</td></tr></table>';

  headerDiv.innerHTML = html;
  headerDiv.style.height ="18px";
  headerDiv.onmouseover= function () {
    mouseoverBox1(divId);
    }
  headerDiv.onmouseout= function () {
    mouseoutBox1(divId);
  } 
  



    google.charts.load('current', {'packages':['table']});
    google.charts.setOnLoadCallback(drawTable);

    
    function drawTable() {
        var data = new google.visualization.DataTable();

        data.addColumn('string', 'Scenario');

        let nSelectedParameters = 0;
        let nSelectedKpis = 0;

        let sel = document.getElementById('LIST_PARAMETER');
        for ( var i = 0, len = sel.options.length; i < len; i++ ) {
            opt = sel.options[i];
            cfg.parameters[opt.value] = opt.selected;
            if ( opt.selected === true ) {
                nSelectedParameters = nSelectedParameters + 1;
            }
        }

        sel = document.getElementById('LIST_KPI');
        for ( var i = 0, len = sel.options.length; i < len; i++ ) {
            opt = sel.options[i];
            cfg.kpis[opt.value] = opt.selected;
            if ( opt.selected === true ) {
                nSelectedKpis = nSelectedKpis + 1;
            }
        }

        for (let a = 0; a<cfg.nalerts; a++) {
            cfg['alert_kpi_'+a] = document.getElementById("ALERT_KPI_"+a).value;
            cfg['alert_value_'+a] = document.getElementById("ALERT_VALUE_"+a).value;
            cfg['alert_order_'+a] = document.getElementById("ALERT_ORDER_"+a).selectedIndex;
          }
        
        // Add paramas and KPIs from first scenario
        for (let scenario in scenariomgr.scenarios) {                
            if ('parameters' in scenariomgr.scenarios[scenario].tables) {
                let parameters = scenariomgr.scenarios[scenario].tables['parameters'];
                for (let row in parameters.rows) {
                    if (cfg.parameters[row]) {
                        data.addColumn('string', row);
                    }
                }
            }                
            if ('kpis' in scenariomgr.scenarios[scenario].tables) {
                let kpis = scenariomgr.scenarios[scenario].tables['kpis'];
                for (let row in kpis.rows) {
                    if (cfg.kpis[row]) {
                        data.addColumn('string', row);
                    }
                }
            }
            break;
        }

        let j = 0;
        for (let scenario in scenariomgr.scenarios) {
            if (scenario != ".DS_Store"){

                let myalerts = [];
                let i = 0;

                let vals = [scenario];
                if ('parameters' in scenariomgr.scenarios[scenario].tables) {
                    let parameters = scenariomgr.scenarios[scenario].tables['parameters'];
                    for (let row in parameters.rows) {
                        if (cfg.parameters[row]) {
                            vals.push(""+parameters.rows[row].value);
                        }
                    }
                }
                if ('kpis' in scenariomgr.scenarios[scenario].tables) { 
                    let kpis = scenariomgr.scenarios[scenario].tables['kpis'];                    
                    for (let row in kpis.rows) {
                        if (cfg.kpis[row]) {
                            let value = kpis.rows[row].value; 
                            if (value == undefined)
                                value = kpis.rows[row].VALUE;
                            vals.push(""+value);
                            
                            for (let a=0; a<cfg.nalerts; a++) {
                                if (row == cfg['alert_kpi_'+a]) {
                                    let alert_value = parseInt(cfg['alert_value_'+a], 10);

                                    if ( (cfg['alert_order_'+a] == 0) &&
                                        (value <  alert_value) ) {
                                            myalerts.push( i )
                                        }
                                    if ( (cfg['alert_order_'+a] == 1) &&
                                        (value >  alert_value) ) {
                                            myalerts.push( i )
                                        }
                                }
                            }
                            i = i + 1;
                        }
                    }
                }
                data.addRows([vals]);

                for (let i =0; i<nSelectedParameters; i++)
                    data.setProperties(j, 1+i, {style: 'background-color: #e6ffe6;'});
                for (let i =0; i<nSelectedKpis; i++)
                    data.setProperties(j, 1+nSelectedParameters+i, {style: 'background-color: #fff2e6;'});
                for (let a in myalerts) {
                    data.setProperties(j, 1+nSelectedParameters+myalerts[a], {style: 'background-color: red;'});
                }
                j = j + 1;

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

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
  
    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
      var lastValue = i;
      for (var j = 0; j <= s2.length; j++) {
        if (i == 0)
          costs[j] = j;
        else {
          if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

function typeText(div) {
    let ct_input = document.getElementById('CONSTRAINT').value;

    let tkpis = div.scenario.tables['kpis'];
    let kpis = []
    for (let kpi in tkpis.rows)
        kpis.push(kpi)

    let bestKpi = undefined;
    let bestDistance = 10000;

    let tokens = ct_input.split(" ");
    for (let t in tokens) {
        for (let k in kpis) {
            let distance = editDistance(tokens[t], kpis[k])
            if (distance < bestDistance) {
                bestKpi = kpis[k];
                bestDistance = distance;
            }
        }
    }
    document.getElementById('CONSTRAINT_KPI').value = bestKpi;

    let bestSense = undefined;
    bestDistance = 10000;
    for (let t in tokens) {
        let distance = editDistance(tokens[t], 'lower')
        if (distance < bestDistance) {
            bestSense = -1;
            bestDistance = distance;
        }
        distance = editDistance(tokens[t], 'higher')
        if (distance < bestDistance) {
            bestSense = 1;
            bestDistance = distance;
        }
        distance = editDistance(tokens[t], 'equal')
        if (distance < bestDistance) {
            bestSense = 0;
            bestDistance = distance;
        }
    }
    document.getElementById('CONSTRAINT_SENSE').value = bestSense;

    let bestValue = undefined;
    bestDistance = 10000;
    for (let t in tokens) {
        let value = parseInt(tokens[t]);
        let distance = editDistance(tokens[t], value.toString())
        if (distance < bestDistance) {
            bestValue = value;
            bestDistance = distance;
        }
    }
    document.getElementById('CONSTRAINT_VALUE').value = bestValue;

    let ct = bestKpi;
    if (bestSense < 0)
      ct = ct + ' is lower than ';
    else if (bestSense == 0)
        ct = ct + ' is equal to ';
    else
      ct = ct + ' is higher than ';
    ct = ct + bestValue;

    document.getElementById('CONSTRAINT_TEXT').value = ct;
}

function addConstraint(div) {
    let constraints = div.scenario.tables['constraints']
    let len = Object.keys(constraints.rows).length;
    constraints.rows[len] = {
      id:len, 
      description:document.getElementById('CONSTRAINT_TEXT').value,
      kpi:document.getElementById('CONSTRAINT_KPI').value,
      sense:document.getElementById('CONSTRAINT_TEXT').value,
      value:document.getElementById('CONSTRAINT_VALUE').value,
      };
    (div.drawTable)();
}

function showAsConstraints(scenario, divId) {
    let div = document.getElementById(divId);

    div.scenario = scenario;
    div.drawTable = drawTable;

    let headerDiv = document.getElementById(divId+'_header');
    let html =  '<b>Settings</b><br>';
    html = html +'<table><tr><td style="padding: 10px;">';
    html = html + 'Constraint : <input type="input" id="CONSTRAINT" size="40" oninput="typeText(' + divId +')">';
    html = html +'</td><td style="padding: 10px;">';
    html = html + '<input type="text" id="CONSTRAINT_TEXT" size="40">';
    html = html +'</td><td style="padding: 10px;">';
    html = html + '<input type="button" value="ADD CONSTRAINT" onClick="addConstraint(' + divId +')"><br>'; 
    html = html +'</td></tr></table>';
    html = html + '<input type="hidden" id="CONSTRAINT_KPI"><BR>';
    html = html + '<input type="hidden" id="CONSTRAINT_SENSE"><BR>';
    html = html + '<input type="hidden" id="CONSTRAINT_VALUE"><BR>';
    html = html + '';


    headerDiv.innerHTML = html;
    headerDiv.style.height ="22px";

    headerDiv.onmouseover= function () {
        mouseoverBox1(divId);
        }
    headerDiv.onmouseout= function () {
        mouseoutBox1(divId);
    } 
  
    google.charts.load('current', {'packages':['table']});
    google.charts.setOnLoadCallback(drawTable);
    function drawTable() {

        var data = new google.visualization.DataTable();
        data.addColumn('string', 'Constraint');


        for (let a = 0; a<div.nalerts; a++) {
            div['alert_kpi_'+a] = document.getElementById("ALERT_KPI_"+a).value;
            div['alert_value_'+a] = document.getElementById("ALERT_VALUE_"+a).value;
            div['alert_order_'+a] = document.getElementById("ALERT_ORDER_"+a).selectedIndex;
        }
        
        let constraints = scenario.tables['constraints']

        for (let c in constraints.rows) {
            let constraint = constraints.rows[c];
            
            data.addRows([[constraint['description']]]);

        }
        if (Object.keys(constraints.rows).length == 0)
            data.addRows([["  "]]);
            
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

function doSensitivityRunRecur(div, name, i) {
    let scenario = div.scenario;
    let nParams = div.cfg.SENSITIVITY_RUN_N_PARAMS;
    
    let param = document.getElementById('SENSITIVITY_RUN_' + i + '_PARAM').value;       
    let tableName = '';
    let row = undefined;
    let col = undefined;
    let originalValue = undefined;
    if (param == '__table__') {
        tableName = document.getElementById('SENSITIVITY_RUN_' + i + '_TABLE').value;      
        row = document.getElementById('SENSITIVITY_RUN_' + i + '_ROW').value;      
        col = document.getElementById('SENSITIVITY_RUN_' + i + '_COL').value;      
        originalValue = parseInt(scenario.tables[tableName].rows[row][col]);
    } else {
        let tableNames = ['parameters', 'Weights'];
        for (t in tableNames) {
            tableName = tableNames[t];
            if ( (tableName in scenario.tables)  &&
            (param in scenario.tables[tableName].rows) )
            break;
        }
        originalValue = parseInt(scenario.tables[tableName].rows[param].value);
    }
    let min = parseInt(document.getElementById('SENSITIVITY_RUN_' + i + '_MIN').value); 
    let max = parseInt(document.getElementById('SENSITIVITY_RUN_' + i + '_MAX').value); 
    let step = parseInt(document.getElementById('SENSITIVITY_RUN_' + i + '_STEP').value); 

    let v = min;
    let nRuns = (max-min)/step;
    while (v <= max) {

        let newName = '';
        if (param == '__table__') {
            scenario.tables[tableName].rows[row][col] = v;
            newName = name + '+' + tableName + '.' + row + '.' + col + '=' + v;
            if ('parameters' in scenario.tables)
                scenario.addRowToTable('parameters', tableName + '.' + row + '.' + col, {name:tableName + '.' + row + '.' + col, value:v})
            
        } else {
            scenario.tables[tableName].rows[param].value = v;   
            newName = name + '+' + param + '=' + v;
        }               

        if (i==nParams-1) {
            let other = scenario.duplicate();
            other.name = newName;
            scenario.mgr.addScenario(other);
            div.scenarios.push(other);
            other.solve(function () { div.showcb(); }, 
                    function () { scenariogrid.redraw(other); },
                    nRuns*1000);
        } else {
            doSensitivityRunRecur(div, newName, i+1)
        }

        v = v + step;
    }

    //reset original value
    if (param == '__table__') {
        scenario.tables[tableName].rows[row][col] = originalValue;
        if ('parameters' in scenario.tables)
            scenario.addRowToTable('parameters', tableName + '.' + row + '.' + col, {name:tableName + '.' + row + '.' + col, value:originalValue})
    } else {
        scenario.tables[tableName].rows[param].value = originalValue;   
    }

}

function doSensitivityRun(div) {
    let scenario = div.scenario;
   
    let name = scenario.name;
    div.scenarios = []
    doSensitivityRunRecur(div, name, 0);        
}

function redrawSensitivityRun(div) {
    div.cfg['SENSITIVITY_RUN_N_PARAMS'] = document.getElementById('SENSITIVITY_RUN_N_PARAMS').value;
    let nParams = div.cfg['SENSITIVITY_RUN_N_PARAMS'];
    for (let i=0; i<nParams; i++) {
        let changed = false;
        if (document.getElementById('SENSITIVITY_RUN_' + i + '_PARAM') != null) {
            changed |= (div.cfg['SENSITIVITY_RUN_' + i + '_PARAM'] != document.getElementById('SENSITIVITY_RUN_' + i + '_PARAM').value)
            div.cfg['SENSITIVITY_RUN_' + i + '_PARAM'] = document.getElementById('SENSITIVITY_RUN_' + i + '_PARAM').value;
            if (document.getElementById('SENSITIVITY_RUN_' + i + '_MIN') != null) {
                div.cfg['SENSITIVITY_RUN_' + i + '_MIN'] = document.getElementById('SENSITIVITY_RUN_' + i + '_MIN').value;
                div.cfg['SENSITIVITY_RUN_' + i + '_MAX'] = document.getElementById('SENSITIVITY_RUN_' + i + '_MAX').value;
                div.cfg['SENSITIVITY_RUN_' + i + '_STEP'] = document.getElementById('SENSITIVITY_RUN_' + i + '_STEP').value;
            }
        }
        if (document.getElementById('SENSITIVITY_RUN_' + i + '_TABLE') != null) {
            changed |= (div.cfg['SENSITIVITY_RUN_' + i + '_TABLE'] != document.getElementById('SENSITIVITY_RUN_' + i + '_TABLE').value)
            div.cfg['SENSITIVITY_RUN_' + i + '_TABLE'] = document.getElementById('SENSITIVITY_RUN_' + i + '_TABLE').value;
        }
        if (document.getElementById('SENSITIVITY_RUN_' + i + '_ROW') != null) {
            changed |= (div.cfg['SENSITIVITY_RUN_' + i + '_ROW'] != document.getElementById('SENSITIVITY_RUN_' + i + '_ROW').value)
            div.cfg['SENSITIVITY_RUN_' + i + '_ROW'] = document.getElementById('SENSITIVITY_RUN_' + i + '_ROW').value;
        }
        if (document.getElementById('SENSITIVITY_RUN_' + i + '_COL') != null) {
            changed |= (div.cfg['SENSITIVITY_RUN_' + i + '_COL'] != document.getElementById('SENSITIVITY_RUN_' + i + '_COL').value)
            div.cfg['SENSITIVITY_RUN_' + i + '_COL'] = document.getElementById('SENSITIVITY_RUN_' + i + '_COL').value;
        }
        if (changed) {
            delete div.cfg['SENSITIVITY_RUN_' + i + '_MIN']
            delete div.cfg['SENSITIVITY_RUN_' + i + '_MAX']
            delete div.cfg['SENSITIVITY_RUN_' + i + '_STEP']
        }
    }
    div.showcb();
}

  
function showAsSensitivityRun(scenario, divId, cb, cfg ={}) {
  
    let div = document.getElementById(divId);
    
    div.scenario = scenario;
    div.cb = cb;
    div.showcb = showcb;
    div.cfg = cfg
    if (!('SENSITIVITY_RUN_N_PARAMS' in cfg))
        cfg.SENSITIVITY_RUN_N_PARAMS = 1;            
    
  
    function showcb() {

        let div = document.getElementById(divId);
        let params = [];
        let tableNames = ['parameters', 'Weights'];
        for (t in tableNames) {
            let tableName = tableNames[t];
            if (tableName in scenario.tables) {
                for (let row in scenario.tables[tableName].rows) {              
                    params.push(row);
                }
            }
        }
        params.push('__table__');


        let headerDiv = document.getElementById(divId+'_header');
        let html = '';
        let nParams = div.cfg.SENSITIVITY_RUN_N_PARAMS;
        html = html + '  Number of parameters: ';
        html = html + '<input type="text" id="SENSITIVITY_RUN_N_PARAMS" onChange="redrawSensitivityRun(' + divId +')"  value="' + nParams + '"><br>';

        let solveOk = true;
         
        for (let i=0; i<nParams; i++) {
            html = html + '<select id="SENSITIVITY_RUN_' + i + '_PARAM" onChange="redrawSensitivityRun(' + divId +')">'
            for (let p in params) {              
                let param = params[p];
                html = html + '<option value="'+param+'"';
                if (('SENSITIVITY_RUN_' + i + '_PARAM' in div.cfg) && (div.cfg['SENSITIVITY_RUN_' + i + '_PARAM'] == param))
                    html = html + ' selected ';
                html = html + '>'+param+'</option>';              
            }                   
            html = html + '</select>';     

            headerDiv.innerHTML = html;

            let param = document.getElementById('SENSITIVITY_RUN_' + i + '_PARAM').value;

            let tableName = '';
            let value = undefined;
            if (param == '__table__') {
                html += '<select id="SENSITIVITY_RUN_' + i + '_TABLE" onChange="redrawSensitivityRun(' + divId +')">'
                for (let t in scenario.tables) {
                    if (scenario.tables[t].category != 'input')
                        continue;
                    if (tableName =='')
                        tableName = t;
                    html += '<option value="'+t+'"';
                    if (('SENSITIVITY_RUN_' + i + '_TABLE' in div.cfg) && (div.cfg['SENSITIVITY_RUN_' + i + '_TABLE'] == t)) {
                        html += ' selected ';
                        tableName = t;
                    }
                    html += '>'+t+'</option>';          
                }
                html += '</select>';  
                
                html += '<select id="SENSITIVITY_RUN_' + i + '_ROW" onChange="redrawSensitivityRun(' + divId +')">'
                let row = '';
                for (let r in scenario.tables[tableName].rows) {
                    if (row =='')
                        row = r;
                    html += '<option value="'+r+'"';
                    if (('SENSITIVITY_RUN_' + i + '_ROW' in div.cfg) && (div.cfg['SENSITIVITY_RUN_' + i + '_ROW'] == r)) {
                        html += ' selected ';
                        row = r;
                    }
                    html += '>'+r+'</option>';          
                }
                html += '</select>';  
                
                html += '<select id="SENSITIVITY_RUN_' + i + '_COL" onChange="redrawSensitivityRun(' + divId +')">'
                let col = '';
                for (let ci in scenario.tables[tableName].cols) {
                    let c = scenario.tables[tableName].cols[ci];
                    if (col =='')
                        col = c;
                    html += '<option value="'+c+'"';
                    if (('SENSITIVITY_RUN_' + i + '_COL' in div.cfg) && (div.cfg['SENSITIVITY_RUN_' + i + '_COL'] == c)) {
                        html += ' selected ';
                        col = c;
                    }
                    html += '>'+c+'</option>';          
                }
                html += '</select>';  

                value = parseInt(scenario.getTableRows(tableName)[row][col]);
            } else { 
                
                for (t in tableNames) {
                    tableName = tableNames[t];
                    if ( (tableName in scenario.tables)  &&
                    (param in scenario.tables[tableName].rows) )
                    break;
                }
                value = parseInt(scenario.tables[tableName].rows[param].value);
            }

            if (!isNaN(value)) {
                let min = (value-2)
                if ( ('SENSITIVITY_RUN_' + i + '_MIN') in div.cfg)
                    min = div.cfg['SENSITIVITY_RUN_' + i + '_MIN'];
                let max = (value+2);
                if ( ('SENSITIVITY_RUN_' + i + '_MAX') in div.cfg)
                    max = div.cfg['SENSITIVITY_RUN_' + i + '_MAX'];
                let step = 1;
                if ( ('SENSITIVITY_RUN_' + i + '_STEP') in div.cfg)
                    step = div.cfg['SENSITIVITY_RUN_' + i + '_STEP'];
                html = html + ' from ';
                html = html + '<input type="text" id="SENSITIVITY_RUN_' + i + '_MIN" onChange="redrawSensitivityRun(' + divId +')" value="' + min + '">';
                html = html + ' to ';
                html = html + '<input type="text" id="SENSITIVITY_RUN_' + i + '_MAX" onChange="redrawSensitivityRun(' + divId +')" value="' + max + '">';
                html = html + ' by steps of ';
                html = html + '<input type="text" id="SENSITIVITY_RUN_' + i + '_STEP" onChange="redrawSensitivityRun(' + divId +')" value="' + step + '">';        
            } else {
                html = html +  ' is not numerical'
                solveOk = false;
            } 
            
            html = html + '<br>';
        }

        if (solveOk)
          html = html + '<input type="button" value="SENSITIVITY_SOLVE" id="SENSITIVITY_SOLVE" onclick="doSensitivityRun(' + divId +')"/>';

        headerDiv.innerHTML = html;

        
        
        html = '';
        for (s in div.scenarios) {
            let scenario = div.scenarios[s];
            html = html + scenario.name;
            if (scenario.jobId != undefined)
              html = html + ' (' + scenario.jobId + ') :' + scenario.executionStatus;
            html = html + '<br>';
        }

        div.innerHTML = html;
      

    }

    showcb();
}
  