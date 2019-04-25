

function showHttpError(error) {
    if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.log(error.response.data);
            console.log(error.response.status);
            console.log(error.response.headers);
    } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            console.log(error.request);
   } else {
            // Something happened in setting up the request that triggered an Error
            console.log('Error', error.message);
    }
    console.log(error.config);
}



function doRenameScenario(btn) {
    let oldName = btn.data.scenario.name;
    let newName = btn.data.input.value;

    //alert('Change name from ' + oldName + ' to ' + newName);
    btn.data.scenariomgr.renameScenario(oldName, newName);    
}
function cancelRenameScenario(btn) {
    btn.data.scenariomgr.showAsSelector(btn.data.divId, btn.data.container.cb);
}
function myRenameScenario(scenariomgr, scenario, container, divId) {
    container.innerHTML = "";

    var txt = document.createTextNode('New name : ');
    container.appendChild(txt);
    var input = document.createElement("input");
    input.type = "text";
    input.name = 'name';
    input.value = scenario.name;

    container.appendChild(input);
    var br = document.createElement("br");
    container.appendChild(br);

    var cancel = document.createElement('button');
    cancel.text = "CANCEL";
    cancel.value = "CANCEL";
    cancel.innerHTML = "CANCEL";
    cancel.data = {}
    cancel.data.scenariomgr = scenariomgr;
    cancel.data.scenario = scenario;
    cancel.data.container = container;
    cancel.data.divId = divId;    
    cancel.data.input = input
    cancel.addEventListener('click', function () {cancelRenameScenario(this)});
    container.appendChild(cancel);

    var btn = document.createElement('button');
    btn.text = "CHANGE";
    btn.value = "CHANGE";
    btn.innerHTML = "CHANGE";
    btn.data = {}
    btn.data.scenariomgr = scenariomgr;
    btn.data.scenario = scenario;
    btn.data.container = container;
    btn.data.divId = divId;    
    btn.data.input = input
    btn.addEventListener('click', function () {doRenameScenario(this)});
    container.appendChild(btn);
}
class Scenario {

    constructor(mgr, name) {
        this.name = name;
        this.mgr = mgr;
        this.tables = {}
        this.updateTimeStamp();
      }

    updateTimeStamp() {
        this.timeStamp = Date.now();
        return this.timeStamp;
    }
    getTimeStamp() {
        return this.timeStamp;
    }
    getName() {
        return this.name;
    }
    addTable(tableId, category, cols, config) {
        var table = {
            "category" : category,
            "cols" : cols,
            "rows" : {},
            "cb" : config.cb,
            "id" : config.id,
            "timeStamp" : this.updateTimeStamp()
        }
        this.tables[tableId] = table;
        if (table.cb != undefined)
            table.cb(this);
    }
    addTableFromCSV(tableId, csv, category, config = {}) {      
                
        var lines = csv.split(/\r?\n/);
        var nlines = lines.length
        var cols = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        var ncols = cols.length;
        for (var c=0; c<ncols; c++) {
            let col = cols[c];
            if (col[0] == "\"" && col[col.length-1] == "\"") {
                col = col.substring(1, col.length-1);
                cols[c] = col;
            }
        }
        var rows = {};
        for (var i = 1; i < nlines; i++) {
                let l = lines[i]
                if (l == "")
                    continue;
                let vals = l.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                let elt = {}
                for (var c=0; c<ncols; c++) {
                    let val = vals[c];
                    if (val[0] == "\"" && val[val.length-1] == "\"") {
                        val = val.substring(1, val.length-1);
                        
                    }
                    elt[cols[c]] = val;
                }
                let idx = i;
                if ( (config.id != undefined) && (config.id in elt) )
                    idx = elt[config.id];
                rows[idx] = elt;
        }

        var table = {
            "category" : category,
            "cols" : cols,
            "rows" : rows,
            "cb" : config.cb,
            "id" : config.id,
            "timeStamp" : this.updateTimeStamp()
        }

        this.tables[tableId] = table;

        // save config in scenario manager if not exist
        if (!(tableId in this.mgr.config))
            this.mgr.config[tableId] = config;
            
        // Look for id
        if (!('id' in config)) 
             this.lookForId(tableId);                     

        if (table.cb != undefined)
            table.cb(this);
    }

