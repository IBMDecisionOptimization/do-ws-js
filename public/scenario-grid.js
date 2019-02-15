class ScenarioGrid {

    constructor(gridDivName, scenarioManager) {
        this.gridDivName = gridDivName;
        this.scenarioManager = scenarioManager;
        this.widgets = [];
      }    
      
    addWidget(widget) {
        this.widgets.push(widget);
        
        let item = document.createElement('div');
        item.className = "grid-stack-item";
        item.setAttribute('data-gs-x', widget.x);
        item.setAttribute('data-gs-y', widget.y);
        item.setAttribute('data-gs-width', widget.width);
        item.setAttribute('data-gs-height', widget.height);
        item.setAttribute('data-gs-auto-position', 1);                

        var content = document.createElement('div');
        content.className = "grid-stack-item-content"
        let titleDiv = document.createElement('div');
        titleDiv.className = "grid-title";
        let title = (widget.title == undefined) ? "" : widget.title;
        titleDiv.innerHTML = title; 
        content.appendChild(titleDiv);

        content.innerHTML = content.innerHTML + widget.innerHTML; 
        item.appendChild(content);

        var grid = $('#'+this.gridDivName).data('gridstack');
        grid.addWidget(item);
    }

    addCustomWidget(widget, useReference = false) {

        let scenarioManager = this.scenarioManager;

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

    addScenarioWidget(cb, x =0, y = 0, width = 6, height = 4) {
        let divId = 'scenario_div';
        let scenarioManager = this.scenarioManager;

        let scenarioscfg = { 
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
    }

    addKPIsWidget(x = 2, y = 0, width = 10, height = 5) {
        let divId = 'kpis_chart_div';
        let scenarioManager = this.scenarioManager;
        let kpiscfg = { 
            x: x,
            y: y,
            width: width,
            height: height,
            title: "KPIs",
            innerHTML: '<div id="' + divId + '" style="width: 100%; height: calc(100% - 30px);  padding: 5px;"></div>',
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
                showKPIsAsGoogleTable(scenarioManager, divId);
                this.lastScenario = scenario;
                this.lastReference = reference;
                this.timeStamp = maxTimeStamp;
            }
        }

        this.addWidget(kpiscfg);
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

    addTablesWidget(title, category, order, scenariocfg, x = 0, y = 0, width = 6, height = 4) {
        let divId = title + '_tables_div';
        let scenarioManager = this.scenarioManager;
        let cfg = { 
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

    redraw(scenario) {
        let widgets = this.widgets;
        for (let w in widgets) {
            if ('cb' in widgets[w])
                (widgets[w].cb)();
        }
    }
}


$(function () {    

    var options = {
        // verticalMargin: 5
    };
    $('.grid-stack').gridstack(options).on('gsresizestop', function(event, elem) {
        // var newHeight = $(elem).attr('data-gs-height');
        console.log('STOP resize' );
        let scenario = scenariomgr.getSelectedScenario();
        showInputsAndOutputs(scenario);       
    });
});