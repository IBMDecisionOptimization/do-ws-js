
class ScenarioGrid {

    constructor(title, divId, scenarioManager, config = {enableImport:false}) {
        this.divId = divId;
        this.scenarioManager = scenarioManager;
        this.widgets = {};
        this.gridDivId = 'grid_' + divId;
        this.config = config;

        let div = document.getElementById(divId);
        div.classList.add('scenario-grid');    
        let headerDiv = document.createElement('div');
        headerDiv.className = "scenario-grid-title";
        let actionsHTML = '<p style="float:right"> \
                <img src="./do-ws-js/images/scenarios-32.png" class="scenario-grid-action" onclick="scenariogrid.addScenarioWidget(undefined,0,0,2,2,true)"/> \
                <img src="./do-ws-js/images/gears-32.png" class="scenario-grid-action" onclick="scenariogrid.addSolveWidget()"/> \
                <img src="./do-ws-js/images/inputs-32.png" class="scenario-grid-action" onclick="scenariogrid.addInputsWidget(0,0,6,4,true)"/> \
                <img src="./do-ws-js/images/outputs-32.png" class="scenario-grid-action" onclick="scenariogrid.addOutputsWidget(0,0,6,4,true)"/> \
                &nbsp;  &nbsp;  &nbsp; \
                <img src="./do-ws-js/images/eraser-32.png" class="scenario-grid-action" onclick="scenariogrid.removeAll()"/>';
        if (config.enableImport) 
            actionsHTML =  actionsHTML +
                '<img src="./do-ws-js/images/import-32.png" class="scenario-grid-action" onclick="scenariogrid.showimport()"/>';
        
                actionsHTML = actionsHTML + '</p>';    
        headerDiv.innerHTML = title + actionsHTML;
        div.appendChild(headerDiv);

        if (config.enableImport) {
            let projectName = 'PA3';
            let modelName = 'DOMODEL'
            let scenarioName = 'Scenario 1';

            let importDivHTML = '<div class="form-popup" id="IMPORT_DIV" style="display: none; font-size: 50%;">\
                    <label for="PROJECT"><b>Project</b></label> \
                    <input type="text" value="'+projectName+'" id="IMPORT_PROJECT" required> \
                    <label for="PROJECT"><b>Model</b></label> \
                    <input type="text" value="'+modelName+'" id="IMPORT_MODEL" required> \
                    <label for="PROJECT"><b>Scenario</b></label> \
                    <input type="text" value="'+scenarioName+'" id="IMPORT_SCENARIO" required> \
                    <button type="button" class="btn" onclick="scenariogrid.doimport()">Import</button> \
                    <button type="button" class="btn cancel" onclick="scenariogrid.hideimport()">Close</button>\
                </div>';
            let importDiv = document.createElement('div');
            importDiv.innerHTML = importDivHTML;
            headerDiv.appendChild(importDiv);
        }


        div.innerHTML = div.innerHTML + '<div id="' +this.gridDivId +'" class="grid-stack"></div>';       
        var options = {
            // verticalMargin: 5
            float: true
        };
        $('#'+this.gridDivId).gridstack(options).on('gsresizestop', function(event, elem) {
            console.log('Widget ' +elem.id + ' end resize' );
            scenariogrid.widgets[elem.id].timeStamp = 0;
            scenariogrid.redraw(elem.id);
        });
      }    
     
    removeAll() {
        var grid = $('#'+this.gridDivId).data('gridstack');
        grid.removeAll()
        this.widgets = {}
    }