    addTableFromRows(tableId, orows, category, config = {}) {

        var cols = orows[0].values;
        for (c in cols)
            cols[c] = cols[c].replace(/['"]+/g, '');
        var ncols = cols.length;
        var rows = {};
        var nlines = orows.length;
        for (var i = 1; i < nlines; i++) {
            var elt = {}
            var vals = orows[i].values;
            for (var c=0; c<ncols; c++){
                let val = vals[c]
                if (val == undefined){
                  elt = undefined;
                }
				else {
                    if (typeof(val) == 'string')
                        val = val.replace(/['"]+/g, '');
                    elt[cols[c]] = String(val);
                }
              }
            if (elt != undefined){
                let idx = i;
                if (config.id != undefined)
                    idx = elt[config.id];
                rows[idx] = elt;
          }
        }
        var table = {
            "category" : category,
            "cols" : cols,
            "rows" : rows,
            "cb" : config.cb,
            "id" : config.id,
            "timeStamp" : this.updateTimeStamp()
        }

        this.tables[tableId] = table;

        // save config in scenario manager if not exist
        if (!(tableId in this.mgr.config))
            this.mgr.config[tableId] = config;

        // Look for id
        if (!('id' in config)) 
             this.lookForId(tableId);            

        if (table.cb != undefined)
            table.cb(this);
    }

    lookForId(tableId) {
        // only try first one for now
        let ids = {}
        let rows = this.tables[tableId].rows;
        let cols = this.tables[tableId].cols;
        for (let r in rows) {
            let id  = rows[r][cols[0]];
            if (id in ids)
                return;
            ids[id] = rows;
        }
        let newid = cols[0];
        let newrows = {}
        for (let r in rows) {
            newrows[rows[r][newid]] = rows[r];
        }
        this.tables[tableId].rows = newrows;
        this.mgr.config[tableId].id = newid;
    }

    addRowToTable(tableId, rowId, row) {
        let table = this.tables[tableId];
        table.rows[rowId] = row;
        table.timeStamp = this.updateTimeStamp();
        if (table.cb != undefined)
            table.cb(this);
    }

    contains(id) {
        return (id in this.tables);
    }
    getTableRows(id) {
        return this.tables[id].rows;
    }

    getTableCols(id) {
        return this.tables[id].cols;
    }

    getTableAsCSV(id) {
        var cols = this.tables[id].cols;
        var rows = this.tables[id].rows;
        var csv = cols.join(",") + "\n";
        for (var r in rows) {
                let row = rows[r];
                let vals = [];
                for (var c in cols) {
                    let val = "" + row[cols[c]];
                    if (val.indexOf(",") != -1)
                        val = "\"" + val + "\"";
                    vals.push(val);
                }
                csv = csv + vals.join(",") + "\n";
        }
        return csv;
    }

    getInputTables() {
        var ids = []
        for (let id in this.tables)
            if (this.tables[id].category == 'input')
                ids.push(id);
        return ids;
    }

    getOutputTables() {
        var ids = []
        for (let id in this.tables)
            if (this.tables[id].category == 'output')
                ids.push(id);
        return ids;
    }

    showAsTable(tableId, divId, config) {
        let div = document.getElementById(divId)
        let html = "<table width='100%'>";


        let cols = this.getTableCols(tableId)
        html = html + "<tr>";
        for (let c in cols)
            html = html + "<td>" + cols[c] + "</td>";
        html = html + "<tr>";
        let rows = this.getTableRows(tableId);
        for (let o in rows) {
            html = html + "<tr>";
            let row  = rows[o];
            let vals = [];
            for (let c in cols)
                html = html + "<td>" + row[cols[c]] + "</td>";
            html = html + "</tr>";
        }
        html = html + "</table>";

        div.innerHTML = html;
    }
    
    duplicate() {
        var copy = new Scenario(this.mgr, "Copy of " + this.name);
        copy.tables = JSON.parse(JSON.stringify( this.tables ));
        for (let table in this.tables)
            copy.tables[table].cb = this.tables[table].cb;
        return copy;
    }
    load_table(tableId, category = 'input', config = {}, cb = undefined) {
        let scenario = this;
        let url = "./api/scenario/" + this.name + "/" + tableId+'?workspace='+this.mgr.workspace;
        axios({
            method:'get',
            url:url,
            responseType:'text'
          })
        .then(function (response) {
            let responseData = response.data;
            scenario.addTableFromCSV(tableId, responseData, category, config);
			console.log("Loaded " +tableId + " from " + url)						
            if (cb != undefined)
                cb();
        })
        .catch(showHttpError);
    }
}

function ScenarioManagerScenarioChanged(divId) {
    let div = document.getElementById(divId);
    let e = document.getElementById(divId+'_SCENARIO_SELECTOR');
    let scName = e.options[e.selectedIndex].value;
    div.scenariomgr.setSelectedScenario(scName);
    div.scenariomgr.showAsSelector(divId, div.cb)
    div.cb();
}

function ScenarioManagerReferenceChanged(divId) {
    let div = document.getElementById(divId);
    let e = document.getElementById('REFERENCE_SELECTOR');
    let scName = e.options[e.selectedIndex].value;
    div.scenariomgr.setReferenceScenario(scName);
    div.scenariomgr.showAsSelector(divId, div.cb)
    div.cb();
}

class ScenarioManager {
    constructor(config=undefined, workspace="") {
        this.scenarios = {}
        this.selected = undefined;
        this.reference = undefined;
        this.selectdivid = undefined;
        this.workspace = workspace;
        this.config = config;
        if (this.config == undefined)
            this.config = {}
    }
    getNbScenarios() {
        return Object.keys(this.scenarios).length;
    }
    getScenariosMaxTimeStamp() {
        let maxTimeStamp =0;
        for (let s in this.scenarios)
            maxTimeStamp = Math.max(maxTimeStamp, this.scenarios[s].getTimeStamp())
        return maxTimeStamp;
    }
    getSelectedScenario() {
        return this.selected;
    }
    setSelectedScenario(scName, redrawdiv=false) {
        this.selected = this.scenarios[scName];
        if (redrawdiv && this.selectdivid!=undefined) {
            let div = document.getElementById(this.selectdivid);
            this.showAsSelector(this.selectdivid, div.cb)
        }
    }
    getReferenceScenario() {
        return this.reference;
    }
    setReferenceScenario(scName) {
        this.reference = this.scenarios[scName];
    }
    addScenario(scenario) {
        this.scenarios[scenario.getName()] = scenario;
        if (this.selected == undefined)
            this.selected = scenario;
    }
    getScenarios() {
        return this.scenarios
    }
    showAsSelector(divId, cb) {
        this.selectdivid = divId;
        let div = document.getElementById(divId);
        div.scenariomgr = this;
        div.cb = cb;
        let html = "Selected: <select id='"+divId+"_SCENARIO_SELECTOR' onchange='ScenarioManagerScenarioChanged(\"" + divId + "\")'>";
        for (let scenario in this.scenarios) {
            if (scenario != ".DS_Store"){
            html = html + "<option value='" + scenario + "'";
            if ((this.selected != undefined)  &&
                (this.selected.getName() == scenario))
                html = html + " selected";
            html = html +">" + scenario + "</option>";
          }
        }
        html = html + "</select>";

        html = html + "<BR>";

        html = html + '<input type="button" class="dd" value="RENAME" id="RENAME_SCENARIO"/>'
        html = html + '<input type="button" value="DUPLICATE" id="DUPLICATE_SCENARIO"/>'
        html = html + '<input type="button" value="DELETE" id="DELETE_SCENARIO"/>'
        html = html + '<input type="button" value="SAVE" id="SAVE_SCENARIO"/><br>'

        html = html + "Reference: <select id='REFERENCE_SELECTOR' onchange='ScenarioManagerReferenceChanged(\"" + divId + "\")'>";
        html = html + "<option value=''";
        if (this.reference == undefined)
            html = html + " selected";
        html = html + "></option>";
        for (let scenario in this.scenarios) {
            html = html + "<option value='" + scenario + "'";
            if ((this.reference != undefined)  &&
                (this.reference.getName() == scenario))
                html = html + " selected";
            html = html +">" + scenario + "</option>";
        }
        html = html + "</select>";

        div.innerHTML = html;


        scenariomgr = this;
        document.getElementById("DUPLICATE_SCENARIO").onclick = function()
            {
                let newScenario = scenariomgr.getSelectedScenario().duplicate();
                scenariomgr.addScenario(newScenario);
                scenariomgr.setSelectedScenario(newScenario.name);
                if (cb != undefined)
                    cb(newScenario);
                scenariomgr.showAsSelector(divId, cb);
            };

        document.getElementById("DELETE_SCENARIO").onclick = function()
            {
                scenariomgr.deleteScenario(scenariomgr.getSelectedScenario().getName());
            };            

        document.getElementById("RENAME_SCENARIO").onclick = function()
            {
                let scenario = scenariomgr.getSelectedScenario();
                myRenameScenario(scenariomgr, scenario, div, divId);
            };            

        document.getElementById("SAVE_SCENARIO").onclick = function()
            {
                scenariomgr.saveScenario(scenariomgr.getSelectedScenario());
            }
    }        

    deleteScenario(scenarioId) {
        delete scenariomgr.scenarios[scenarioId];
        if (Object.keys(scenariomgr.scenarios).length> 0)
            scenariomgr.setSelectedScenario(Object.keys(scenariomgr.scenarios)[0], true)
    }

    renameScenario(oldScenarioId, newScenarioId, cb) {
        let scenariomgr = this;
         axios({
            method: "PATCH",
            url: "./api/scenario/"+oldScenarioId+'?name='+newScenarioId+'&workspace='+this.workspace,
            data: null,
          })
        .then(function (response) {
            let wasSelected = (scenariomgr.selected.name == oldScenarioId);
            scenariomgr.scenarios[newScenarioId] = scenariomgr.scenarios[oldScenarioId];
            scenariomgr.scenarios[newScenarioId].name = newScenarioId;
            if (wasSelected)
                scenariomgr.selected = scenariomgr.scenarios[newScenarioId];            
            delete scenariomgr.scenarios[oldScenarioId];
            scenariomgr.setSelectedScenario(scenariomgr.selected.name, true)
        })
        .catch(showHttpError);

    }
    loadScenario(scenarioId) {

        let scenariomgr = this;
        let scenario = new Scenario(this, scenarioId);
        this.selected = scenario;
        this.addScenario(scenario);
        let scenariocb = this.config['$scenario'];

        let url = "./api/scenario/" + scenario.name+'?workspace='+this.workspace;

        axios({
            method:'get',
            url:url,
          })
        .then(function (response) {
            let tables = response.data;
            var ntables = Object.keys(tables).length;
            for (let tableId in tables)
                scenario.load_table(tableId, tables[tableId].category, scenariomgr.config[tableId], function () {
                    if (scenariocb!=undefined
                        && Object.keys(scenario.tables).length==ntables)
                        scenariocb.cb(scenario);
                });

        })
        //.catch(showHttpError);
    }

    newScenario(name) {
        let scenario = new Scenario(this, name);
        this.addScenario(scenario);
        if ( (this.selected == null) || (this.selected == undefined) )
            this.selected = scenario;
        return scenario;
    }
    loadScenarios()  {
        let url = './api/scenarios?workspace='+this.workspace;
        let scenariomgr = this;
        axios({
            method:'get',
            url:url,
          })
        .then(function (response) {
            let scenarios = response.data;
            console.log("scenarios " + scenarios)
            let mySelected = scenariomgr.selected
            for (let idx in scenarios) {
                let scenarioId = scenarios[idx];
                if (mySelected == undefined)
                    mySelected = scenarioId;
                scenariomgr.loadScenario(scenarioId);
            }
            scenariomgr.setSelectedScenario(mySelected, true);
        })
        .catch(showHttpError);

    }

    saveScenario(scenario) {

        let scenarioId = scenario.name;
        let workspace = this.workspace;

        let scenarioDesc = {}
        for (let tableId in scenario.tables) {
            scenarioDesc[tableId] = {category: scenario.tables[tableId].category}
        }
        axios({
            method: "PUT",
            url: "./api/scenario/"+scenarioId+'?workspace='+workspace,
            data: scenarioDesc,
          })
        .then(function (response) {
            for (let tableId in scenario.tables) {
                let csv = scenario.getTableAsCSV(tableId);
                axios({
                    method: "PUT",
                    url: "./api/scenario/"+scenarioId+"/"+tableId+'?workspace='+workspace,
                    data: {csv:csv},
                  })
                .then(function (response) {
                    console.log("Saved table " + tableId);
                })
            }
        })
        .catch(showHttpError);


    }
}
