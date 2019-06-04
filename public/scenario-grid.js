
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
                <img src="./do-ws-js/images/scenarios-32.png" title="Manage Scenarios" class="scenario-grid-action" onclick="scenariogrid.addScenarioWidget(undefined,0,0,2,2,true)"/> \
                <img src="./do-ws-js/images/gears-32.png" title="Solve Scenarios" class="scenario-grid-action" onclick="scenariogrid.addSolveWidget()"/> \
                <img src="./do-ws-js/images/sensitivity-run-32.png" title="Sensitivity Run" class="scenario-grid-action" onclick="scenariogrid.addSensitivityRunWidget()"/> \
                <img src="./do-ws-js/images/inputs-32.png" title="Inputs" class="scenario-grid-action" onclick="scenariogrid.addInputsWidget(0,0,6,4,true)"/> \
                <img src="./do-ws-js/images/outputs-32.png" title="Outputs" class="scenario-grid-action" onclick="scenariogrid.addOutputsWidget(0,0,6,4,true)"/> \
                &nbsp;  &nbsp;  &nbsp; \
                <img src="./do-ws-js/images/eraser-32.png" title"Remove All" class="scenario-grid-action" onclick="scenariogrid.removeAll()"/>';
        if (config.enableImport) 
            actionsHTML =  actionsHTML +
                '<img src="./do-ws-js/images/import-32.png" title="Import" class="scenario-grid-action" onclick="scenariogrid.showimport()"/>';
        
                actionsHTML = actionsHTML + '</p>';    
        headerDiv.innerHTML = '<span id="mytitle">' + title + '</span>' + actionsHTML;
        div.appendChild(headerDiv);

     

        if (config.enableImport) {
            let projectName = 'PA3';
            let modelName = 'DOMODEL'
            let scenarioName = 'Scenario 1';

            let importDivHTML = '<div class="form-popup" id="IMPORT_DIV" style="display: none; font-size: 50%;">\
                    <label><b>Project</b></label> \
                    <select id="IMPORT_PROJECT" onChange="scenariogrid.importUpdateModels()"> \
                    <option value="'+projectName+'">'+projectName+'</option> \
                    </select> \
                    <label><b>Model</b></label> \
                    <select id="IMPORT_MODEL" onChange="scenariogrid.importUpdateScenarios()"> \
                    <option value="'+modelName+'">'+modelName+'</option> \
                    </select> \
                    <label><b>--- IMPORT \
                    <input type="checkbox" id="IMPORT_SCENARIO" checked>  \
                     Scenarios</b></label> \
                    <select id="IMPORT_SCENARIO_LIST"> \
                    <option value="'+scenarioName+'">'+scenarioName+'</option> \
                    </select> \
                    <input type="checkbox" id="IMPORT_DASHBOARD"> Dashboard  \
                    <input type="checkbox" id="IMPORT_PYTHON_MODEL"> Model  \
                    <button type="button" id="IMPORT_BTN" class="btn" onclick="scenariogrid.doimport()">Import</button> \
                    <button type="button" class="btn cancel" onclick="scenariogrid.hideimport()">Close</button>\
                </div>';
            let importDiv = document.createElement('div');
            importDiv.initDone = false;
            importDiv.innerHTML = importDivHTML;
            headerDiv.appendChild(importDiv);
          
        }

        div.innerHTML = div.innerHTML + '<div id="progressDiv"><div class="progress">\
                  <div class="progress-bar" role="progressbar" id="loadprogress" style="width: 0%" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100">\
                  <center><span id="loadprogress-value" class="pull-right" style="text-align:center;"></span></center>\
                  </div>\
          </div></div>';

        div.innerHTML = div.innerHTML + '<div id="' +this.gridDivId +'" class="grid-stack"></div>';      
        this.hideProgress();
         
        var options = {
            // verticalMargin: 5
            float: true,
            handle: '.grid-title'
        };
        $('#'+this.gridDivId).gridstack(options).on('gsresizestop', function(event, elem) {
            console.log('Widget ' +elem.id + ' end resize' );
            scenariogrid.widgets[elem.id].timeStamp = 0;
            scenariogrid.redraw(elem.id);
        });       
        $('#'+this.gridDivId).gridstack(options). on('change', function(event, items) {
            for (let i in items) {
                let item = items[i];
                let id = item.el[0].id;
                //scenariogrid.widgets[id].timeStamp = 0;
                scenariogrid.widgets[id].x = item.x;
                scenariogrid.widgets[id].y = item.y;
                scenariogrid.widgets[id].width = item.width;
                scenariogrid.widgets[id].height = item.height;                
            }
        });

      }    

    showProgress() {
        let progressDiv = document.getElementById("progressDiv");
        progressDiv.style.display = "block";
        progressDiv.style.height = "20px";

        document.getElementById("loadprogress").style.width = "0%";

        document.getElementById(this.gridDivId).style.display = "none";
    }
    showProgressMessage(text) {
        document.getElementById("loadprogress-value").innerHTML  = '<center>' + text + '</center>';
    }
    updateProgress(val, max, text=undefined) {
        this.showProgress();
        let w = Math.trunc(100*val/max) + "%";
        document.getElementById("loadprogress").style.width = w;
        if (text != undefined)
            document.getElementById("loadprogress-value").innerHTML = text;
    }
    hideProgress() {
        let progressDiv = document.getElementById("progressDiv");
        progressDiv.style.display = "none";
        progressDiv.style.height = "0px";

        document.getElementById("loadprogress").style.width = "100%";
        document.getElementById("loadprogress-value").innerHTML = ""

        document.getElementById(this.gridDivId).style.display = "block";
    }
    setTitle(title) {
        document.getElementById('mytitle').innerHTML = title
    }      
     
    removeAll() {
        var grid = $('#'+this.gridDivId).data('gridstack');
        grid.removeAll()
        this.widgets = {}

        for (let scenarioId in this.scenarioManager.scenarios)
            delete this.scenarioManager.scenarios[scenarioId];
       this.scenarioManager.selected = null;
       this.scenarioManager.reference = null;
       this.scenarioManager.config = {}
    }

    infoWidget(widgetId) {
        let widget = this.widgets[widgetId];
        // if ('info' in widget)
        //     window.alert('x:'+widget.x + ' info:' widget.info)
        let info = 'x:' + widget.x + ' y:' + widget.y + ' width:' + widget.width + ' height:' + widget.height;
        if (widget.type == 'vega') {
            let newvegacfg = JSON.parse(JSON.stringify(widget.vegacfg));
            delete newvegacfg.data;
            info = 'let '+widget.id+'cfg="'+JSON.stringify(newvegacfg)+'";\n';
            info += 'scenariogrid.addVegaWidget("'+widget.id+'", "'+widget.title+'", "'+widget.tableName+'", '+widget.id+'cfg, '+widget.x+', '+widget.y+', '+widget.width+', '+widget.height+');'
        }
        console.log(info);
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
        if ('x' in widget && widget.x != undefined && 'y' in widget && widget.y != undefined) {
            item.setAttribute('data-gs-x', widget.x);
            item.setAttribute('data-gs-y', widget.y);
        } else 
            item.setAttribute('data-gs-auto-position', 1);                
        item.setAttribute('data-gs-width', widget.width);
        item.setAttribute('data-gs-height', widget.height);
        

        var content = document.createElement('div');
        content.setAttribute('id', widget.id+'_content_div');
        content.className = "grid-stack-item-content"
        let headerDiv = document.createElement('div');
        headerDiv.setAttribute('id', widget.id+'_header_div');
        headerDiv.className = "grid-title";
        let title = (widget.title == undefined) ? "" : widget.title;
        headerDiv.innerHTML = title + 
            '<p style="float:right"> \
                <img src="./do-ws-js/images/info.png" class="grid-action" onclick="scenariogrid.infoWidget(\'' + widget.id + '\')"/> \
                <img src="./do-ws-js/images/refresh.png" class="grid-action" onclick="scenariogrid.redrawWidget(\'' + widget.id + '\')"/> \
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

    addVegaWidget(id, title, tableName, vegaconfig, x=0, y=0, width=2, height=2, ) {
        let divId = id + '_div';

        let scenarioManager = this.scenarioManager;

        function myvegacb() {
            let scenarios = [scenarioManager.getSelectedScenario()];
        
            let vegadiv = document.getElementById(divId);
            let vw = vegadiv.parentNode.clientWidth-200;
            let vh = vegadiv.parentNode.clientHeight-50;
            vegaconfig.width= vw;
            vegaconfig.height= vh;
        
            vegalitechart2(divId, scenarios, tableName, vegaconfig)
        }

        
        let cfg = { 
            id: id,
            type: 'vega',
            x: x,
            y: y,
            width: width,
            height: height,
            title: title,
            innerHTML: '<div style="width:100%; height: calc(100% - 30px); overflow: auto;">\
                            <div id="' +divId+ '" style=""></div>\
                        </div>',
            vegacfg: vegaconfig,
            tableName: tableName,
            cb: myvegacb
        }


        this.addWidget(cfg);

    }

    addTextWidget(id, title, html, x=0, y=0, width=2, height=2, style=undefined) {
        let divId = id + '_div';

        function stylecb() {
            let div = document.getElementById(id+'_content_div');
            for (let s in style)
                div.style[s] = style[s];
        }
        
        
        let cfg = { 
            id: id,
            x: x,
            y: y,
            width: width,
            height: height,
            title: title,
            innerHTML: '<div id="' + divId + '" style="width:100%; height: calc(100% - 30px); overflow: auto;">'+
                            html +
                        '</div>',
            cb: stylecb
        }


        this.addWidget(cfg);

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

    addScenarioWidget(cb=undefined, x=0, y=0, width=2, height=2, forceDisplay=false) {
        let id = "scenario_" + Object.keys(this.widgets).length; 
        let divId = id + '_div';
        let scenarioManager = this.scenarioManager;

        if (cb == undefined) {
            cb = function () {
                scenariogrid.redraw();
            }
        }
        let scenarioscfg = { 
            id: id,
            x: x,
            y: y,
            width: width,
            height: height,
            title: "Scenarios",
            innerHTML: '<div id="' + divId + '"></div>',
            nbScenarios: 0,
            lastScenario: "",
            lastReference: "",
            timeStamp: 0,
            cb: function() {           
                
                let scenario = scenarioManager.getSelectedScenario();
                let reference = scenarioManager.getReferenceScenario();                    
                let maxTimeStamp = scenarioManager.getScenariosMaxTimeStamp();
                if ( (this.nbScenarios == scenarioManager.getNbScenarios()) &&
                    (scenario==this.lastScenario) && (reference==this.lastReference) &&
                    (this.timeStamp >= maxTimeStamp) )
                    return;
                scenarioManager.showAsSelector(divId, cb);
                this.nbScenarios = scenarioManager.getNbScenarios();
                this.timeStamp = maxTimeStamp;
                this.lastScenario = scenario;
                this.lastReference = reference;
            }
        }

        this.addWidget(scenarioscfg);
        if (forceDisplay)
            this.redrawWidget(id)
    }

    addConstraintWidget(cb=undefined, x=0, y=0, width=2, height=2, forceDisplay=false) {
        let id = "constraints_" + Object.keys(this.widgets).length; 
        let divId = id + '_div';
        let scenarioManager = this.scenarioManager;

        let tableConfig = {
            title: 'Additional Constraints',
            category: 'input',
            sortAscending: true,
            sortColumn: 0,
            showRowNumber: false,
            width: '100%',
            height: '100%'
        }

        if (cb == undefined) {
            cb = function () {
                scenariogrid.redraw();
            }
        }

        
        let constraintscfg = { 
            id: id,
            x: x,
            y: y,
            width: width,
            height: height,
            title: tableConfig.title,
            innerHTML: '<div style="width:100%; height: calc(100% - 30px); overflow: auto;">\
                        <div id="'+divId+'_header" style=""></div><div style="width:100%; height: calc(100% - 20px)" id="'+divId+'" style=""></div>\
                    </div>',
            nbScenarios: 0,
            lastScenario: "",
            lastReference: "",
            timeStamp: 0,
            cb: function() {                           
                let scenario = scenarioManager.getSelectedScenario();
                let reference = scenarioManager.getReferenceScenario();                    
                let maxTimeStamp = scenarioManager.getScenariosMaxTimeStamp();
                if ( (this.nbScenarios == scenarioManager.getNbScenarios()) &&
                    (scenario==this.lastScenario) && (reference==this.lastReference) &&
                    (this.timeStamp >= maxTimeStamp) )
                    return;
                showAsConstraints(scenario, divId);            
                this.nbScenarios = scenarioManager.getNbScenarios();
                this.timeStamp = maxTimeStamp;
                this.lastScenario = scenario;
                this.lastReference = reference;
            }
        }

        this.addWidget(constraintscfg);
        if (forceDisplay)
            this.redrawWidget(id)
    }

    addScenarioListWidget(cb=undefined, x=0, y=0, width=12, height=4, forceDisplay=false) {
        let id = "scenario_list_" + Object.keys(this.widgets).length; 
        let divId = id + '_div';
        let scenarioManager = this.scenarioManager;

        if (cb == undefined) {
            cb = function () {
                scenariogrid.redraw();
            }
        }
        let scenarioscfg = { 
            id: id,
            x: x,
            y: y,
            width: width,
            height: height,
            title: "Scenarios List",
            innerHTML: '<div style="width:100%; height: calc(100% - 30px); overflow: auto;">\
            <div id="'+divId+'_header" style=""></div><div style="width:100%; height: calc(100% - 20px)" id="'+divId+'" style=""></div>\
        </div>',
            nbScenarios: 0,
            timeStamp: 0,
            cb: function() {           
                let maxTimeStamp = scenarioManager.getScenariosMaxTimeStamp();
                if ( (this.nbScenarios == scenarioManager.getNbScenarios()) &&
                    (this.timeStamp >= maxTimeStamp) )
                    return;
                showAsScenarioList(scenarioManager, divId, cb);
                this.nbScenarios = scenarioManager.getNbScenarios();
                this.timeStamp = maxTimeStamp;                
            }
        }

        this.addWidget(scenarioscfg);
        if (forceDisplay)
            this.redrawWidget(id)
    }

    addScenarioChartWidget(cb=undefined, x=0, y=0, width=12, height=6, forceDisplay=false) {
        let id = "scenario_chart_" + Object.keys(this.widgets).length; 
        let divId = id + '_div';
        let scenarioManager = this.scenarioManager;

        if (cb == undefined) {
            cb = function () {
                scenariogrid.redraw();
            }
        }
        let scenarioscfg = { 
            id: id,
            x: x,
            y: y,
            width: width,
            height: height,
            title: "Scenarios Chart",
            innerHTML: '<div style="width:100%; height: calc(100% - 30px); overflow: auto;">\
                    <div id="'+divId+'_header" style=""></div><div id="'+divId+'" style="width:100%; height: calc(100% - 20px)"></div>\
                </div>',
            nbScenarios: 0,
            timeStamp: 0,
            cb: function() {           
                let maxTimeStamp = scenarioManager.getScenariosMaxTimeStamp();
                if ( (this.nbScenarios == scenarioManager.getNbScenarios()) &&
                    (this.timeStamp >= maxTimeStamp) )
                    return;
                showAsScenarioChart(scenarioManager, divId, cb);
                this.nbScenarios = scenarioManager.getNbScenarios();
                this.timeStamp = maxTimeStamp;
            }
        }

        this.addWidget(scenarioscfg);
        if (forceDisplay)
            this.redrawWidget(id)
    }

                
    addSensitivityRunWidget(cb=undefined, x=undefined, y=undefined, width=12, height=6, forceDisplay=true) {
        let id = "sensitivity_run_" + Object.keys(this.widgets).length; 
        let divId = id + '_div';
        let scenarioManager = this.scenarioManager;

        let sensitivitycfg = { 
            x: x,
            y: y,
            width: width,
            height: height,
            title: "Sensitivity Run",
            innerHTML: '<div style="width:100%; height: calc(100% - 30px); overflow: auto;">\
                    <div id="'+divId+'_header" style=""></div><div id="'+divId+'" style="width:100%; height: calc(100% - 20px)"><svg></svg></div>\
                </div>',
            nbScenarios: 0,
            lastScenario: "",
            lastReference: "",
            timeStamp: 0,
            cb: function() {                           
                let scenario = scenarioManager.getSelectedScenario();
                let reference = scenarioManager.getReferenceScenario();                    
                let maxTimeStamp = scenarioManager.getScenariosMaxTimeStamp();
                if ( (this.nbScenarios == scenarioManager.getNbScenarios()) &&
                    (scenario==this.lastScenario) && (reference==this.lastReference) &&
                    (this.timeStamp >= maxTimeStamp) )
                    return;
                showAsSensitivityRun(scenario, divId);            
                this.nbScenarios = scenarioManager.getNbScenarios();
                this.timeStamp = maxTimeStamp;
                this.lastScenario = scenario;
                this.lastReference = reference;
            }
        }

        this.addCustomWidget(id, sensitivitycfg);
        if (forceDisplay)
            this.redrawWidget(id)
    }

    addSensitivityChartWidget(cb=undefined, x=0, y=0, width=12, height=6, forceDisplay=false) {
        let id = "sensitivity_chart_" + Object.keys(this.widgets).length; 
        let divId = id + '_div';
        let scenarioManager = this.scenarioManager;

        let sensitivitycfg = { 
            x: x,
            y: y,
            width: width,
            height: height,
            title: "Sensitivity chart",
            innerHTML: '<div style="width:100%; height: calc(100% - 30px); overflow: auto;">\
                    <div id="'+divId+'_header" style=""></div><div id="'+divId+'" style="width:100%; height: calc(100% - 20px)"><svg></svg></div>\
                </div>',
            nbScenarios: 0,
            timeStamp: 0,
            cb: function() {           
                let maxTimeStamp = scenarioManager.getScenariosMaxTimeStamp();
                if ( (this.nbScenarios == scenarioManager.getNbScenarios()) &&
                    (this.timeStamp >= maxTimeStamp) )
                    return;
                showAsSensitivityChart(scenarioManager, divId, cb);
                this.nbScenarios = scenarioManager.getNbScenarios();
                this.timeStamp = maxTimeStamp;
            }
        }

        scenariogrid.addCustomWidget(id, sensitivitycfg);
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
            lastScenario: "",
            lastReference: "",
            timeStamp: 0,
            cb: function () {

                let scenario = scenarioManager.getSelectedScenario();
                let reference = scenarioManager.getReferenceScenario();     
                let maxTimeStamp = scenarioManager.getScenariosMaxTimeStamp();
                if ( (this.nbScenarios == scenarioManager.getNbScenarios()) &&
                    (scenario==this.lastScenario) && (reference==this.lastReference) &&
                    (this.timeStamp >= maxTimeStamp) )
                    return;
                showKPIsAsGoogleTable(scenarioManager, divId);
                this.nbScenarios = scenarioManager.getNbScenarios();
                this.timeStamp = maxTimeStamp;
                this.lastScenario = scenario;
                this.lastReference = reference;
            }
        }

        this.addWidget(kpiscfg);
    }

    importUpdateProjects() {
         // change scenarios
         let scenariogrid = this;

         scenariogrid.updateProgress(0, 3);

         axios({
             method:'get',
             url:'/api/dsx/projects',
             responseType:'json'
         })
         .then(function (response) {
             let projects = response.data;
             let select = document.getElementById("IMPORT_PROJECT");
             while (select.options.length > 0) {
                select.remove(select.options.length - 1);
            }

            
             for (let p in projects) {
                 let element = document.createElement("option");
                 element.innerText = projects[p].name;
                 element.guid = projects[p].guid;
                 select.append(element);
             }
             
             
             scenariogrid.importUpdateModels();
         })
         //.catch(showHttpError); 
    }

    importUpdateModels() {
        // change scenarios
        let scenariogrid = this;

        let projectName = document.getElementById('IMPORT_PROJECT').value;
        let projectId = document.getElementById('IMPORT_PROJECT').options[document.getElementById('IMPORT_PROJECT').selectedIndex].guid;

        scenariogrid.updateProgress(1, 3);

        let url = '/api/dsx/domodels?projectName=' + projectName;
        if (projectId != undefined)
            url = url + '&projectId=' + projectId;
        axios({
            method:'get',
            url:url,
            responseType:'json'
        })
        .then(function (response) {
             let models = response.data;
             let select = document.getElementById("IMPORT_MODEL");
             while (select.options.length > 0) {
                select.remove(select.options.length - 1);
            }

            
             for (let m in models) {
                 let element = document.createElement("option");
                 element.innerText = models[m].name;
                 select.append(element);
             }
             
             
             scenariogrid.importUpdateScenarios();
            
        })
        .catch(showHttpError); 
    }

    importUpdateScenarios() {
        // change scenarios
        let scenariogrid = this;

        let projectName = document.getElementById('IMPORT_PROJECT').value;
        let projectId = document.getElementById('IMPORT_PROJECT').options[document.getElementById('IMPORT_PROJECT').selectedIndex].guid;
        let modelName = document.getElementById('IMPORT_MODEL').value;
        
        scenariogrid.updateProgress(2, 3);

        let url = '/api/dsx/domodel?projectName=' + projectName;
        if (projectId != undefined)
            url = url + '&projectId=' + projectId;
        url = url + '&modelName=' + modelName;

        axios({
            method:'get',
            url:url,
            responseType:'json'
        })
        .then(function (response) {
            let scenarios = response.data;

             let select = document.getElementById("IMPORT_SCENARIO_LIST");
             while (select.options.length > 0) {
                select.remove(select.options.length - 1);
            }

            
            let element = document.createElement("option");
            element.innerText = "__ALL__";
            select.append(element);

             for (let s in scenarios) {
                 if ( (!('category' in scenarios[s])) || (scenarios[s].category == 'scenario') ) { 
                    element = document.createElement("option");
                    element.innerText = scenarios[s].name;
                    select.append(element);
                 }
             }

             scenariogrid.updateProgress(3, 3);
             scenariogrid.hideProgress();
            
        })
        .catch(showHttpError); 
    }
    showimport() {        

        let div = document.getElementById('IMPORT_DIV');
        div.style.display = 'block'; 
        
        if (!div.initDone) {
            this.importUpdateProjects();
            div.initDone = true;
        }
        
    }
    hideimport() {
        document.getElementById('IMPORT_DIV').style.display = 'none'; 
    }

    doimportmodel(projectName, projectId, modelName, scenarioName) {
        let scenariogrid = this;
        let workspace = this.scenarioManager.workspace;
        
        let url = '/api/dsx/domodel/data?projectName=' + projectName;
        if (projectId != undefined)
            url = url + '&projectId=' + projectId;
        url = url + '&modelName=' + modelName + '&scenarioName=' + scenarioName + '&assetName=model.py'

        axios({
            method:'get',
            url:url
            //responseType:'text'
        })
        .then(function (response) {
            console.log("Get model: OK.");
            axios({
                method:'put',
                url:'/api/optim/model?workspace=' + workspace,
                data: {model:response.data}
            })
            .then(function (response) {
                console.log("Put model: OK.");
            })
            //.catch(showHttpError);   
            
        })
        //.catch(showHttpError);   
    }

    dodefaultdashboard() {
        
        this.addScenarioListWidget(undefined, 0, 0, 12, 4)
        this.addScenarioChartWidget(undefined, 0, 4, 12, 6);
        this.addSensitivityChartWidget(undefined, 0, 10, 12, 6)

        this.addScenarioWidget(undefined, 0, 16, 2, 2);
        this.addSolveWidget(0, 18);
        this.addKPIsWidget(2, 16);
        this.addInputsWidget(0, 21);
        this.addOutputsWidget(6, 21);

        if (this.scenarioManager.getSelectedScenario()!= undefined) {
            if ('explanations' in this.scenarioManager.getSelectedScenario().tables) {
                let expcfg = {title:'Explanations', category:'output'};
                this.addTableWidget('explanations', expcfg, 0, 25, 12, 3);
            }
            if ('constraints' in this.scenarioManager.getSelectedScenario().tables) {
                this.addConstraintWidget(undefined, 0, 28, 12, 3);
            }
        }
    }

    doimportdashboard(projectName, projectId, modelName) {
        let scenariogrid = this;

        if (Object.keys(this.widgets).length == 0)
            this.dodefaultdashboard();

        let minY = 31;

        let url = '/api/dsx/domodel/data?projectName=' + projectName;
        if (projectId != undefined)
            url = url + '&projectId=' + projectId;
        url = url + '&modelName=' + modelName + '&scenarioName=dashboard&assetName=dashboard.json'

        axios({
            method:'get',
            url:url,
            responseType:'json'
        })
        .then(function (response) {
            console.log("Get dashboard: OK.");
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
                            
                            if (props.container.constructor == Array) {
                                scenarios = [];
                                for (let s in props.container) {
                                    let scenarioId = props.container[s];
                                    if (scenarioId in scenariomgr.scenarios)
                                        scenarios.push(scenariomgr.scenarios[scenarioId]);
                                }
                            } else {
                                if (props.container == '*') 
                                    scenarios = scenariomgr.scenarios;
                                else if (props.container.startsWith('/')) {
                                    var patt = new RegExp(props.container.split('/') [1], props.container.split('/') [2]);
                                    for (let s in scenariomgr.scenarios) {
                                        let scenario = scenariomgr.scenarios[s];
                                        if (patt.test(scenario.getName()))
                                            scenarios.push(scenario);
                                    }
                                }
                            }

                            let tableName = props.data;

                            let vegadiv = document.getElementById(divId);
                            let vw = vegadiv.parentNode.clientWidth-200;
                            let vh = vegadiv.parentNode.clientHeight-50;
                            let vegaconfig = {
                                    // "width" : vw,
                                    width: props.spec.width,
                                    // "height" : vh,
                                    height: props.spec.height
                            }
                            vegaconfig.mark = props.spec.mark;
                            vegaconfig.encoding = props.spec.encoding;
                            console.log(JSON.stringify(props.data))
                            console.log(JSON.stringify(vegaconfig))
                            vegalitechart2(divId, scenarios, tableName, vegaconfig)
                        }

                        let x= 0;
                        let y= minY;
                        let width= 6;
                        let height= 4;
                        for (let ii in page.layouts.LG) {
                            let layout = page.layouts.LG[ii];
                            if (layout.i == w) {
                                x = 2*layout.x;
                                y = minY + 2*layout.y;
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
                            title: widget.name,
                            innerHTML: '<div style="width:100%; height: calc(100% - 30px); overflow: auto;">\
                                            <div id="'+divId+'" style=""></div>\
                                        </div>',
                            cb: myvegacb
                        }

                        if ( (vegacfg.title == undefined) ||
                            (vegacfg.title == '') )
                            vegacfg.title = props.data;
                    
                        scenariogrid.addWidget(vegacfg);
                        scenariogrid.redrawWidget(id);
                    }

                }
            }
        })
        //.catch(showHttpError);     
    }
    doimportscenario(projectName, projectId, modelName, scenarioName, cb = undefined) {
        let scenariogrid = this;
        let url = '/api/dsx/domodel/tables?projectName=' + projectName;
        if (projectId != undefined)
            url = url + '&projectId=' + projectId;
        url = url + '&modelName=' + modelName + '&scenarioName=' + scenarioName;
        axios({
            method:'get',
            url: url,
            responseType:'json'
        })
        .then(function (response) {
            console.log("Received Tables: OK.");
            let scenario = scenariogrid.scenarioManager.newScenario(scenarioName);
            let tables = response.data;
            let ntables = tables.length;
            let itables = 0;
            url = '/api/dsx/domodel/table?projectName=' + projectName;
            if (projectId != undefined)
                url = url + '&projectId=' + projectId;
            url = url + '&modelName=' + modelName + '&scenarioName=' + scenarioName;
            for (let t in tables) {
                let tableName = tables[t].name;
                axios({
                    method:'get',
                    url:url + '&tableName=' + tableName,
                    responseType:'json'
                })
                .then(function (response) {
                    console.log("Received Table: OK.");
                    let tablecsv = response.data;
                    scenario.addTableFromCSV(tableName, tablecsv, tables[t].category)

                    if ('id' in scenariogrid.scenarioManager.config[tableName])
                        scenariogrid.scenarioManager.config[tableName].allowEdition = true;
                        
                    itables++;
                    if ( (itables == ntables) &&
                         (cb != undefined) ) {
                        scenariogrid.showProgressMessage("Imported scenario " + scenario.name);

                        // OJO adding date 
                        if (!('parameters' in scenario.tables)) {
                            // Create table parameters
                            scenario.addTable('parameters', 'input', ['name', 'value'], {id:'name', cb:undefined});
                        }

                        function printDate(d) {
                            return ("0"+(d.getDate()+1)).slice(-2)+'/'+("0"+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear() +
                            ' ' + ("0"+(d.getHours()+1)).slice(-2)+':'+("0"+(d.getMinutes()+1)).slice(-2);
                          }

                        let date = new Date();
                        date = new Date(date.getTime() - Math.floor(Math.random() * 30*1000*60*60*24));
                          
                        // OJO adding date 
                        if ('date' in scenario.tables['parameters'].rows) {
                            // udate
                            scenario.tables['parameters'].rows['date'].value = printDate(date);
                        } else
                        {
                            // Add
                            scenario.addRowToTable('parameters', 'date', {name:'date', value:printDate(date)});

                        }

                        cb();
                    }
                })
                //.catch(showHttpError); 
            }
        })
        //.catch(showHttpError); 
    }
    doimport() {

        let scenariogrid = this;

        let projectName = document.getElementById('IMPORT_PROJECT').value;
        let projectId = document.getElementById('IMPORT_PROJECT').options[document.getElementById('IMPORT_PROJECT').selectedIndex].guid;
        let modelName = document.getElementById('IMPORT_MODEL').value;
        let scenarioName = document.getElementById('IMPORT_SCENARIO_LIST').value;

        let btn = document.getElementById("IMPORT_BTN");
        btn.innerHTML = "Loading...";
        this.showProgress();

        this.setTitle(projectName + '-' + modelName);

        let is = 0;
        let ts = 1;
        function mycb() {                        
            is = is + 1;
            scenariogrid.updateProgress(is, ts);

            if (is == ts) {            
                if (scenarioName in scenariogrid.scenarioManager.scenarios)     
                    scenariogrid.scenarioManager.selected = scenariogrid.scenarioManager.scenarios[scenarioName];    
                if (document.getElementById("IMPORT_DASHBOARD").checked)
                    scenariogrid.doimportdashboard(projectName, projectId, modelName)
                else if (Object.keys(scenariogrid.widgets).length == 0)
                    scenariogrid.dodefaultdashboard();

                if (document.getElementById("IMPORT_PYTHON_MODEL").checked
                        && (!document.getElementById("IMPORT_SCENARIO").checked || scenarioName != "__ALL__") )
                    scenariogrid.doimportmodel(projectName, projectId, modelName, scenarioName)

                scenariogrid.hideProgress();

                scenariogrid.redraw();

                document.getElementById("IMPORT_BTN").innerHTML = "Import";

            }
        }
        if (document.getElementById("IMPORT_SCENARIO").checked) {
            if (scenarioName == "__ALL__") {
                let select = document.getElementById("IMPORT_SCENARIO_LIST");
                ts = select.options.length-1;
                for (let i = 1; i < select.options.length; i++) {
                    scenarioName = select.options[i].value;
                    if (scenarioName != "Baseline")  // OJO
                        this.doimportscenario(projectName, projectId, modelName, scenarioName, mycb);
                    else
                        ts = ts - 1;
                }
            } else {
                this.doimportscenario(projectName, projectId, modelName, scenarioName, mycb);
            }
        } else {
            mycb();
        }

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

            let workspace = "";
            if (scenariomgr.workspace != undefined)
                workspace = "?workspace="+scenariomgr.workspace;
            axios({
                    method: 'post',
                    url: './api/optim/solve'+workspace,
                    data: data
            }).then(function(response) {
                    jobId = response.data.jobId                        
                    console.log("Job ID: "+ jobId);
                    intervalId = setInterval(checkStatus, 1000)
            }).catch(showHttpError);
        }

        function checkStatus() {
            let scenario = scenariomgr.getSelectedScenario();
            let workspace = "";
            if (scenariomgr.workspace != undefined)
                workspace = "&workspace="+scenariomgr.workspace;
            axios.get("/api/optim/status?jobId="+jobId+workspace)
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

    addScoreWidget(x = 0, y = 0, width = 2, height = 2) {
        
        let scenariomgr = this.scenarioManager;

        function callScript(name, cb) {
            if (name != undefined) {
                let url = './api/config/file?fileName='+name;
                if (workspace != undefined)
                        url += '&workspace='+workspace;
                axios({
                    method:'get',
                    url:url,
                    responseType:'text/plain'
                  })
                .then(function (response) {
                        let js = response.data;
                        eval(js);
                        cb();
                }); 
            }
        }
        
        function doscore() {

            let inputScenario = scenariomgr.getSelectedScenario();

            let inputTableId = config.ml.input;
            let inputTable = inputScenario.tables[inputTableId];   
            let payload = {
                    fields: [],
                    values: []
            };
            for (let c in inputTable.cols)
                    payload.fields.push(inputTable.cols[c]);

            for (let r in inputTable.rows) {
                    let data = [];
                    for (let c in inputTable.cols) {
                            let val = inputTable.rows[r][inputTable.cols[c]];
                            if (!isNaN(parseFloat(val)))
                                    val = parseFloat(val);
                            data.push(val);
                    }
                    payload.values.push(data);                
            }


            let btn = document.getElementById('SCORE');
            btn.disabled = true;
            let btn_txt = btn.value;
            btn.value = 'SCORING';        
        
            axios({
                    method: 'post',
                    url: './api/ml/score?workspace='+scenariomgr.workspace,
                    data: payload
            }).then(function(response) {

                if ('values' in response.data) {
                        console.log("Scoring done");

                        let outputScenario = scenariomgr.getSelectedScenario();

                        let outputTableId = config.ml.output;
                        let outputId = config.ml.outputId;
                        if (outputId == undefined)
                                outputId = inputTableId;
                        let nbOutputs = config.ml.nbOutputs;
                        if (nbOutputs == undefined)
                                nbOutputs = 2;
                        if (!(outputTableId in outputScenario.tables)) {
                                // Create output table
                                outputScenario.addTable(outputTableId, 'output', [outputId, 'value'], {id: outputId});
                        }
                        let outputTable = outputScenario.tables[outputTableId];
                        let i = 0;
                        let idx = response.data.values[0].length-nbOutputs;
                        for (let r in inputTable.rows) {
                                let row = {}
                                row[outputId]= r;   
                                row.value= response.data.values[i][idx];                        
                                outputScenario.addRowToTable(outputTableId, r, row);
                                i = i +1;
                        }

                        callScript(config.ml.postprocess, function () { 
                            scenariogrid.redraw();

                            btn.disabled = false;
                            btn.value = btn_txt;     
                        })
                        
                } else {
                        console.error("Scoring error: " + response.data.errors[0].message);
                        if ( ('action' in config.ml) && ('alertErrors' in config.ml.action) && config.ml.action.alertErrors)
                                alert("Scoring error: " + response.data.errors[0].message);

                        btn.disabled = false;
                        btn.value = btn_txt;   

                }
            }).catch(showHttpError);
        }

        
        function score() {
            callScript(config.ml.preprocess, doscore);            
        }

        let scorecfg = { 
            id: 'score',
            x: x,
            y: y,
            width: width,
            height: height,
            title: "Machine Learning",
            innerHTML: '<input type="button" value="SCORE" id="SCORE"/>',
            //cb: solvecb
        }

        this.addWidget(scorecfg);

        
        document.getElementById("SCORE").onclick = score;
    }

    addModelingAssistantWidget(x = 0, y = 0, width = 2, height = 2) {
        
        let maurl = config.do.ma.url;
        let mauser = 'alain';
        let scenariomgr = this.scenarioManager;

             
        // @PUT
        // @Path("/{user}/uploadCsvFile")
        // @Consumes(MediaType.APPLICATION_OCTET_STREAM)
        // @Produces("application/json")
        // public Response uploadCsvFile(
        //         @Context HttpHeaders headers,
        //         @PathParam("user") String user,
        //         @QueryParam("dataset") String datasetId,
        //         @QueryParam("tableName") String tableName,
        //         String csvContent) {
        function createDataSet() {
            let scenario = scenariomgr.getSelectedScenario();

            let dataset = scenario.getName();
            let tableIds = scenario.getInputTables()

            for (let t in tableIds) {
                let tableId = tableIds[t];
                csv = scenario.getTableAsCSV(tableId);
                axios({
                    method: 'put',
                    url: maurl + '/' + mauser + '/uploadCsvFile?dataset=' + dataset + '&tableName=' + tableId,
                    data: {csv:csv},
                    responseType:'json'
                }).then(function(response) {
                        console.log('Added table ' + tableId + ' in MA dataset' + dataset );
                });
            }
        }
       
        
 
        // @POST
        // @Path("/{user}/refineDesignSession")
        // @Produces("application/json")
        // public Response refineDesignSession(
        //         @Context HttpHeaders headers,
        //         @PathParam("user") String user,
        //         @QueryParam("dataset") String datasetId,
        //         String designSessionText) {     
        function refineSession() {
            let scenario = scenariomgr.getSelectedScenario();

            let dataset = scenario.getName();
            let div = document.getElementById('ma_div');
            let session = div.co_session;
            axios({
                method: 'post',
                url: maurl + '/' + mauser + '/refineDesignSession?dataset=' + dataset,
                data: session
            }).then(function(response) {
                console.log("MA refineSession");
                div.co_session = response.data;                        
                macb();
            }).catch(showHttpError);
        }
   
        // @POST
        // @Path("/{user}/getOptimModel")
        // @Produces("application/json")
        // public Response getOptimModel(
        //         @Context HttpHeaders headers,
        //         @PathParam("user") String user,
        //         @QueryParam("dataset") String datasetId,
        //         String designSessionText) {       
        function getMAModel() {
            let scenario = scenariomgr.getSelectedScenario();

            let dataset = scenario.getName();
            let div = document.getElementById('ma_div');
            let session = div.co_session;
            axios({
                method: 'post',
                url: maurl + '/' + mauser + '/getOptimModel?dataset=' + dataset,
                data: session
            }).then(function(response) {
                console.log("MA getMAModel OK");
                let model = response.data;              
                
                axios({
                    method:'put',
                    url:'/api/optim/model?workspace=' + workspace,
                    data: {model:response.data}
                })
                .then(function (response) {
                    console.log("MA Put model: OK.");
                })
            }).catch(showHttpError);
        }

        function initMA() {

            let div = document.getElementById('ma_div');

            axios({
                method:'get',
                url:'/api/optim/ma/session?workspace=' + workspace,
                responseType:'json'
            })
            .then(function (response) {
                div.co_session = response.data;
                for (let c in div.co_session.suggestedStatements) 
                    setEditable(div.co_session.suggestedStatements[c], true);
                macb();
                
                getMAModel();
            });

        }

        

        function maquery() {
            alert('domaquery');
            // send session to MA and get updated suggestions
            // get Ma Model
            getMAModel();
        }

        function maremove(t) {
            let div = document.getElementById('ma_div');

            div.co_session.suggestedStatements.push(div.co_session.constraints[t]);
            div.co_session.constraints.splice(t, 1);

            macb();
        }

        function maadd(t) {
            let div = document.getElementById('ma_div');

            div.co_session.constraints.push(div.co_session.suggestedStatements[t]);
            div.co_session.suggestedStatements.splice(t, 1)
            macb();
        }

        // "properties": {
        //     "@class": "java.util.HashMap",
        //     "visible": 4,
        //     "editable": true
        //   },
        function setEditable(statement, value) {
            if (!('properties' in statement))
                statement.properties = {
                        "@class": "java.util.HashMap",
                        "editable": value
                      };
        }
        function isEditable(statement) {
            if (!('properties' in statement))
                return false;
            return statement.properties.editable;
        }
        function canSuggest(statement) {
            if (!statement.isConstraint)
                return false;
            if (statement.verbalizationWithAnnotation.includes('__TOBEMAPPED__'))
                return false;
            return true;
        }
        function macb() {

            let div = document.getElementById('ma_div');

            div.innerHTML = "";

            if ('co_session' in div) {
                let session = div.co_session;
                let html = '<table width="100%">';

                //html += '<tr><th width="50%">Model</th><th width="50%">Suggestions</th></tr>';
                
                html += '<tr><td>';
                html += '<b>Goals</b>:<br>';
                for (let c in session.goals)
                    html += session.goals[c].verbalization + '<br>';
                html += '<b>Constraints</b>:<br>';
                let n = 0;
                for (let c in session.constraints) {
                    if (!isEditable(session.constraints[c]))
                        html += '<i>';
                    else {
                        html += '<button type="button" class="btn btn-default btn-xs" aria-label="Left Align" id="MA_REMOVE_'+n+'">';
                        html += '<span class="glyphicon glyphicon-minus" aria-hidden="true"></span>';
                        html += '</button>  ';
                    }
                    html += session.constraints[c].verbalization;
                    if (!isEditable(session.constraints[c]))
                        html += '</i>';
                    html += '<br>';
                    n += 1;
                }
                html += '</td>';

                html += '<td>';

                //html += '<input id="MA_QUERY_TEXT" type="text">';
                //<input id="MA_QUERY" type="button" value="SUGGEST"><br>';

    
                html += '<div class="col-lg-6">';
                html += '<div class="input-group">';
                html += '<input type="text" id="MA_QUERY_TEXT" class="form-control" placeholder="Search for...">';
                html += '<span class="input-group-btn">';
                html += '<button type="button" class="btn btn-default" aria-label="Left Align" id="MA_QUERY">';
                html += '<span class="glyphicon glyphicon-search" aria-hidden="true"></span>';
                html += '</button>  ';
                html += '</span>'
                html += '</div><!-- /input-group -->';
                html += '</div>';

                html += '<br><br>'


                //html += '<b>Suggestions</b>:<br>';
                html += '<br><br>'
                                
                n = 0;
                let m = 0;
                for (let c in session.suggestedStatements) {
                    if (canSuggest(session.suggestedStatements[c])) {
                        html += '<button type="button" class="btn btn-default btn-xs" aria-label="Left Align" id="MA_ADD_'+n+'">';
                        html += '<span class="glyphicon glyphicon-plus" aria-hidden="true"></span>';
                        html += '</button>  ';
                        html += session.suggestedStatements[c].verbalization + '<br>';
                        m += 1;
                    }
                    n += 1;

                    if (m>5)
                        break;
                }
                html += '</td></tr>';
                html += '</table>'
                div.innerHTML = html;

                document.getElementById("MA_QUERY").onclick = maquery;
                n = 0;
                for (let c in session.constraints) {
                    if (isEditable(session.constraints[c])) {
                        let i = n;
                        document.getElementById("MA_REMOVE_"+n).onclick = function () { 
                            maremove(i); 
                            }
                    }
                    n += 1;
                }
                n = 0;
                m = 0;
                for (let c in session.suggestedStatements) {
                    if (canSuggest(session.suggestedStatements[c])) {
                        let i = n;
                        document.getElementById("MA_ADD_"+n).onclick = function () { 
                            maadd(i); 
                            }
                        m += 1;
                    }
                    n += 1;

                     if (m>5)
                        break;
                }
            }
        }


        let macfg = { 
            id: 'ma',
            x: x,
            y: y,
            width: width,
            height: height,
            title: "Modeling Assistant",
            innerHTML: '<div id="ma_div"></div>',
            cb: macb
        }

        this.addWidget(macfg);

        initMA();

    }


    
    addPAWidget(x = 0, y = 0, width = 2, height = 2) {
        
        let scenariomgr = this.scenarioManager;

        function importFromPA() {

                let btn = document.getElementById('PA_IMPORT');
                btn.disabled = true;
                let btn_txt = btn.value;
                btn.value = 'READING';
                let scenario = scenariomgr.getSelectedScenario();
        
                let nCubes = Object.keys(config.mapping.input.cubes).length;
                let nDimensions = Object.keys(config.mapping.input.dimensions).length;
                for (let c in config.mapping.input.cubes) {
                        let cubeName = config.mapping.input.cubes[c].name;
        
                        axios({
                                method:'get',
                                url:'./api/pa/cube/'+cubeName+'?version='+config.mapping.input.version+'&workspace='+scenariomgr.workspace
                              })
                        .then(function (response) {
                                let csv = response.data;
                 
                                console.log('Finished reading cube: ' + cubeName);       
        
                                scenario.addTableFromCSV(cubeName, csv, 'input');
        
                                nCubes--;
                                if (nCubes==0) {

                                    if (nDimensions ==0) {
                                        scenariogrid.redraw();

                                        btn.disabled = false;
                                        btn.value = btn_txt;  
                                    } else
                                    for (let d in config.mapping.input.dimensions) {
                                        let dimensionName = config.mapping.input.dimensions[d].name;

                                        axios({
                                                method:'get',
                                                url:'./api/pa/dimension/'+dimensionName+'?onlyLevel=0&workspace='+scenariomgr.workspace,
                                                responseType:'json'
                                                })
                                        .then(function (response) {
                                                let obj = response.data;
                                   
                                                console.log('Finished reading dimension: ' + dimensionName);       
                        
                                                csv = 'Id\r\n';
                                                for (let r in obj) {
                                                        csv += obj[r] + '\r\n';
                                                }
                                                
                                                scenario.addTableFromCSV(dimensionName, csv, 'input');
                        
                                                nDimensions--;
                                                if (nDimensions==0) {
                                                    scenariogrid.redraw();

                                                    btn.disabled = false;
                                                    btn.value = btn_txt;  
                                                }
                        
                                                
                                        })
                                        .catch(showHttpError);   
                                    } 
                                                  

                                }
        
                        })
                        .catch(showHttpError);   
                }
                  
        }

        function exportToPA() {

            let btn = document.getElementById('PA_EXPORT');
            btn.disabled = true;
            let btn_txt = btn.value;
            btn.value = 'WRITING';
            let scenario = scenariomgr.getSelectedScenario();
            
            let prefix = config.mapping.output.prefix;
            if (prefix === undefined)
                    prefix = '_';
    
            let nCubes = Object.keys(config.mapping.output.cubes).length;
    
            for (let t in config.mapping.output.cubes)  {
                    let tableId = t;
    
                    var csv = scenario.getTableAsCSV(tableId);
                    let adddummy = ('adddummy' in config.mapping.output.cubes[t]);
                    axios({
                            method: 'put',
                            url: './api/pa/cube/'+prefix+tableId+'?version='+config.mapping.output.version+'&adddummy='+adddummy+'&workspace='+scenariomgr.workspace,
                            data: {csv:csv},
                            responseType:'json'
                    }).then(function(response) {
                            console.log('Created cube ' + prefix + tableId );
    
                            nCubes--;
                            if (nCubes==0) {                
                                scenariogrid.redraw();

                                btn.disabled = false;
                                btn.value = btn_txt;  
                            }
                                    
                    }).catch(showHttpError);
    
            }
        }

        let pacfg = { 
            id: 'pa',
            x: x,
            y: y,
            width: width,
            height: height,
            title: "Planning Analytics",
            innerHTML: '<input type="button" value="IMPORT FROM PA" id="PA_IMPORT"/><input type="button" value="EXPORT TO PA" id="PA_EXPORT"/>',
        }

        this.addWidget(pacfg);

        
        document.getElementById("PA_IMPORT").onclick = importFromPA;
        document.getElementById("PA_EXPORT").onclick = exportToPA;
    }


    
    addTableWidget(tableId, tableConfig=undefined, x = 0, y = 0, width = 6, height = 4) {
        let tableDivId = tableId + '_table_div';
        let scenarioManager = this.scenarioManager;

        if (tableConfig == undefined)
            tableConfig =  this.scenarioManager.config[tableId];

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
        let widget = this.addTablesWidget('Inputs', 'input', undefined, x, y, width, height);
         if (forceDisplay)
            this.redrawWidget(widget.id)
    }

    addOutputsWidget(x = 0, y = 0, width = 6, height = 4, forceDisplay=false) {
        let widget = this.addTablesWidget('Outputs', 'output', undefined, x, y, width, height);
         if (forceDisplay)
            this.redrawWidget(widget.id)
    }

    addTablesWidget(title, category, order, x = 0, y = 0, width = 6, height = 4) {
        let id = title + Object.keys(this.widgets).length;
        let divId = id + '_tables_div';
        let scenarioManager = this.scenarioManager;
        let widget = { 
            id: id,
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
                if (scenario == null)
                    return;
                let reference = scenarioManager.getReferenceScenario();
                let maxTimeStamp = scenario.getTimeStamp();
                if (reference != undefined)
                    maxTimeStamp = Math.max(maxTimeStamp, reference.getTimeStamp());
                if (scenario==this.lastScenario && reference==this.lastReference && this.timeStamp>=maxTimeStamp)
                    return;
                showAsGoogleTables(scenario, divId, category, order, scenarioManager.config);
                this.lastScenario = scenario;
                this.lastReference = reference;
                this.timeStamp = maxTimeStamp;
            }
        }   

        this.addWidget(widget);
        return widget;
    }

    redrawWidget(id) {
        try {
            let widgets = this.widgets;
            if ('cb' in widgets[id]) 
                (widgets[id].cb)();
        }
        catch(err) {
          console.error('Error redrawing widget' + id);
          console.error(err);
        }
    }


    redraw() {
        let widgets = this.widgets;
        for (let w in widgets) 
            this.redrawWidget(w);        
    }

    init() {
     
    }
}
