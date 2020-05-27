
function getProgressHTML() {
    return '<div id="progressDiv"><div class="progress">\
    <div class="progress-bar" role="progressbar" id="loadprogress" style="width: 0%" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100">\
    <center><span id="loadprogress-value" class="pull-right" style="text-align:center;"></span></center>\
    </div>\
    </div></div>';
}

function showProgress() {
    let progressDiv = document.getElementById("progressDiv");
    progressDiv.style.display = "block";
    progressDiv.style.height = "20px";

    document.getElementById("loadprogress").style.width = "0%";
}
function showProgressMessage(text) {
    document.getElementById("loadprogress-value").innerHTML  = '<center>' + text + '</center>';
}
function updateProgress(val, max, text=undefined) {
    let w = Math.trunc(100*val/max) + "%";
    document.getElementById("loadprogress").style.width = w;
    if (text != undefined)
        document.getElementById("loadprogress-value").innerHTML = text;
}
function hideProgress() {
    let progressDiv = document.getElementById("progressDiv");
    progressDiv.style.display = "none";
    progressDiv.style.height = "0px";

    document.getElementById("loadprogress").style.width = "100%";
    document.getElementById("loadprogress-value").innerHTML = ""
}


function getImportHTML(workspace) {
    let projectName = 'PA3';
    let modelName = 'DOMODEL'
    let scenarioName = 'Scenario 1';

    let subHTML = "'"+workspace+"'";
    let importDivHTML = '<div class="form-popup" id="IMPORT_DIV" style="display: none;">\
            <label><b>Project</b></label> \
            <select id="IMPORT_PROJECT" onChange="importUpdateModels('+subHTML+')"> \
            <option value="'+projectName+'">'+projectName+'</option> \
            </select> \
            <label><b>Model</b></label> \
            <select id="IMPORT_MODEL" onChange="importUpdateScenarios('+subHTML+')"> \
            <option value="'+modelName+'">'+modelName+'</option> \
            </select> \
            <label><b>--- IMPORT \
            <input type="checkbox" id="IMPORT_SCENARIO" checked>  \
                Scenarios</b></label> \
            <select id="IMPORT_SCENARIO_LIST"> \
            <option value="'+scenarioName+'">'+scenarioName+'</option> \
            </select>';
    if (appMode == true)
        importDivHTML += ' \
            <input type="checkbox" id="IMPORT_DASHBOARD"> Dashboard';
    importDivHTML += ' \
            <input type="checkbox" id="IMPORT_PYTHON_MODEL"> Model  \
            <button type="button" id="IMPORT_BTN" class="btn btn-outline-secondary btn-sm" onclick="doimport('+subHTML+')">Import</button> \
        </div>';
    return importDivHTML;
}


function importUpdateProjects(workspace) {
    // change projects

    showProgress();
    updateProgress(0, 3);

    axios({
        method:'get',
        url:'/api/ws/projects' + '?workspace=' + workspace,
        responseType:'json'
    })
    .then(function (response) {
        
        let select = document.getElementById("IMPORT_PROJECT");
        while (select.options.length > 0) {
           select.remove(select.options.length - 1);
       }

        // Create items array
        var projects = Object.keys(response.data).map(function(key) {
           return [key, response.data[key]];
       });
       
       // Sort the array based on the second element
       projects.sort(function(first, second) {
           if(first[1].name.toLowerCase() < second[1].name.toLowerCase()) { return -1; }
           if(first[1].name.toLowerCase() > second[1].name.toLowerCase()) { return 1; }
           return 0;
       });

        for (let p in projects) {
            let element = document.createElement("option");
            element.innerText = projects[p][1].name;
            element.guid = projects[p][1].guid;
            select.append(element);
        }
        
        
        importUpdateModels(workspace);
    })
    //.catch(showHttpError); 
}

function importUpdateModels(workspace) {
   // change models

   let projectName = document.getElementById('IMPORT_PROJECT').value;
   let projectId = document.getElementById('IMPORT_PROJECT').options[document.getElementById('IMPORT_PROJECT').selectedIndex].guid;

   showProgress();
   updateProgress(1, 3);

   let url = '/api/ws/domodels?projectName=' + projectName + '&workspace=' + workspace;
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
        
        if (Object.keys(models).length > 0)
           importUpdateScenarios(workspace);
        else 
           hideProgress();
       
   })
   .catch(showHttpError); 
}

function importUpdateScenarios(workspace) {
   // change scenarios

   let projectName = document.getElementById('IMPORT_PROJECT').value;
   let projectId = document.getElementById('IMPORT_PROJECT').options[document.getElementById('IMPORT_PROJECT').selectedIndex].guid;
   let modelName = document.getElementById('IMPORT_MODEL').value;
   
   showProgress();
   updateProgress(2, 3);

   let url = '/api/ws/domodel?projectName=' + projectName + '&workspace=' + workspace;
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

       if (scenariogrid!=undefined) {
        let element = document.createElement("option");
        element.innerText = "__ALL__";
        select.append(element);
       }

        for (let s in scenarios) {
            if ( (!('category' in scenarios[s])) || (scenarios[s].category == 'scenario') ) { 
               element = document.createElement("option");
               element.innerText = scenarios[s].name;
               select.append(element);
            }
        }

        updateProgress(3, 3);
        hideProgress();
       
   })
   .catch(showHttpError); 
}