    fullscreen(widgetId) {
        let div = document.getElementById(widgetId);
        let widget = this.widgets[widgetId];
        if (div.classList.contains('fullscreen')) {
            div.classList.remove('fullscreen');        
            div.setAttribute('data-gs-x', widget.x);
            div.setAttribute('data-gs-y', widget.y);
            div.setAttribute('data-gs-width', widget.width);
            div.setAttribute('data-gs-height', widget.height);
        } else {
            div.classList.add('fullscreen');
            widget.x = div.getAttribute('data-gs-x');
            widget.y = div.getAttribute('data-gs-y');
            widget.width = div.getAttribute('data-gs-width');
            widget.height = div.getAttribute('data-gs-height');
            div.removeAttribute('data-gs-x');
            div.removeAttribute('data-gs-y');
            div.removeAttribute('data-gs-width');
            div.removeAttribute('data-gs-height');
        }
        
        this.widgets[widgetId].timeStamp = 0;
        this.redraw(widgetId);
        div.scrollIntoView();
    }
    
    
    addWidget(widget) {
        this.widgets[widget.id] = widget;
        
        let item = document.createElement('div');
        item.className = "grid-stack-item";
        item.setAttribute('id', widget.id);
        item.setAttribute('data-gs-x', widget.x);
        item.setAttribute('data-gs-y', widget.y);
        item.setAttribute('data-gs-width', widget.width);
        item.setAttribute('data-gs-height', widget.height);
        item.setAttribute('data-gs-auto-position', 1);                

        var content = document.createElement('div');
        content.className = "grid-stack-item-content"
        let headerDiv = document.createElement('div');
        headerDiv.className = "grid-title";
        let title = (widget.title == undefined) ? "" : widget.title;
        headerDiv.innerHTML = title + 
            '<p style="float:right"> \
                <img src="./do-ws-js/images/delete.png" class="grid-action" onclick="scenariogrid.removeWidget(\'' + widget.id + '\')"/> \
                <img src="./do-ws-js/images/fullscreen.png" class="grid-action" onclick="scenariogrid.fullscreen(\'' + widget.id + '\')"/> \
                </p>';    
        content.appendChild(headerDiv);

        content.innerHTML = content.innerHTML + widget.innerHTML; 
        item.appendChild(content);

        var grid = $('#'+this.gridDivId).data('gridstack');
        grid.addWidget(item);
    }

    removeWidget(id) {
        var grid = $('#'+this.gridDivId).data('gridstack');
        let div = document.getElementById(id)
        grid.removeWidget(div);
        delete (this.widgets)[id];
    }

    addCustomWidget(id, widget, useReference = false) {

        let scenarioManager = this.scenarioManager;

        widget.id = id;

        if (widget.cb != undefined) {
            if (useReference) {
                widget.lastSelected = "";
                widget.lastReference = "";
                widget.timeStamp = 0;
                widget.originalcb = widget.cb;
                widget.cb = function () {
                    let scenario = scenarioManager.getSelectedScenario();
                    let reference = scenarioManager.getReferenceScenario();
                    let maxTimeStamp = scenario.getTimeStamp();
                    if (reference != undefined)
                        maxTimeStamp = Math.max(maxTimeStamp, reference.getTimeStamp());
                    if (scenario==this.lastScenario && reference==this.lastReference && this.timeStamp>=maxTimeStamp)
                        return;
                    (this.originalcb)();
                    this.lastScenario = scenario;
                    this.lastReference = reference;
                    this.timeStamp = maxTimeStamp;
                }
            } else {
                widget.lastSelected = "";
                widget.timeStamp = 0;
                widget.originalcb = widget.cb;
                widget.cb = function () {
                    let scenario = scenarioManager.getSelectedScenario();
                    let maxTimeStamp = scenario.getTimeStamp();
                    if (scenario==this.lastScenario && this.timeStamp>=maxTimeStamp)
                        return;
                    (this.originalcb)();
                    this.lastScenario = scenario;
                    this.timeStamp = maxTimeStamp;
                }
            }
        }


        this.addWidget(widget);
    }

