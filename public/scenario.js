function callScript(name, cb) {
    if (name != undefined) {
        let url = './api/config/file?fileName='+name;
        if (workspace != undefined)
                url += '&workspace='+workspace;
        axios({
            method:'get',
            url:url,
            responseType:'text'
          })
        .then(function (response) {
                let js = response.data;
                eval(js);
                cb();
        }); 
    } else
        cb();
}    

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
        this.jobId = undefined;
        this.executionStatus = undefined;
        this.co_session = undefined;
      }

    updateTimeStamp() {
        this.timeStamp = Date.now();
        // OJO update date 
        let parametersTableId = this.mgr.config['$parameters'].tableId;
        if (parametersTableId in this.tables) {        
            function printDate(d) {
                return ("0"+(d.getDate()+1)).slice(-2)+'/'+("0"+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear() +
                ' ' + ("0"+(d.getHours()+1)).slice(-2)+':'+("0"+(d.getMinutes()+1)).slice(-2);
              }

            let date = new Date();
            if ('date' in this.tables[parametersTableId].rows) {
                // udate
                this.tables[parametersTableId].rows['date'].value = printDate(date);
            } else
            {
                // Add
                this.addRowToTable(parametersTableId, 'date', {name:'date', value:printDate(date)});

            }
        }
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
    renameTable(oldId, newId) {
        this.tables[newId] = this.tables[oldId];
        delete this.tables[oldId];
    }
    renameTableColumn(tableId, oldcol, newcol) {
        let table = this.tables[tableId];
        for (let c in table.cols)
            if (table.cols[c] == oldcol)
                table.cols[c] = newcol;
        for (let r in table.rows) {
            let row = table.rows[r];
            row[newcol] = row[oldcol];
            delete row[oldcol];
        }        
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
    removeAllRowsFromTable(tableId) {
        let table = this.tables[tableId];
        table.rows = {}
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
        if (this.co_session != undefined) {
            copy.co_session = JSON.parse(JSON.stringify(this.co_session));
            copy.co_session.dataSetId = copy.name;
        }
        return copy;
    }
    save_table(tableId) {
        let csv = this.getTableAsCSV(tableId);
        axios({
            method: "PUT",
            url: "./api/scenario/"+this.name+"/"+tableId+'?workspace='+this.mgr.workspace,
            data: {csv:csv},
            })
        .then(function (response) {
            console.log("Saved table " + tableId);
        });
    }
    load_table(tableId, category = 'input', tableconfig = {}, cb = undefined) {
        let scenario = this;
        let url = "./api/scenario/" + this.name + "/" + tableId+'?workspace='+this.mgr.workspace;
        axios({
            method:'get',
            url:url,
            responseType:'text'
          })
        .then(function (response) {
            let responseData = response.data;
            scenario.addTableFromCSV(tableId, responseData, category, tableconfig);
			console.log("Loaded " +tableId + " from " + url)						
            if (cb != undefined)
                cb();
        })
//         .catch(showHttpError);
    }
    load_co_session() {
        let scenario = this;
        axios({
            method:'get',
            url:'./api/ma/session?workspace=' + this.mgr.workspace + '&scenario='+ this.name,
            responseType:'json'
        })
        .then(function (response) {
            console.log('Loaded co_session');
            scenario.co_session = response.data;
            scenario.co_session.dataSetId = scenario.name;
        });
    }
    save_co_session() {
        axios({
            method: 'put',
            url: './api/ma/session?workspace=' + this.mgr.workspace + '&scenario='+ this.name,
            data: this.co_session
        }).then(function(response) {
                console.log('Saved co_session');
        });
    }

    initPA(statuscb, cb = undefined) {
        
        statuscb('INIT');
        let scenario = this;

        let nCubes = Object.keys(config.pa.mapping.input.cubes).length;
        let nDimensions = Object.keys(config.pa.mapping.input.dimensions).length;
        let nTotal = nCubes + nDimensions;
        statuscb('INIT (' + (nTotal-nCubes-nDimensions) + '/' + nTotal +')');

        for (let t in config.pa.mapping.input.cubes)  {
            let tableId = t;

            var csv = scenario.getTableAsCSV(tableId);
            let adddummy = ('adddummy' in config.pa.mapping.input.cubes[t]);
            axios({
                    method: 'put',
                    url: './api/pa/cube/'+tableId+'?version='+config.pa.mapping.input.version+'&adddummy='+adddummy+'&workspace='+scenariomgr.workspace,
                    data: {csv:csv},
                    responseType:'json'
            }).then(function(response) {
                    console.log('Created cube ' + tableId );

                    nCubes--;

                    statuscb('INIT (' + (nTotal-nCubes-nDimensions) + '/' + nTotal +')');
                    if (nCubes==0) {                

                        if (cb != undefined)
                            cb()
                    }
                            
            }).catch(showHttpError);

        }


          
    }

    importFromPA(statuscb, cb = undefined) {
        
        statuscb('READING');
        let scenario = this;

        let nCubes = Object.keys(config.pa.mapping.input.cubes).length;
        let nDimensions = Object.keys(config.pa.mapping.input.dimensions).length;
        let nTotal = nCubes + nDimensions;
        statuscb('READING (' + (nTotal-nCubes-nDimensions) + '/' + nTotal +')');
        for (let cubeName in config.pa.mapping.input.cubes) {
                let cubeTableName = config.pa.mapping.input.cubes[cubeName].name;

                axios({
                        method:'get',
                        url:'./api/pa/cube/'+cubeName+'?version='+config.pa.mapping.input.version+'&workspace='+scenariomgr.workspace
                      })
                .then(function (response) {
                        let csv = response.data;
                 
                        scenario.addTableFromCSV(cubeTableName, csv, 'input');

                        console.log('Finished reading cube: ' + cubeName + ' into table ' + cubeTableName);       

                        nCubes--;

                        statuscb('READING (' + (nTotal-nCubes-nDimensions) + '/' + nTotal +')');
                        if (nCubes==0) {

                            if (nDimensions ==0) {

                                if (cb != undefined)
                                    cb();
                            } else
                            for (let dimensionName in config.pa.mapping.input.dimensions) {
                                let dimensionTableName = config.pa.mapping.input.dimensions[dimensionName].name;

                                axios({
                                        method:'get',
                                        url:'./api/pa/dimension/'+dimensionName+'?onlyLevel=0&workspace='+scenariomgr.workspace,
                                        responseType:'json'
                                        })
                                .then(function (response) {
                                        let obj = response.data;                                                                                
                
                                        csv = 'Id\r\n';
                                        for (let r in obj) {
                                                csv += obj[r] + '\r\n';
                                        }
                                        
                                        scenario.addTableFromCSV(dimensionTableName, csv, 'input');
                
                                        console.log('Finished reading dimension: ' + dimensionName + ' into table ' + dimensionTableName);       

                                        nDimensions--;

                                        statuscb('READING (' + (nTotal-nCubes-nDimensions) + '/' + nTotal +')');
                                        if (nDimensions==0) {
                                            
                                            callScript(config.pa.mapping.input.postprocess, function () {

                                                if (cb != undefined)
                                                    cb();
                                            })
                                        }                        
                                        
                                })
                                .catch(showHttpError);   
                            } 
                                          

                        }

                })
                .catch(showHttpError);   
        }
          
    }

    exportToPA(statuscb, cb = undefined) {

        statuscb('WRITING');

        let scenario = this;    

        let nCubes = Object.keys(config.pa.mapping.output.cubes).length;
        let nTotal = nCubes;

        statuscb('WRITING (' + (nTotal-nCubes) + '/' + nTotal +')');

        for (let t in config.pa.mapping.output.cubes)  {
                let cubeName = t;
                let tableId = config.pa.mapping.output.cubes[t].name;

                var csv = scenario.getTableAsCSV(tableId);
                let adddummy = ('adddummy' in config.pa.mapping.output.cubes[t]);
                axios({
                        method: 'put',
                        url: './api/pa/cube/'+cubeName+'?version='+config.pa.mapping.output.version+'&adddummy='+adddummy+'&workspace='+scenariomgr.workspace,
                        data: {csv:csv},
                        responseType:'json'
                }).then(function(response) {
                        console.log('Created cube ' + cubeName + ' from table ' + tableId );

                        nCubes--;

                        statuscb('WRITING (' + (nTotal-nCubes) + '/' + nTotal +')');
                        if (nCubes==0) {                

                            if (cb != undefined)
                                cb()
                        }
                                
                }).catch(showHttpError);

        }
    }

    solve(dokey, statuscb, cb = undefined, checkStatusInterval=1000) {
        let scenario = this;
        let scenariomgr = this.mgr;
        this.jobId = undefined;
        this.intervalId = ''

        function checkStatus() {
            let workspace = "";
            if (scenariomgr.workspace != undefined)
                workspace = "&workspace="+scenariomgr.workspace;
            axios.get("./api/optim/status?jobId="+scenario.jobId+workspace+'&dokey='+dokey)
            .then(function(response) {
                    let executionStatus = response.data.solveState.executionStatus
                    console.log("JobId: "+scenario.jobId +" Status: "+executionStatus)
                    if ( (executionStatus != "UNKNOWN") && (executionStatus != "DONE") ) {
                        scenario.executionStatus = executionStatus;
                        statuscb(executionStatus);

                        if (scenario.executionStatus == "PROCESSED" ||
                            scenario.executionStatus == "INTERRUPTED" ) {
                                clearInterval(scenario.intervalId);

                                let nout = response.data.outputAttachments.length;
                                for (var i = 0; i < nout; i++) {
                                        let oa = response.data.outputAttachments[i];
                                        let tableName = oa.name;
                                        if ((tableName in scenario.tables) && scenario.tables[tableName].category == 'input')
                                            tableName = '_'+tableName;
                                        if ('csv' in oa)
                                                scenario.addTableFromCSV(tableName, oa.csv, 'output', scenariomgr.config[oa.name]);     
                                        else
                                                scenario.addTableFromRows(tableName, oa.table.rows, 'output', scenariomgr.config[oa.name]); 
                                }

                                callScript(config[dokey].postprocess, function () {
                                    scenario.updateTimeStamp();
                                    if (cb != undefined)
                                        cb();
                                });
                                
                        }   

                    } 
                    else {
                        clearInterval(scenario.intervalId);
                    }
            })
            .catch(function (error) {
                clearInterval(scenario.intervalId);
                if (error.response.status == 404)
                    console.log("Status, job not found");
                else
                    showHttpError(error);
            });    
        }

        function dosolve() {
            statuscb('STARTING');

            var data = new FormData();

            let tableIds = scenario.getInputTables()
            for (let t in tableIds)  {
                    let tableId = tableIds[t];
                    data.append(tableId+".csv", scenario.getTableAsCSV(tableId));
            }

            let workspace = "";
            if (scenariomgr.workspace != undefined)
                workspace = "&workspace="+scenariomgr.workspace;
            axios({
                    method: 'post',
                    url: './api/optim/solve?scenario='+scenario.getName()+workspace+'&dokey='+dokey,
                    data: data
            }).then(function(response) {
                    scenario.jobId = response.data.jobId    
                    scenario.executionStatus = 'SUBMITED';       
                    console.log("Job ID: "+ scenario.jobId);
                    scenario.intervalId = setInterval(checkStatus, checkStatusInterval)
                    statuscb('SUBMITED');
            }).catch(showHttpError);
        }

        callScript(config[dokey].preprocess, dosolve);         
        
    }


    score(mlkey, statuscb, cb = undefined) {
        let scenario = this;        
        
        function doscore() {

            let inputScenario = scenario;

            let inputTableId = config[mlkey].input;
            let inputTable = inputScenario.tables[inputTableId];   
            let payload = {
                    fields: [],
                    values: []
            };
            if ('fields' in config[mlkey])
                payload.fields = config[mlkey].fields;
            else
                payload.fields = inputTable.cols;

            for (let r in inputTable.rows) {
                    let data = [];
                    for (let c in payload.fields) {
                        let val = inputTable.rows[r][payload.fields[c]];
                        if (!isNaN(parseFloat(val)))
                                val = parseFloat(val);
                        data.push(val);
                    }
                    payload.values.push(data);                
            }

            statuscb('SCORING');
        
            axios({
                    method: 'post',
                    url: './api/ml/score?workspace='+scenariomgr.workspace+'&mlkey='+mlkey,
                    data: payload
            }).then(function(response) {

                if ('values' in response.data) {
                        console.log("Scoring done");

                        let outputScenario = scenario;

                        let outputTableId = config[mlkey].output;
                        let outputId = config[mlkey].outputId;
                        if (outputId == undefined)
                                outputId = inputTableId;
                        let nbOutputs = config[mlkey].nbOutputs;
                        if (nbOutputs == undefined)
                                nbOutputs = 2;
                        if (!(outputTableId in outputScenario.tables)) {
                                // Create output table
                                outputScenario.addTable(outputTableId, 'output', [outputId, 'value'], {id: outputId});
                        } 
                        else if ('cleanOutputTable' in config[mlkey]  && config[mlkey].cleanOutputTable) {
                            outputScenario.removeAllRowsFromTable(outputTableId);
                        }
                        let outputTable = outputScenario.tables[outputTableId];
                        let i = 0;
                        let idx = response.data.values[0].length-nbOutputs;
                        for (let r in inputTable.rows) {
                                let row = {}
                                row[outputId]= r;   
                                if ('oneMoreLevelOutput' in config[mlkey] && config[mlkey].oneMoreLevelOutput)
                                    row.value = response.data.values[i][1][idx];                        
                                else
                                    row.value= response.data.values[i][idx];                        
                                outputScenario.addRowToTable(outputTableId, r, row);
                                i = i +1;
                        }

                        callScript(config[mlkey].postprocess, function () { 

                            outputScenario.updateTimeStamp();

                            if (cb != undefined)
                                cb();
                        })
                        
                } else {
                        console.error("Scoring error: " + response.data.errors[0].message);
                        if ( ('action' in config[mlkey]) && ('alertErrors' in config[mlkey].action) && config[mlkey].action.alertErrors)
                                alert("Scoring error: " + response.data.errors[0].message);

                        if (cb != undefined)
                            cb();

                }
            }).catch(showHttpError);
        }

        
        callScript(config[mlkey].preprocess, doscore);            

    }

    flow(flowkey, statuscb, cb = undefined) {
        let size = Object.keys(config[flowkey].steps).length

        let scenario = this;
        let step = 0; 
        function myflowcallback() {
            if (step < size) {
                let action = config[flowkey].steps[step];
                step++;
                if (action.type == 'ml') {
                    scenario.score(action.mlkey, statuscb, myflowcallback)
                }
                if (action.type == 'do') {
                    scenario.solve(action.dokey, statuscb, myflowcallback)
                }
            } else {
                if (cb != undefined)
                    cb();
            }
        }
        myflowcallback();
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
        div.innerHTML = '';
        div.scenariomgr = this;
        div.cb = cb;
        let actionsDiv = document.createElement('div');
        //actionsDiv.className = "scenario-selector-title";
        let actionsHTML = ''
        actionsHTML += '<table width="100%" class="scenario-selector-title" style="float:right"><tr><td style="background:#e5e5e5"><center>'
        actionsHTML += '\
            <img src="./do-ws-js/images/rename-16.png" id="RENAME_SCENARIO" title="Rename" class="scenario-selector-action"/> \
            <img src="./do-ws-js/images/duplicate-16.png" id="DUPLICATE_SCENARIO" title="Duplicate" class="scenario-selector-action"/>';


        actionsHTML += '</center></td><td style="width:20px"></td><td style="background:#f9c5c5"><center> \
            <img src="./do-ws-js/images/delete-16.png" id="DELETE_SCENARIO" title="Delete" class="scenario-selector-action"/>';

        actionsHTML += '</center></td><td style="width:20px"></td><td style="background:#ffe8aa"><center> \
            <img src="./do-ws-js/images/save-16.png" id="SAVE_SCENARIO" title="Save" class="scenario-selector-action"/> \
            <img src="./do-ws-js/images/save-all-16.png" id="SAVE_ALL_SCENARIOS" title="Save All" class="scenario-selector-action"/>';

        actionsHTML += '</center></td></tr></table>'

        actionsDiv.innerHTML = actionsHTML;
        actionsDiv.style['padding-bottom']= '20px';
        // html = html + '<input type="button" class="dd" value="RENAME" id="RENAME_SCENARIO"/>'
        // html = html + '<input type="button" value="DUPLICATE" id="DUPLICATE_SCENARIO"/>'
        // html = html + '<input type="button" value="DELETE" id="DELETE_SCENARIO"/>'
        // html = html + '<input type="button" value="SAVE" id="SAVE_SCENARIO"/>'
        // html = html + '<input type="button" value="SAVE ALL" id="SAVE_ALL_SCENARIOS"/><br>'

        div.appendChild(actionsDiv);

        let contentDiv = document.createElement('div');

        let html = "Selected: <select id='"+divId+"_SCENARIO_SELECTOR' onchange='ScenarioManagerScenarioChanged(\"" + divId + "\")'>";
        let listOfScenarios = [];
        for (let scenario in this.scenarios) 
            if (scenario != ".DS_Store")
                listOfScenarios.push(scenario);
        listOfScenarios.sort();
            
        for (let s in listOfScenarios) {
            let scenario = listOfScenarios[s];
            html = html + "<option value='" + scenario + "'";
            if ((this.selected != undefined)  &&
                (this.selected.getName() == scenario))
                html = html + " selected";
            html = html +">" + scenario + "</option>";
        }
        html = html + "</select>";

        html = html + "<BR>";

        
        html = html + "Reference: <select id='REFERENCE_SELECTOR' onchange='ScenarioManagerReferenceChanged(\"" + divId + "\")'>";
        html = html + "<option value=''";
        if (this.reference == undefined)
            html = html + " selected";
        html = html + "></option>";
        for (let s in listOfScenarios) {
            let scenario = listOfScenarios[s];
            html = html + "<option value='" + scenario + "'";
            if ((this.reference != undefined)  &&
                (this.reference.getName() == scenario))
                html = html + " selected";
            html = html +">" + scenario + "</option>";
        }
        html = html + "</select>";

        contentDiv.innerHTML = html;
        contentDiv.style['padding-top']= '20px';
        div.appendChild(contentDiv);

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

        document.getElementById("SAVE_ALL_SCENARIOS").onclick = function()
            {
                scenariomgr.saveAllScenarios();
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


        if ('ma' in config) 
            scenario.load_co_session();
            
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
            if (scenariocb!=undefined
                && (0==ntables))
                scenariocb.cb(scenario);
        })
        
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
            console.log("Workspace " + scenariomgr.workspace + " scenarios " + scenarios)
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

    saveAllScenarios() {
        for (let scenario in this.scenarios)
            this.saveScenario(this.scenarios[scenario]);
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
                scenario.save_table(tableId);
            }
        })
        //.catch(showHttpError);

        if ('ma' in config)
            scenario.save_co_session();

    }
    
}
