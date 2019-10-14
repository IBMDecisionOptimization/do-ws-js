
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
        let actionsHTML = ''
        actionsHTML += '<table style="float:right"><tr><td style="background:#e5e5e5">'
        actionsHTML += '\
            <img src="./do-ws-js/images/scenarios-32.png" title="Manage Scenarios" class="scenario-grid-action" onclick="scenariogrid.addScenarioWidget(undefined,0,0,2,2,true)"/> \
            <img src="./do-ws-js/images/gears-32.png" title="Solve Scenarios" class="scenario-grid-action" onclick="scenariogrid.addSolveWidget()"/> \
            <img src="./do-ws-js/images/inputs-32.png" title="Inputs" class="scenario-grid-action" onclick="scenariogrid.addInputsWidget(0,0,6,4,true)"/> \
            <img src="./do-ws-js/images/outputs-32.png" title="Outputs" class="scenario-grid-action" onclick="scenariogrid.addOutputsWidget(0,0,6,4,true)"/>'

        actionsHTML += '</td><td style="width:20px"></td><td style="background:#ffe8aa">'

        actionsHTML += '<img src="./do-ws-js/images/list-32.png" title="Scenario List" class="scenario-grid-action" onclick="scenariogrid.addScenarioListWidget()"/> \
            <img src="./do-ws-js/images/bar-chart-32.png" title="Scenario Chart" class="scenario-grid-action" onclick="scenariogrid.addScenarioChartWidget()"/> \
            <img src="./do-ws-js/images/sensitivity-run-32.png" title="Sensitivity Run" class="scenario-grid-action" onclick="scenariogrid.addSensitivityRunWidget()"/> \
            <img src="./do-ws-js/images/hurricane-32.png" title="Sensitivity Chart" class="scenario-grid-action" onclick="scenariogrid.addSensitivityChartWidget()"/>';

        actionsHTML += '</td><td style="width:20px"></td><td style="background:#e5efff">'

        actionsHTML +='<img src="./do-ws-js/images/eraser-32.png" title"Remove All" class="scenario-grid-action" onclick="scenariogrid.removeAll()"/>';
        actionsHTML +='<img src="./do-ws-js/images/gear-32.png" title"Configuration" class="scenario-grid-action" onclick="scenariogrid.swapConfiguration()"/>';
        if (config.enableImport) 
            actionsHTML = actionsHTML +
                '<img src="./do-ws-js/images/import-32.png" title="Import" class="scenario-grid-action" onclick="scenariogrid.switchVisibleImport()"/>';
        actionsHTML += '</td></tr></table>'
        // actionsHTML += '</p>';    
        headerDiv.innerHTML = '<span id="mytitle">' + title + '</span>' + actionsHTML;
        div.appendChild(headerDiv);

     

        if (config.enableImport) {
            let importDivHTML = '<div style="font-size:50%">' + getImportHTML(workspace) + '</div>';
            let importDiv = document.createElement('div');
            importDiv.initDone = false;
            importDiv.innerHTML = importDivHTML;
            headerDiv.appendChild(importDiv);
          
        }

        div.innerHTML = div.innerHTML + getProgressHTML();

        div.innerHTML = div.innerHTML + '<div id="configDiv"></div>';

        div.innerHTML = div.innerHTML + '<div id="' +this.gridDivId +'" class="grid-stack"></div>';      
        this.hideConfiguration();
        hideProgress();
         
        var options = {
            // verticalMargin: 5
            float: true,
            handle: '.grid-title'
        };
        $('#'+this.gridDivId).gridstack(options).on('gsresizestop', function(event, elem) {
            console.log('Widget ' +elem.id + ' end resize' );
            scenariogrid.widgets[elem.id].timeStamp = 0;
            scenariogrid.redrawWidget(elem.id);
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

    setTitle(title) {
        document.getElementById('mytitle').innerHTML = title
    }      
    
    hideConfiguration() {
        let configDiv = document.getElementById("configDiv");
        configDiv.style.display = "none";
        configDiv.style.height = "0px";

        this.scenarioManager.config = config.scenario.config;


        document.getElementById(this.gridDivId).style.display = "block";
    }

    showConfiguration() {
        let configDiv = document.getElementById("configDiv");
        configDiv.style.display = "block";
        configDiv.style.height = "550px";

        config.scenario.config = this.scenarioManager.config;
        config.ui.widgets = this.stringifyWidgets();
        config.ui.title =  document.getElementById('mytitle').innerHTML

        showAsConfig('configDiv', config);

        document.getElementById(this.gridDivId).style.display = "none";
    }

    swapConfiguration() {
        let configDiv = document.getElementById("configDiv");
        if (configDiv.style.display == "block")
            this.hideConfiguration();
        else
            this.showConfiguration();

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
            info += 'scenariogrid.addVegaWidget("'+widget.id+'", "'+widget.title+'", "'+widget.container+'", "'+widget.tableName+'", '+widget.id+'cfg, '+widget.x+', '+widget.y+', '+widget.width+', '+widget.height+');'
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

    addVegaWidget(id, title, container, tableId, vegaconfig, x=0, y=0, width=2, height=2, ) {
        let divId = id + '_div';

        let scenarioManager = this.scenarioManager;

        function myvegacb() {
            let scenarios = [scenarioManager.getSelectedScenario()];
        
            if (container.constructor == Array) {
                scenarios = [];
                for (let s in container) {
                    let scenarioId = container[s];
                    if (scenarioId in scenariomgr.scenarios)
                        scenarios.push(scenariomgr.scenarios[scenarioId]);
                }
            } else {
                if (container == '*') 
                    scenarios = scenariomgr.scenarios;
                else if (container.startsWith('/')) {
                    var patt = new RegExp(container.split('/') [1], container.split('/') [2]);
                    for (let s in scenariomgr.scenarios) {
                        let scenario = scenariomgr.scenarios[s];
                        if (patt.test(scenario.getName()))
                            scenarios.push(scenario);
                    }
                }
            }

            let vegadiv = document.getElementById(divId);
            let vw = vegadiv.parentNode.clientWidth-200;
            let vh = vegadiv.parentNode.clientHeight-80;
            let scalew = 1;
            let scaleh = 1;
            if ('column' in vegaconfig.encoding)
                scalew = 5; // TODO HACK 
            if ('row' in vegaconfig.encoding)
                scaleh = 5; // TODO HACK 
                
            vegaconfig.width = vw/scalew;
            vegaconfig.height = vh/scaleh;
        
            vegalitechart2(divId, scenarios, tableId, vegaconfig)
        }

        
        let wcfg = { 
            id: id,
            type: 'vega',
            x: x,
            y: y,
            width: width,
            height: height,
            title: title,
            innerHTML: '<div style="width:100%; height: calc(100% - 50px); overflow: auto;">\
                            <div id="' +divId+ '" style=""></div>\
                        </div>',
            vegacfg: vegaconfig,
            tableId: tableId,
            cb: myvegacb
        }


        this.addWidget(wcfg);

    }

    addTextWidget(id, title, html, x=0, y=0, width=2, height=2, style=undefined) {
        let divId = id + '_div';

        function stylecb() {
            let div = document.getElementById(id+'_content_div');
            for (let s in style)
                div.style[s] = style[s];
        }
        
        
        let cfg = { 
            type: 'text',
            id: id,
            x: x,
            y: y,
            width: width,
            height: height,
            title: title,
            html: html,
            style: style,
            innerHTML: '<div id="' + divId + '" style="width:100%; height: calc(100% - 50px); overflow: auto;">'+
                            html +
                        '</div>',
            cb: stylecb
        }


        this.addWidget(cfg);

    }

    addCustomWidget(id, widget, useReference = false, useAll = false) {

        let scenarioManager = this.scenarioManager;

        widget.type = 'custom';
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
            } else if (useAll) {
                widget.nbScenarios= 0;
                widget.timeStamp= 0;
                widget.originalcb = widget.cb;
                widget.cb= function() {           
                    let maxTimeStamp = scenarioManager.getScenariosMaxTimeStamp();
                    if ( (this.nbScenarios == scenarioManager.getNbScenarios()) &&
                        (this.timeStamp >= maxTimeStamp) )
                        return;
                    (this.originalcb)();
                    this.nbScenarios = scenarioManager.getNbScenarios();
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
            type: 'scenario',
            x: x,
            y: y,
            width: width,
            height: height,
            title: "Scenario Explorer",
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

    addScenarioListWidget(cfg ={}, cb=undefined, x=0, y=0, width=12, height=4, forceDisplay=true) {
        let id = "scenario_list_" + Object.keys(this.widgets).length; 
        let divId = id + '_div';
        let scenarioManager = this.scenarioManager;

        if (cb == undefined) {
            cb = function () {
                scenariogrid.redraw();
            }
        }
        let scenarioscfg = { 
            type: 'scenario-list',
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
                showAsScenarioList(scenarioManager, divId, cb, cfg);
                this.nbScenarios = scenarioManager.getNbScenarios();
                this.timeStamp = maxTimeStamp;                
            }
        }

        this.addWidget(scenarioscfg);
        if (forceDisplay)
            this.redrawWidget(id)
    }

    addScenarioChartWidget(cfg={}, cb=undefined, x=0, y=0, width=12, height=6, forceDisplay=true) {
        let id = "scenario_chart_" + Object.keys(this.widgets).length; 
        let divId = id + '_div';
        let scenarioManager = this.scenarioManager;

        if (cb == undefined) {
            cb = function () {
                scenariogrid.redraw();
            }
        }
        let scenarioscfg = { 
            type: 'scenario-chart',
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
                showAsScenarioChart(scenarioManager, divId, cb, cfg);
                this.nbScenarios = scenarioManager.getNbScenarios();
                this.timeStamp = maxTimeStamp;
            }
        }

        this.addWidget(scenarioscfg);
        if (forceDisplay)
            this.redrawWidget(id)
        return scenarioscfg;
    }

                
    addSensitivityRunWidget(cfg={}, cb=undefined, x=undefined, y=undefined, width=12, height=6, forceDisplay=true) {
        let id = "sensitivity_run_" + Object.keys(this.widgets).length; 
        let divId = id + '_div';
        let scenarioManager = this.scenarioManager;

        let sensitivitycfg = { 
            type: 'sensitivity-run',
            id: id,
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
                showAsSensitivityRun(scenario, divId, cb, cfg);            
                this.nbScenarios = scenarioManager.getNbScenarios();
                this.timeStamp = maxTimeStamp;
                this.lastScenario = scenario;
                this.lastReference = reference;
            }
        }

        this.addWidget(sensitivitycfg);
        if (forceDisplay)
            this.redrawWidget(id)
    }

    addSensitivityChartWidget(cfg={}, cb=undefined, x=0, y=0, width=12, height=6, forceDisplay=true) {
        let id = "sensitivity_chart_" + Object.keys(this.widgets).length; 
        let divId = id + '_div';
        let scenarioManager = this.scenarioManager;

        let sensitivitycfg = { 
            type: 'sensitivity-chart',
            id: id,
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
                showAsSensitivityChart(scenarioManager, divId, cb, cfg);
                this.nbScenarios = scenarioManager.getNbScenarios();
                this.timeStamp = maxTimeStamp;
            }
        }

        this.addWidget(sensitivitycfg);
        if (forceDisplay)
            this.redrawWidget(id)
    }
    addKPIsWidget(x = 2, y = 0, width = 10, height = 5) {
        let divId = 'kpis_chart_div';
        let scenarioManager = this.scenarioManager;
        let kpiscfg = { 
            type: 'kpis',
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

    switchVisibleImport() {        
        switchVisibleImport(this.scenarioManager.workspace);
    }

    

    dodefaultdashboard() {
        
        let nScenarios= this.scenarioManager.getNbScenarios();

        let h = 0;
        if (nScenarios > 3) {
            this.addScenarioListWidget({}, undefined, 0, 0, 12, 4)
            let scenarioChartWidget = this.addScenarioChartWidget({}, undefined, 0, 4, 12, 6);
            scenarioChartWidget.timeStamp = 0; // to force redisplay later!
            this.addSensitivityChartWidget({}, undefined, 0, 10, 12, 6, false)
            h = 16;
        }

        this.addScenarioWidget(undefined, 0, h, 2, 3);
        this.addSolveWidget({x:0, y:h+3});
        this.addKPIsWidget(2, h);
        this.addInputsWidget(0, h+5);
        this.addOutputsWidget(6, h+5);

        if (this.scenarioManager.getSelectedScenario()!= undefined) {
            if ('explanations' in this.scenarioManager.getSelectedScenario().tables) {
                let expcfg = {title:'Explanations', category:'output'};
                this.addTableWidget('explanations', expcfg, 0, h+9, 12, 3);
            }
            if ('constraints' in this.scenarioManager.getSelectedScenario().tables) {
                this.addConstraintWidget(undefined, 0, h+12, 12, 3);
            }
        }
    }

    doimportdashboard(projectName, projectId, modelName) {
        let scenariogrid = this;

        let workspace = this.scenarioManager.workspace;

        if (Object.keys(this.widgets).length == 0)
            this.dodefaultdashboard();

        let minY = 0;
        for (let w in this.widgets) 
            minY = Math.max(minY, this.widgets[w].y + this.widgets[w].height)

        let url = '/api/ws/domodel/data?projectName=' + projectName + '&workspace=' + workspace;
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

                        console.log(JSON.stringify(props.data))

                        let vegacfg = {
                                // "width" : vw,
                                width: props.spec.width,
                                // "height" : vh,
                                height: props.spec.height
                        }
                        vegacfg.mark = props.spec.mark;
                        vegacfg.encoding = props.spec.encoding;

                        console.log(JSON.stringify(vegacfg))

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

                            vegalitechart2(divId, scenarios, tableName, vegacfg)
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
                        let wcfg = { 
                            id: id,
                            type: 'vega',
                            x: x,
                            y: y,
                            width: width,
                            height: height,
                            title: widget.name,
                            innerHTML: '<div style="width:100%; height: calc(100% - 50px); overflow: auto;">\
                                            <div id="'+divId+'" style=""></div>\
                                        </div>',
                            cb: myvegacb,
                            container: props.container, 
                            tableId: props.data,
                            vegacfg: vegacfg
                        }

                        if ( (wcfg.title == undefined) ||
                            (wcfg.title == '') )
                            wcfg.title = props.data;
                    
                        scenariogrid.addWidget(wcfg);
                        scenariogrid.redrawWidget(id);
                    }

                }
            }
        })
        //.catch(showHttpError);     
    }
    
    

    addSolveWidget(solvecfg = undefined) {
        
        let scenariogrid = this;
        let scenarioManager = this.scenarioManager;        
        
        if (solvecfg == undefined)
        solvecfg = {}
            
        if (!('dokey' in solvecfg))
            solvecfg.dokey = 'do';
        let dokey = solvecfg.dokey;
                  
        if (!('id' in solvecfg))
            solvecfg.id = "SOLVE_" + Object.keys(this.widgets).length; 
        let id = solvecfg.id;

        if (!('type' in solvecfg))
            solvecfg.type = 'solve';

        if (!('title' in solvecfg))
            solvecfg.title = 'Optimization';

        if (!('height' in solvecfg))
            solvecfg.height = 2;

        if (!('width' in solvecfg))
            solvecfg.width = 2;


        let divId = id + '_div';
        let btn_name = "SOLVE_BTN_" + Object.keys(this.widgets).length; 
        let btn_value = 'SOLVE';
        if ( (dokey in config && 'action' in config[dokey]) && ('text' in config[dokey].action) )
            btn_value = config[dokey].action.text;


        solvecfg.innerHTML= '<div id="' + divId + '"></div>';

        function initOptim(dodeploy=false) {
            console.log("Init Optim...");
            axios({
                    method:'get',
                    url:'./api/optim/config?workspace='+scenariomgr.workspace+'&dodeploy='+(dodeploy?'true':'false')+'&dokey='+dokey,
                    responseType:'text'
                })
            .then(function (response) {
                if (response.data.status == "OK") {         
                    console.log("Init Optim: " + response.data.status + " (" + response.data.type + ")");
                    document.getElementById(btn_name).value = btn_value;
                    document.getElementById(btn_name).disabled = false;    
                } else {
                    console.error("Error with Init Optim: " + response.data.status);
                    document.getElementById(btn_name).value = 'NO SOLVE';
                    document.getElementById(btn_name).disabled = true;
                }
            })
            .catch(showHttpError);     
        }

        function showSolve(divId) {
            let div = document.getElementById(divId);
            div.innerHTML = '';
            let actionsDiv = document.createElement('div');
            let actionsHTML = ''
            actionsHTML += '<table width="100%" class="scenario-selector-title" style="float:right"><tr>';

            actionsHTML += '<td style="width:50px">';
            if ((dokey in config) && ('type' in config[dokey]))
                actionsHTML += '(' + config[dokey].type.toUpperCase() + ')';
            else if (!('do' in config))
                actionsHTML += '(none)';
            else
                actionsHTML += '(default)';
            actionsHTML
            actionsHTML += '</td>';
            
            if ((dokey in config) && ('type' in config[dokey]) && (config[dokey].type.toUpperCase() =='WML')) {
                actionsHTML += '<td style="width:20px; background:#f9c5c5"><center>';
                actionsHTML += '<img src="./do-ws-js/images/deploy-16.png" id="' + id + '_DEPLOY" title="Deploy" class="scenario-selector-action"/>';
                actionsHTML += '<img src="./do-ws-js/images/gear-16.png" id="' + id + '_CONFIG_SOLVE" title="Configurations" class="scenario-selector-action"/>';
                actionsHTML += '</center></td>';
            }

            
            actionsHTML += '</tr></table>'

            actionsDiv.innerHTML = actionsHTML;
            actionsDiv.style['padding-bottom']= '20px';

            div.appendChild(actionsDiv);

            let contentDiv = document.createElement('div');

            let html = '<input type="button" value="' + btn_value + '" id="'+btn_name+'"/>';

            html += '<div id="'+id+'_CONFIG_DIV"><div id="'+id+'_CONFIG_DIV_DEPLOYED_MODELS"></div><div id="'+id+'_CONFIG_DIV_DEPLOYMENTS"></div></div>';

            contentDiv.innerHTML = html;
            contentDiv.style['padding-top']= '20px';
            div.appendChild(contentDiv);

            let configDiv = document.getElementById(id+'_CONFIG_DIV');
            configDiv.style.display = 'none';
        

            if ((dokey in config) && ('type' in config[dokey]) && (config[dokey].type.toUpperCase() =='WML')) {
                document.getElementById(id+"_CONFIG_SOLVE").onclick = function()
                {
                    let configDiv = document.getElementById(id+'_CONFIG_DIV');
                    if (configDiv.style.display == 'none') {
                        configDiv.style.display = 'block';
                        getSolveDeployedModels(workspace, dokey, id+'_CONFIG_DIV_DEPLOYED_MODELS');
                        getSolveDeployments(workspace, dokey, id+'_CONFIG_DIV_DEPLOYMENTS');
                    } else
                        configDiv.style.display = 'none';   
                };

                document.getElementById(id+"_DEPLOY").onclick = function()
                {
                    initOptim(true);
                }
            }
        }
        
       
        this.addWidget(solvecfg);
        showSolve(divId);

        document.getElementById(btn_name).disabled = true;

        document.getElementById(btn_name).onclick = function () { 
            let scenario = scenariomgr.getSelectedScenario();
            let btn = document.getElementById(btn_name)
            let btn_txt = btn.value;
            scenario.solve(dokey,
                function (status) {
                    btn.disabled = true;
                    btn.value = status;  
                }, function () { 
                    btn.disabled = false;
                    btn.value = btn_txt;  
                    scenariogrid.redraw(scenario); 
                });
        };

        initOptim();
    }

    addScoreWidget(scorecfg = undefined) {
        
        let scenariomgr = this.scenarioManager;          

        if (scorecfg == undefined)
            scorecfg = {}
            
        if (!('mlkey' in scorecfg))
            scorecfg.mlkey = 'ml';
        let mlkey = scorecfg.mlkey;
                  
        if (!('id' in scorecfg))
            scorecfg.id = "SCORE_" + Object.keys(this.widgets).length; 
        let id = scorecfg.id;

        if (!('type' in scorecfg))
            scorecfg.type = 'score';

        if (!('title' in scorecfg))
            scorecfg.title = 'Machine Learning';

        if (!('height' in scorecfg))
            scorecfg.height = 2;

        if (!('width' in scorecfg))
            scorecfg.width = 2;

        let btn_name = "SCORE_BTN_" + Object.keys(this.widgets).length; 
        let btn_value = 'SCORE';
        if ( (mlkey in config) && ('action' in config[mlkey]) && ('text' in config[mlkey].action) )
            btn_value = config[mlkey].action.text;

        scorecfg.innerHTML= '<input type="button" value="'+btn_value+'" id="'+btn_name+'"/>';

        this.addWidget(scorecfg);

        
        document.getElementById(btn_name).onclick = function () {
            let scenario = scenariomgr.getSelectedScenario();
            let btn = document.getElementById(btn_name)
            let btn_txt = btn.value;
            scenario.score(mlkey,
                function (status) {
                    btn.disabled = true;
                    btn.value = status;  
                }, function () { 
                    btn.disabled = false;
                    btn.value = btn_txt;  
                    scenariogrid.redraw(scenario); 
                });
        };
    }

    addFlowWidget(flowcfg = undefined) {
        
        let scenariomgr = this.scenarioManager;          

        if (flowcfg == undefined)
        flowcfg = {}
            
        if (!('key' in flowcfg))
            flowcfg.key = 'flow';
        let key = flowcfg.key;
                  
        if (!('id' in flowcfg))
            flowcfg.id = "SCORE_" + Object.keys(this.widgets).length; 
        let id = flowcfg.id;

        if (!('type' in flowcfg))
            flowcfg.type = 'flow';

        if (!('title' in flowcfg))
            flowcfg.title = 'Flow';

        if (!('height' in flowcfg))
            flowcfg.height = 2;

        if (!('width' in flowcfg))
            flowcfg.width = 2;

        let btn_name = "FLOW_BTN_" + Object.keys(this.widgets).length; 
        let btn_value = 'FLOW';
        if ( (key in config) && ('action' in config[key]) && ('text' in config[key].action) )
            btn_value = config[key].action.text;

        function flowcb() {

            var $ = go.GraphObject.make;  // for conciseness in defining templates

            let myDiagram = $(go.Diagram, "myDiagramDiv",  // create a Diagram for the DIV HTML element
                {
                "undoManager.isEnabled": true  // enable undo & redo
                });

            // define a simple Node template
            myDiagram.nodeTemplate =
                $(go.Node, "Auto",  // the Shape will go around the TextBlock
                $(go.Shape, "RoundedRectangle", { strokeWidth: 0, fill: "white" },
                    // Shape.fill is bound to Node.data.color
                    new go.Binding("fill", "color")),
                $(go.TextBlock,
                    { margin: 8 },  // some room around the text
                    // TextBlock.text is bound to Node.data.key
                    new go.Binding("text", "key"))
                );

            // but use the default Link template, by not setting Diagram.linkTemplate

            let nodes = []
            let links = []
            
            let prev = undefined;
            for (let s in config[flowkey].steps) {
                let step = config[flowkey].steps[s];
                let color = "cyan"
                let key = step.mlkey;
                if (step.type == "do") {
                    color = "orange";
                    key = dokey;
                }
                nodes.push({key: key, color: color});
                if (prev != undefined)
                    links.push({from:prev, to:key})
                prev = key;
            }
            // create the model data that will be represented by Nodes and Links
            myDiagram.model = new go.GraphLinksModel(
                nodes,
                links);
        
        }
        flowcfg.cb = flowcb;

        flowcfg.innerHTML= '<input type="button" value="'+btn_value+'" id="'+btn_name+'"/><div id="myDiagramDiv" style="border: solid 1px black; width:400px; height:400px"></div>';

        this.addWidget(flowcfg);

        
        document.getElementById(btn_name).onclick = function () {
            let scenario = scenariomgr.getSelectedScenario();
            let btn = document.getElementById(btn_name)
            let btn_txt = btn.value;
            scenario.flow(key,
                function (status) {
                    btn.disabled = true;
                    btn.value = status;  
                }, function () { 
                    btn.disabled = false;
                    btn.value = btn_txt;  
                    scenariogrid.redraw(scenario); 
                });
        };
    }

    addActionWidget(id='action', title, cb, x = 0, y = 0, width = 2, height = 2) {           

        function doaction() {
            cb();
        }

        let actioncfg = { 
            type: 'action',
            id: id,
            x: x,
            y: y,
            width: width,
            height: height,
            title: title,
            innerHTML: '<input type="button" value="'+id+'" id="'+id+'"/>',
            //cb: solvecb
        }

        this.addWidget(actioncfg);

        
        document.getElementById(id).onclick = doaction;
    }


    addModelingAssistantWidget(x = 0, y = 0, width = 2, height = 2) {
        
        let scenariomgr = this.scenarioManager;

        let macfg = { 
            id: 'ma',
            x: x,
            y: y,
            width: width,
            height: height,
            title: "Modeling Assistant",
            innerHTML: '<div id="ma_div"></div>',
            lastScenario: "",
            timeStamp: 0,
            cb:  function() {           
                
                let scenario = scenariomgr.getSelectedScenario();
                let maxTimeStamp = scenario.getTimeStamp();
                if (  (scenario==this.lastScenario) && 
                    (this.timeStamp >= maxTimeStamp) )
                    return;
                showAsMA(scenariomgr, 'ma_div');
                this.timeStamp = maxTimeStamp;
                this.lastScenario = scenario;
            }
        }

        this.addWidget(macfg);
    }



    addPAWidget(x = 0, y = 0, width = 2, height = 2) {
        
        let scenariomgr = this.scenarioManager;

        let html = '<input type="button" value="IMPORT FROM PA" id="PA_IMPORT"/><input type="button" value="EXPORT TO PA" id="PA_EXPORT"/>';

        let allowInit = false;
        if ( ('allowInit' in config.pa.mapping) &&
            config.pa.mapping.allowInit)
            allowInit = true;

        if (allowInit) {
            html = '<input type="button" value="INIT PA" id="PA_INIT"/>' + html;
            html = '<input type="button" value="DELETE PA" id="PA_DELETE"/>' + html;
        }

        html += '<input type="button" value="OPEN PA (DEV)" id="PA_DEV"/>';
        html += '<input type="button" value="OPEN PA (DEPLOY)" id="PA_DEPLOY"/>';

        let pacfg = { 
            id: 'pa',
            type: 'pa',
            x: x,
            y: y,
            width: width,
            height: height,
            title: "Planning Analytics",
            innerHTML: html,
        }

        this.addWidget(pacfg);

        
        document.getElementById("PA_IMPORT").onclick = function () { 
            let scenario = scenariomgr.getSelectedScenario();
            let btn = document.getElementById('PA_IMPORT')
            let btn_txt = btn.value;
            scenario.importFromPA(
                function (status) {
                    btn.disabled = true;
                    btn.value = status;  
                }, function () { 
                    btn.disabled = false;
                    btn.value = btn_txt;  
                    scenariogrid.redraw(); 
                });
        };
        document.getElementById("PA_EXPORT").onclick = function () {
            let scenario = scenariomgr.getSelectedScenario();
            let btn = document.getElementById('PA_EXPORT')
            let btn_txt = btn.value;
            scenario.exportToPA(function (status) {
                    btn.disabled = true;
                    btn.value = status;  
                }, function () {
                    btn.disabled = false;
                    btn.value = btn_txt;  
                    scenariogrid.redraw(); 
                });
        };

        if (allowInit) {
            document.getElementById("PA_INIT").onclick = function () {
                let scenario = scenariomgr.getSelectedScenario();
                let btn = document.getElementById('PA_INIT')
                let btn_txt = btn.value;
                scenario.initPA(function (status) {
                        btn.disabled = true;
                        btn.value = status;  
                    }, function () {
                        btn.disabled = false;
                        btn.value = btn_txt;  
                        scenariogrid.redraw(); 
                    });
            };
            document.getElementById("PA_DELETE").onclick = function () {
                let scenario = scenariomgr.getSelectedScenario();
                let btn = document.getElementById('PA_DELETE')
                let btn_txt = btn.value;
                scenario.deletePA(function (status) {
                        btn.disabled = true;
                        btn.value = status;  
                    }, function () {
                        btn.disabled = false;
                        btn.value = btn_txt;  
                        scenariogrid.redraw(); 
                    });
            };
        }

        document.getElementById("PA_DEV").onclick = function () {
            let url = 'dev/?workspace='  + workspace;
            var win = window.open(url, '_blank');
            win.focus();
        }

        document.getElementById("PA_DEPLOY").onclick = function () {
            let url = 'deploy/?workspace='  + workspace;
            var win = window.open(url, '_blank');
            win.focus();            
        }

    }


    
    addTableWidget(tableId, tableConfig=undefined, x = 0, y = 0, width = 6, height = 4) {
        let tableDivId = tableId + '_table_div';
        let scenarioManager = this.scenarioManager;

        if (tableConfig == undefined)
            tableConfig =  this.scenarioManager.config[tableId];
        if (tableConfig == undefined)
            tableConfig = {}

        tableConfig.sortAscending = true;
        tableConfig.sortColumn = 0;
        tableConfig.showRowNumber = false;
        tableConfig.width = '100%';
        tableConfig.height = '100%';

        let title = tableConfig.title;
        if (title == undefined)
            title = tableId;
            
        let tablecfg = { 
            type: 'table',
            id: tableId,
            tableId: tableId,
            x: x,
            y: y,
            width: width,
            height: height,
            title: title,        
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
            type: 'tables',
            id: id,
            category: category,
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

    init(widgets) {
        for (let w in widgets) {
            let widget = widgets[w];
            if (widget.type == 'scenario')
                this.addScenarioWidget(undefined, widget.x, widget.y, widget.width, widget.height)
            if (widget.type == 'solve')
                this.addSolveWidget(widget)
            if (widget.type == 'score')
                this.addScoreWidget(widget)
            if (widget.type == 'vega')
                this.addVegaWidget(widget.id, widget.title, widget.container, widget.tableId, widget.vegacfg, widget.x, widget.y, widget.width, widget.height)
            if (widget.type == 'kpis')
                this.addKPIsWidget(widget.x, widget.y, widget.width, widget.height)
            if (widget.type == 'table')
                this.addTableWidget(widget.tableId, {}, widget.x, widget.y, widget.width, widget.height)
            if (widget.type == 'tables')
                this.addTablesWidget(widget.title, widget.category, widget.order, widget.x, widget.y, widget.width, widget.height)
            if (widget.type == 'text')
                this.addTextWidget(widget.id, widget.title, widget.html, widget.x, widget.y, widget.width, widget.height, widget.style)
            if (widget.type == 'scenario-list')
                this.addScenarioListWidget(widget.cfg, undefined, widget.x, widget.y, widget.width, widget.height)
            if (widget.type == 'scenario-chart')
                this.addScenarioChartWidget(widget.cfg, undefined, widget.x, widget.y, widget.width, widget.height)
            if (widget.type == 'sensitivity-chart')
                this.addSensitivityChartWidget(widget.cfg, undefined, widget.x, widget.y, widget.width, widget.height)
            if (widget.type == 'sensitivity-run')
                this.addSensitivityRunWidget(widget.cfg, undefined, widget.x, widget.y, widget.width, widget.height)
            if (widget.type == 'pa')
                this.addPAWidget(widget.x, widget.y, widget.width, widget.height)
        }
     
    }
    stringifyWidgets() {
        let json = {}
        for (let w in this.widgets) {
            json[w] = this.stringifyWidget(this.widgets[w]);
        }
        return json;
    }
    stringifyWidget(widget) {
        let json = { 
            type: widget.type,
            id: widget.id,
            title: widget.title,
            x: widget.x,
            y: widget.y,
            width: widget.width,
            height: widget.height
        };
        if (widget.type == 'vega') {
            json.container = widget.container;
            json.tableId = widget.tableId;
            json.vegacfg = widget.vegacfg;
        }
        if (widget.type == 'table') {
            json.tableId = widget.tableId;
        }
        if (widget.type == 'tables') {
            json.category = widget.category;
            json.order = widget.order;
        }
        if (widget.type == 'text') {
            json.html = widget.html;
            json.style = widget.style;
        }
        if (widget.type == 'scenario-list') {
            let divId = widget.id + '_div';
            let div = document.getElementById(divId)
            json.cfg =  div.cfg;
        }
        if (widget.type == 'scenario-chart') {
            let divId = widget.id + '_div';
            let div = document.getElementById(divId)
            json.cfg =  div.cfg;
        }
        if (widget.type == 'sensitivity-chart') {
            let divId = widget.id + '_div';
            let div = document.getElementById(divId)
            json.cfg =  div.cfg;
        }
        if (widget.type == 'sensitivity-run') {
            let divId = widget.id + '_div';
            let div = document.getElementById(divId)
            json.cfg =  div.cfg;
        }
        if (widget.type == 'pa') {
        }
        if (widget.type == 'score') {
            json.mlkey = widget.mlkey; 
        }
        return json;
    }
}