    addScenarioWidget(cb, x =0, y = 0, width = 2, height = 2, forceDisplay=false) {
        let divId = 'scenario_div';
        let scenarioManager = this.scenarioManager;

        if (cb == undefined) {
            cb = function () {
                scenariogrid.redraw();
            }
        }
        let scenarioscfg = { 
            id: 'scenario',
            x: x,
            y: y,
            width: width,
            height: height,
            title: "Scenarios",
            innerHTML: '<div id="' + divId + '"></div>',
            nbScenarios: 0,
            timeStamp: 0,
            cb: function() {                
                let maxTimeStamp = scenarioManager.getScenariosMaxTimeStamp();
                if ( (this.nbScenarios == scenarioManager.getNbScenarios()) &&
                    (this.timeStamp >= maxTimeStamp) )
                    return;
                scenarioManager.showAsSelector(divId, cb);
                this.nbScenarios = scenarioManager.getNbScenarios();
                this.timeStamp = maxTimeStamp;
            }
        }

        this.addWidget(scenarioscfg);
        if (forceDisplay)
            this.redrawWidget('scenario')
    }

    addKPIsWidget(x = 2, y = 0, width = 10, height = 5) {
        let divId = 'kpis_chart_div';
        let scenarioManager = this.scenarioManager;
        let kpiscfg = { 
            id: 'kpis_chart',
            x: x,
            y: y,
            width: width,
            height: height,
            title: "KPIs",
            innerHTML: '<div id="' + divId + '" style="width: 100%; height: calc(100% - 30px);  padding: 5px;"></div>',
            nbScenarios: 0,
            timeStamp: 0,
            cb: function () {
                let maxTimeStamp = scenarioManager.getScenariosMaxTimeStamp();
                if ( (this.nbScenarios == scenarioManager.getNbScenarios()) &&
                    (this.timeStamp >= maxTimeStamp) )
                    return;
                showKPIsAsGoogleTable(scenarioManager, divId);
                this.nbScenarios = scenarioManager.getNbScenarios();
                this.timeStamp = maxTimeStamp;
            }
        }

        this.addWidget(kpiscfg);
    }

    showimport() {
        document.getElementById('IMPORT_DIV').style.display = 'block'; 
    }
    hideimport() {
        document.getElementById('IMPORT_DIV').style.display = 'none'; 
    }

    doimport() {

        let scenariogrid = this;

        let projectName = document.getElementById('IMPORT_PROJECT').value;
        let modelName = document.getElementById('IMPORT_MODEL').value;
        let scenarioName = document.getElementById('IMPORT_SCENARIO').value;

        axios({
            method:'get',
            url:'/api/dsx/domodel/tables?projectName=' + projectName + '&modelName=' + modelName + '&scenarioName=' + scenarioName,
            responseType:'json'
        })
        .then(function (response) {
            console.log("Received Tables: OK.");
            let scenario = scenariogrid.scenarioManager.newScenario(scenarioName);
            let tables = response.data;
            let ntables = tables.length;
            let itables = 0;
            for (let t in tables) {
                let tableName = tables[t].name;
                    axios({
                    method:'get',
                    url:'/api/dsx/domodel/table?projectName=' + projectName + '&modelName=' + modelName + '&scenarioName=' + scenarioName + '&tableName=' + tableName,
                    responseType:'json'
                })
                .then(function (response) {
                    console.log("Received Table: OK.");
                    let tablecsv = response.data;
                    scenario.addTableFromCSV(tableName, tablecsv, tables[t].category)
                    itables++;
                    if (itables == ntables) 
                        scenariogrid.redraw();
                })
                .catch(showHttpError); 
            }
        })
        .catch(showHttpError); 

        axios({
            method:'get',
            url:'/api/dsx/domodel/data?projectName=' + projectName + '&modelName=' + modelName + '&scenarioName=dashboard&assetName=dashboard.json',
            responseType:'json'
        })
        .then(function (response) {
            console.log("Init Optim: OK.");
            let dashboard = response.data;
            for (let p in dashboard.pages) {
                let page = dashboard.pages[p];
                for (let w in page.widgets) {
                    let widget = page.widgets[w];
                    if (widget.type == 'Chart') {
                        let props = widget.props;

                        console.log('Import chart ' + w);
                        
                        let id = 'vega' + Object.keys(scenariogrid.widgets).length;
                        let divId = id+'_div';

                        function myvegacb() {
                            let scenarios = [scenariomgr.getSelectedScenario()];
                            if (props.container == '*') 
                                scenarios = scenariomgr.scenarios;

                            let tableName = props.data;

                            let vegadiv = document.getElementById(divId);
                            let vw = vegadiv.parentNode.clientWidth-200;
                            let vh = vegadiv.parentNode.clientHeight-50;
                            let vegaconfig = {
                                    // "width" : vw,
                                    // "height" : vh,

                            }
                            vegaconfig.mark = props.spec.mark;
                            vegaconfig.encoding = props.spec.encoding;

                            vegalitechart2(divId, scenarios, tableName, vegaconfig)
                        }

                        let x= 3;
                        let y= 0;
                        let width= 6;
                        let height= 3;
                        for (let ii in page.layouts.LG) {
                            let layout = page.layouts.LG[ii];
                            if (layout.i == w) {
                                x = 2*layout.x;
                                y = 2*layout.y;
                                width = 2*layout.w;
                                height = 2*layout.h;
                                break;
                            }
                        }                            
                        let vegacfg = { 
                            id: id,
                                x: x,
                                y: y,
                                width: width,
                                height: height,
                            title: widget.props.data,
                            innerHTML: '<div style="width:100%; height: calc(100% - 30px); overflow: auto;">\
                                            <div id="'+divId+'" style=""></div>\
                                        </div>',
                            cb: myvegacb
                        }
                    
                        scenariogrid.addWidget(vegacfg);
                        scenariogrid.redrawWidget(id);
                    }

                }
            }
        })
        .catch(showHttpError);     
          
        

    }