function switchVisibleImport(workspace) {        

    let div = document.getElementById('IMPORT_DIV');
    
    
    if (!div.initDone) {
        div.style.display = 'block'; 
        div.isShown = true; 
        importUpdateProjects(workspace);
        div.initDone = true;
    } else {
        if (div.isShown) {
            hideProgress();
            div.style.display = 'none'; 
            div.isShown = false;
        } else {
            div.style.display = 'block'; 
            div.isShown = true;
        }       
    }
    
}

function doimportmodel(workspace, projectName, projectId, modelName, scenarioName) {
    
    let url = '/api/ws/domodel/data?projectName=' + projectName + '&workspace=' + workspace;
    if (projectId != undefined)
        url = url + '&projectId=' + projectId;
    let model = "model.py";
    if ('model' in config[dokey] )
        model = config[dokey].model;
    url = url + '&modelName=' + modelName + '&scenarioName=' + scenarioName + '&assetName=' + model

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


// uses global scenariomgr

function doimportscenario(workspace, projectName, projectId, modelName, scenarioName, cb = undefined) {
    let url = '/api/ws/domodel/tables?projectName=' + projectName + '&workspace=' + workspace;
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
        let scenario = scenariomgr.newScenario(scenarioName);
        let tables = response.data;
        let ntables = tables.length;
        let itables = 0;
        url = '/api/ws/domodel/table?projectName=' + projectName + '&workspace=' + workspace;
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

                if ('id' in scenariomgr.config[tableName])
                    scenariomgr.config[tableName].allowEdition = true;
                    
                itables++;
                if ( (itables == ntables) &&
                     (cb != undefined) ) {
                    showProgressMessage("Imported scenario " + scenario.name);

                    // OJO adding date 
                    let parametersTableId = scenariomgr.config['$parameters'].tableId;
                    if (!(parametersTableId in scenario.tables)) {
                        // Create table parameters
                        scenario.addTable(parametersTableId, 'input', ['name', 'value'], {id:'name', cb:undefined});
                    }

                    function printDate(d) {
                        return ("0"+(d.getDate()+1)).slice(-2)+'/'+("0"+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear() +
                        ' ' + ("0"+(d.getHours()+1)).slice(-2)+':'+("0"+(d.getMinutes()+1)).slice(-2);
                      }

                    let date = new Date();
                    date = new Date(date.getTime() - Math.floor(Math.random() * 30*1000*60*60*24));
                      
                    // OJO adding date 
                    if ('date' in scenario.tables[parametersTableId].rows) {
                        // udate
                        scenario.tables[parametersTableId].rows['date'].value = printDate(date);
                    } else
                    {
                        // Add
                        scenario.addRowToTable(parametersTableId, 'date', {name:'date', value:printDate(date)});

                    }

                    cb();
                }
            })
            //.catch(showHttpError); 
        } 

        if (tables.length == 0)
            cb();
    })
    //.catch(showHttpError); 
}

// uses global scenariomgr
// uses global scenariogrid for dashboard

function doimport(workspace) {

    let projectName = document.getElementById('IMPORT_PROJECT').value;
    let projectId = document.getElementById('IMPORT_PROJECT').options[document.getElementById('IMPORT_PROJECT').selectedIndex].guid;
    let modelName = document.getElementById('IMPORT_MODEL').value;
    let scenarioName = document.getElementById('IMPORT_SCENARIO_LIST').value;

    let btn = document.getElementById("IMPORT_BTN");
    btn.innerHTML = "Loading...";
    showProgress();

    if (scenariogrid != undefined)
        scenariogrid.setTitle(modelName);

    let is = 0;
    let ts = 1;
    function mycb() {                        
        is = is + 1;
        updateProgress(is, ts);

        if (is == ts) {            
            if (scenarioName in scenariomgr.scenarios)     
                scenariomgr.selected = scenariomgr.scenarios[scenarioName];    
            if (scenariogrid != undefined) {
                if (document.getElementById("IMPORT_DASHBOARD").checked)
                    scenariogrid.doimportdashboard(projectName, projectId, modelName)
                else if (Object.keys(scenariogrid.widgets).length == 0)
                    scenariogrid.dodefaultdashboard();
            }

            if (document.getElementById("IMPORT_PYTHON_MODEL").checked
                    && (!document.getElementById("IMPORT_SCENARIO").checked || scenarioName != "__ALL__") )
                doimportmodel(workspace, projectName, projectId, modelName, scenarioName)

            hideProgress();

            if (scenariogrid != undefined) 
                scenariogrid.redraw();
            else 
                paredraw();

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
                    doimportscenario(workspace, projectName, projectId, modelName, scenarioName, mycb);
                else
                    ts = ts - 1;
            }
        } else {
            doimportscenario(workspace, projectName, projectId, modelName, scenarioName, mycb);
        }
    } else {
        mycb();
    }

}