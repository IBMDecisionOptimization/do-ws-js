
function updateConfig(fieldId, configId, push = true) {
    let value = document.getElementById(fieldId).value;
    
    var schema = config;  // a moving reference to internal objects within obj
    var pList = configId.split('.');
    var len = pList.length;
    for(var i = 0; i < len-1; i++) {
            var elem = pList[i];
            if( !schema[elem] ) schema[elem] = {}
            schema = schema[elem];
    }

    schema[pList[len-1]] = value;

    if (push)
            axios({
                    method: 'put',
                    url: './api/config?workspace='+scenariomgr.workspace,
                    data: config,
                    responseType:'json'
            }).then(function(response) {
                    console.log('Updated config');
                    console.log(response);
            })
            // .catch(showHttpError);
}


function hideButton(WHAT) {
    document.getElementById(WHAT).style.display = 'none';
}

function disableButton(WHAT) {
    document.getElementById(WHAT).disabled = true;
}

function enableButton(WHAT) {
    document.getElementById(WHAT).disabled = false;
}



function initPA(btn_id, cb) {
    
    let scenarioName = config.pa.mapping.input.version;
    if (!(scenarioName in scenariomgr.getScenarios()))
            scenariomgr.newScenario(scenarioName);
    let scenario = scenariomgr.getScenarios()[scenarioName];

    let btn = document.getElementById(btn_id);
    let btn_txt = btn.innerHTML;
    scenario.initPA(function (status) {
                    btn.disabled = true;
                    btn.innerHTML = status
            }, 
            function (){
                    btn.disabled = false;
                    btn.innerHTML = btn_txt;
                    
                    if (cb != undefined)
                            cb();
            });
}

function getFromPA(btn_id, cb) {

    let scenarioName = config.pa.mapping.input.version;
    if (!(scenarioName in scenariomgr.getScenarios()))
            scenariomgr.newScenario(scenarioName);
    let scenario = scenariomgr.getScenarios()[scenarioName];

    let btn = document.getElementById(btn_id);
    let btn_txt = btn.innerHTML;
    scenario.importFromPA(function (status) {
                    btn.disabled = true;
                    btn.innerHTML = status
            }, 
            function (){
                    btn.disabled = false;
                    btn.innerHTML = btn_txt;
                    scenariomgr.setSelectedScenario(scenarioName);
                    showAsGoogleTables(scenario, 'inputs_div', 'input', undefined, undefined, true);
                    scenariomgr.saveScenario(scenario);
                    if (cb != undefined)
                            cb();
            });
}

function createProjectIfNecessary(cb = undefined) {
    axios({
            method: 'get',
            url: './api/ws/projects?workspace='+scenariomgr.workspace,
            responseType:'json'
    }).then(function(response) {
            console.log('Read WS project list');
            let projects = response.data;
            let found = false;
            for (p in projects) {
                    let project = projects[p];
                    if (project.name == config.ws.projectName) {
                            found = true;
                            break;
                    }
            }

            if (!found)
                    axios({
                            method: 'put',
                            url: './api/ws/project/' + config.ws.projectName+'?workspace='+scenariomgr.workspace,
                            responseType:'json'
                    }).then(function(response) {
                            console.log('Created WS project');

                            if (cb != undefined)
                                    cb();

                    })
                    // .catch(showHttpError);
            else
                    if (cb != undefined)
                            cb();
    })
    // .catch(showHttpError);
}
 

function pushToWS() {

    disableButton('PUSHTOWS');
    let scenarioName = config.pa.mapping.input.version;
    let projectName = config.ws.projectName;
    let scenario = scenariomgr.getScenarios()[scenarioName];
    
    let tableIds = scenario.getInputTables()
    let n = tableIds.length;
    for (t in tableIds)  {
            let tableId = tableIds[t];
            
            var data = new FormData();
            var csv = scenario.getTableAsCSV(tableId);
            data.append(tableId+".csv", csv);

            axios({
                    method: 'post',
                    url: './api/ws/project/'+projectName+'/dataset/'+tableId+'?workspace='+scenariomgr.workspace,
                    data: data,
                    responseType:'json'
            }).then(function(response) {
                    console.log('Created dataset ' + tableId );
                    n--;
                    if (n==0) {
                            enableButton('PUSHTOWS');
                    }        
            })
            // .catch(showHttpError);

    }
}

function createProjectAndPushToWS() {
    createProjectIfNecessary(pushToWS);        
}

function openWS() {
    let url = config.ws.url + '#/projects/'  + config.ws.projectName;
    if ('projectId' in config.ws)
            url = config.ws.url + '/projects/'  + config.ws.projectId + '/overview';
    var win = window.open(url, '_blank');
    win.focus();
}