    addSolveWidget(x = 0, y = 0, width = 2, height = 2) {
        
        let scenariogrid = this;

        let jobId = undefined

        let intervalId = ''

        function initOptim() {
            console.log("Init Optim.");
            axios({
                    method:'get',
                    url:'/api/optim/config',
                    responseType:'text'
                })
            .then(function (response) {
                console.log("Init Optim: OK.");
                enableSolve();
            })
            .catch(showHttpError);     
        }

        function disableSolve() {
            document.getElementById('SOLVE').disabled = true;
        }

        function enableSolve() {
            document.getElementById('SOLVE').disabled = false;
            document.getElementById('SOLVE').value = 'SOLVE';
        }

        function solve() {
            var data = new FormData();

            let scenario = scenariomgr.getSelectedScenario();
            let tableIds = scenario.getInputTables()
            for (let t in tableIds)  {
                    let tableId = tableIds[t];
                    data.append(tableId+".csv", scenario.getTableAsCSV(tableId));
            }


            document.getElementById('SOLVE').disabled = true;
            document.getElementById('SOLVE').value = 'STARTING';
            //document.getElementById('gantt_div').style.display="none";
            
            axios({
                    method: 'post',
                    url: './api/optim/solve',
                    data: data
            }).then(function(response) {
                    jobId = response.data.jobId                        
                    console.log("Job ID: "+ jobId);
                    intervalId = setInterval(checkStatus, 1000)
            }).catch(showHttpError);
        }

        function checkStatus() {
            let scenario = scenariomgr.getSelectedScenario();
            axios.get("/api/optim/status?jobId="+jobId)
            .then(function(response) {
                    let executionStatus = response.data.solveState.executionStatus
                    console.log("JobId: "+jobId +" Status: "+executionStatus)
                    if (executionStatus != "UNKNOWN")
                            document.getElementById('SOLVE').value = executionStatus;
                                    
                    if (executionStatus == "PROCESSED" ||
                            executionStatus == "INTERRUPTED" ) {
                            clearInterval(intervalId);
                            
                            let nout = response.data.outputAttachments.length;
                            for (var i = 0; i < nout; i++) {
                                    let oa = response.data.outputAttachments[i];
                                    if ('csv' in oa)
                                            scenario.addTableFromCSV(oa.name, oa.csv, 'output', scenariocfg[oa.name]);     
                                    else
                                            scenario.addTableFromRows(oa.name, oa.table.rows, 'output', scenariocfg[oa.name]); 
                            }

                            //document.getElementById('gantt_div').style.display="block";
                            //showInputsAndOutputs(scenario);
                            scenariogrid.redraw(scenario);

                            enableSolve();

                    }   
            })
            .catch(function (error) {
                if (error.response.status == 404)
                    console.log("Status, job not found");
                else
                    showHttpError(error);
            });    
        }


        let solvecfg = { 
            id: 'solve',
            x: x,
            y: y,
            width: width,
            height: height,
            title: "Optimization",
            innerHTML: '<input type="button" value="SOLVE" id="SOLVE"/>',
            //cb: solvecb
        }

        this.addWidget(solvecfg);

        
        disableSolve();

        document.getElementById("SOLVE").onclick = solve;

        initOptim();
    }

    addTableWidget(tableId, tableConfig, x = 0, y = 0, width = 6, height = 4) {
        let tableDivId = tableId + '_table_div';
        let scenarioManager = this.scenarioManager;

        tableConfig.sortAscending = true;
        tableConfig.sortColumn = 0;
        tableConfig.showRowNumber = false;
        tableConfig.width = '100%';
        tableConfig.height = '100%';

        let tablecfg = { 
            id: tableId,
            x: x,
            y: y,
            width: width,
            height: height,
            title: tableConfig.title,        
            innerHTML: '<div id="' + tableDivId + '" style="width: 100%; height: calc(100% - 30px);  padding: 5px;"></div>',
            lastSelected: "",
            lastReference: "",
            timeStamp: 0,
            cb: function () {
                let scenario = scenarioManager.getSelectedScenario();
                let reference = scenarioManager.getReferenceScenario();
                let maxTimeStamp = scenario.getTimeStamp();
                if (reference != undefined)
                    maxTimeStamp = Math.max(maxTimeStamp, reference.getTimeStamp());
                if (scenario==this.lastScenario && reference==this.lastReference && this.timeStamp>=maxTimeStamp)
                    return;
                showAsGoogleTable(scenario, tableId, tableDivId, tableConfig);            
                this.lastScenario = scenario;
                this.lastReference = reference;
                this.timeStamp = maxTimeStamp;
            }
        }

        this.addWidget(tablecfg);
    }

    addInputsWidget(x = 0, y = 0, width = 6, height = 4, forceDisplay=false) {
        this.addTablesWidget('Inputs', 'input');
         if (forceDisplay)
            this.redrawWidget('Inputs')
    }

    addOutputsWidget(x = 0, y = 0, width = 6, height = 4, forceDisplay=false) {
        this.addTablesWidget('Outputs', 'output');
         if (forceDisplay)
            this.redrawWidget('Outputs')
    }

    addTablesWidget(title, category, order, scenariocfg, x = 0, y = 0, width = 6, height = 4) {
        let divId = title + '_tables_div';
        let scenarioManager = this.scenarioManager;
        let cfg = { 
            id: title,
            x: x,
            y: y,
            width: width,
            height: height,
            title: title,
            innerHTML: '<div id="' + divId + '" style="width: 100%; height: calc(100% - 30px);"></div>',
            lastSelected: "",
            lastReference: "",
            timeStamp: 0,
            cb: function () {
                let scenario = scenarioManager.getSelectedScenario();
                let reference = scenarioManager.getReferenceScenario();
                let maxTimeStamp = scenario.getTimeStamp();
                if (reference != undefined)
                    maxTimeStamp = Math.max(maxTimeStamp, reference.getTimeStamp());
                if (scenario==this.lastScenario && reference==this.lastReference && this.timeStamp>=maxTimeStamp)
                    return;
                showAsGoogleTables(scenario, divId, category, order, scenariocfg);
                this.lastScenario = scenario;
                this.lastReference = reference;
                this.timeStamp = maxTimeStamp;
            }
        }   

        this.addWidget(cfg);
    }

    redrawWidget(id) {
        let widgets = this.widgets;
        if ('cb' in widgets[id]) 
            (widgets[id].cb)();
    }


    redraw() {
        let widgets = this.widgets;
        for (let w in widgets) 
            this.redrawWidget(w);        
    }

    init() {
     
    }
}