function mysolve(dokey, btn_id, cb) {

    if (scenariomgr.getSelectedScenario() == undefined) {
            alert('No Scenario. Call import first.')
            return;
    }
    let scenario = scenariomgr.getSelectedScenario();

    let btn = document.getElementById(btn_id);
    let btn_txt = btn.innerHTML;

    scenario.solve(dokey, function (status) {
                    btn.disabled=true;
                    btn.innerHTML = status;
            }, function () {
                    btn.disabled=false;
                    btn.innerHTML = btn_txt;

                    showAsGoogleTables(scenario, 'outputs_div', 'output', undefined, undefined, true);
                    scenariomgr.saveScenario(scenario);
    
                    if (cb != undefined)
                            cb();

            });

}



function mydevscore(mlkey, btn_id, cb) {

    if (scenariomgr.getSelectedScenario() == undefined) {
            alert('No Scenario. Call import first.')
            return;
    }
    let scenario = scenariomgr.getSelectedScenario();

    let btn = document.getElementById(btn_id);
    let btn_txt = btn.innerHTML;

    scenario.score(mlkey, function (status) {
                    btn.disabled=true;
                    btn.innerHTML = status;
            }, function () {
                    btn.disabled=false;
                    btn.innerHTML = btn_txt;
                    
                    showAsGoogleTables(scenario, 'outputs_div', 'output', undefined, undefined, true);
                    scenariomgr.saveScenario(scenario);
                    
                    if (cb != undefined)
                            cb();
            });
}

function pushToPA(btn_id, cb) {

    if (scenariomgr.getSelectedScenario() == undefined) {
            alert('No Scenario. Call import and solve/score first.')
            return;
    }
    let scenario = scenariomgr.getSelectedScenario();

    let btn = document.getElementById(btn_id);
    let btn_txt = btn.innerHTML;

    scenario.exportToPA(function (status) {
                    btn.disabled = true;
                    btn.innerHTML = status;
            }, function () {
                    btn.disabled = false;
                    btn.innerHTML = btn_txt;
                    if (cb != undefined)
                            cb();   
            });

}


function myoptimize(dokey, btn_id) {
    getFromPA(btn_id, function(){
            mysolve(dokey, btn_id, function() {
                    pushToPA(btn_id);
            });
    } );
    
    
}

function mydeployscore(mlkey, btn_id) {
    getFromPA(btn_id, function(){
            mydevscore(mlkey,btn_id, function() {
                    pushToPA(btn_id);
            });
    } );
    
    
}

function toggleDevConfig() {
    let configDiv =  document.getElementById("dev_config_div");
    let inputsDiv =  document.getElementById("inputs_div");
    let maDiv =  document.getElementById("ma_dev_div");
    let outputsDiv =  document.getElementById("outputs_div");        
    if (configDiv.style.display === "none") {
            configDiv.style.display = "block";
            inputsDiv.style.display = "none";
            maDiv.style.display = "none";
            outputsDiv.style.display = "none";

            showAsConfig('CONFIG_EDITOR', config)

    } else {
            configDiv.style.display = "none";
    }
}

function toggleDeployConfig() {
    let configDiv =  document.getElementById("deploy_config_div");

    if (configDiv.style.display === "none") {
            configDiv.style.display = "block";
    } else {
            configDiv.style.display = "none";
    }
}

function toggleInputs() {
    let configDiv =  document.getElementById("dev_config_div");
    let inputsDiv =  document.getElementById("inputs_div");
    let maDiv =  document.getElementById("ma_dev_div");
    let outputsDiv =  document.getElementById("outputs_div");
    if (inputsDiv.style.display === "none") {      
            configDiv.style.display = "none";          
            inputsDiv.style.display = "block";
            maDiv.style.display = "none";
            outputsDiv.style.display = "none";
    } else {
            inputsDiv.style.display = "none";
    }
}

function toggleOutputs() {
    let configDiv =  document.getElementById("dev_config_div");
    let inputsDiv =  document.getElementById("inputs_div");
    let maDiv =  document.getElementById("ma_dev_div");
    let outputsDiv =  document.getElementById("outputs_div");
    if (outputsDiv.style.display === "none") {   
            configDiv.style.display = "none";  
            inputsDiv.style.display = "none";    
            maDiv.style.display = "none"; 
            outputsDiv.style.display = "block";
    } else {
            outputsDiv.style.display = "none";
    }
}

function toggleMA() {
    let configDiv =  document.getElementById("dev_config_div");
    let inputsDiv =  document.getElementById("inputs_div");
    let maDiv =  document.getElementById("ma_dev_div");
    let outputsDiv =  document.getElementById("outputs_div");
    if (maDiv.style.display === "none") {   
            configDiv.style.display = "none";  
            inputsDiv.style.display = "none";    
            maDiv.style.display = "block"; 
            outputsDiv.style.display = "none";
    } else {
            maDiv.style.display = "none";
    }
}