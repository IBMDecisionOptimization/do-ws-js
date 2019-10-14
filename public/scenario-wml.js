
function deployWML(workspace, dokey, okcb=undefined, kocb=undefined) {
        axios({
            method:'get',
            url:'./api/optim/config?workspace='+workspace+'&dodeploy=true&dokey='+dokey,
            responseType:'text'
        })
    .then(function (response) {
        if (response.data.status == "OK") {         
            console.log("Init Optim: " + response.data.status + " (" + response.data.type + ")");
            if (okcb != undefined)
                okcb();  
        } else {
            console.error("Error with Init Optim: " + response.data.status);
            if (kocb != undefined)
                kocb();
        }
    })
    .catch(showHttpError);     
}

function selectDeployedModel(workspace, dokey, modelId, divId) {
    config[dokey].model_id = modelId;
    getSolveDeployedModels(workspace, dokey, divId);
    saveConfig()
}

function selectDeployment(workspace, dokey, deploymentId, divId) {
    config[dokey].deployment_id = deploymentId;
    getSolveDeployments(workspace, dokey, divId);
    saveConfig()
}

function deleteDeployedModel(workspace, dokey, guid, divId) {
    let configDiv = document.getElementById(divId);
    configDiv.innerHTML = '<b>List of deployed models pending...</b>';
    axios({
        method:'delete',
        url:'./api/optim/deployed_models/'+guid+'?workspace='+workspace+'&dokey='+dokey
    })
    .then(function (response) {
        getSolveDeployedModels(workspace, dokey, divId);
    })
    .catch(showHttpError);     
}
function getSolveDeployedModels(workspace, dokey, divId) {
    let configDiv = document.getElementById(divId);
    configDiv.innerHTML = '<b>List of deployed models pending...</b>';
    axios({
        method:'get',
        url:'./api/optim/deployed_models?workspace='+workspace+'&dokey='+dokey,
        responseType:'text'
    })
    .then(function (response) {
        let html = '<b>Deployed Models ('+ response.data.resources.length +')</b><br><table class="hoverTable" style="border-spacing: 10px 10px; width:100%">'
        
        // Create items array
        var resources = Object.keys(response.data.resources).map(function(key) {
            return [key, response.data.resources[key]];
        });
        
        // Sort the array based on the second element
        resources.sort(function(first, second) {
            return Date.parse(second[1].metadata.modified_at) - Date.parse(first[1].metadata.modified_at);
        });

        for (let r in resources) {
            html += '<tr>'
            let res = resources[r][1];
            let isBold = ('model_id' in config[dokey] && config[dokey].model_id == res.metadata.guid)
            let sbold = isBold ? '<b>' : '';
            let ebold = isBold ? '</b>' : '';
            html += '<td>' + sbold + res.entity.name + ebold + '</td>';
            html += '<td>' + sbold + res.entity.type + ebold + '</td>';
            html += '<td>' + sbold + res.metadata.modified_at + ebold + '</td>';
            html += '<td>' + sbold + res.metadata.guid + ebold + '</td>';                        
            if (isBold) {
                html += '<td></td>';
            } else {
                html += '<td>' + sbold + '<div id="'+divId+'_SELECT_'+res.metadata.guid+'" style="cursor:pointer">SELECT</div>'+ ebold +'</td>';
            }
            html += '<td>' + sbold + '<div id="'+divId+'_DELETE_'+res.metadata.guid+'" style="cursor:pointer">DELETE</div>'+ ebold +'</td>';
            html += '</tr/>';                       
        }
        html += '</table>';
        configDiv.innerHTML = html;
        for (let r in response.data.resources) {
            let res = response.data.resources[r];
            document.getElementById(divId+'_DELETE_'+res.metadata.guid).onclick = function() {
                deleteDeployedModel(workspace, dokey, res.metadata.guid, divId);
            }
            let isBold = ('model_id' in config[dokey] && config[dokey].model_id == res.metadata.guid)
            if (!isBold)
                document.getElementById(divId+'_SELECT_'+res.metadata.guid).onclick = function() {
                    selectDeployedModel(workspace, dokey, res.metadata.guid, divId);
                }
        }
    })
    .catch(showHttpError);     
}
function deleteDeployement(workspace, dokey, guid, divId) {
    let configDiv = document.getElementById(divId);
    configDiv.innerHTML = '<b>List of deployments pending...</b>';
    axios({
        method:'delete',
        url:'./api/optim/deployments/'+guid+'?workspace='+workspace+'&dokey='+dokey
    })
    .then(function (response) {
        getSolveDeployments(workspace, dokey, divId);
    })
    .catch(showHttpError);     
}
function getSolveDeployments(workspace, dokey, divId) {
    let configDiv = document.getElementById(divId);
    configDiv.innerHTML = '<b>List of deployments pending...</b>';
    axios({
        method:'get',
        url:'./api/optim/deployments?workspace='+workspace+'&dokey='+dokey,
        responseType:'text'
    })
    .then(function (response) {                    
        let html = '<b>Deployments ('+ response.data.resources.length +')</b><br><table class="hoverTable" style="border-spacing: 10px 10px; width:100%;">'

        // Create items array
        var resources = Object.keys(response.data.resources).map(function(key) {
            return [key, response.data.resources[key]];
        });
        
        // Sort the array based on the second element
        resources.sort(function(first, second) {
            return Date.parse(second[1].metadata.created_at) - Date.parse(first[1].metadata.created_at);
        });

        for (let r in resources) {
            html += '<tr>'
            let res = resources[r][1];
            let isBold = ('deployment_id' in config[dokey] && config[dokey].deployment_id == res.metadata.guid)
            let sbold = isBold ? '<b>' : '';
            let ebold = isBold ? '</b>' : '';
            html += '<td>' + sbold + res.entity.name + ebold + '</td>';
            if ('compute' in res.entity)  {
                html += '<td>' + sbold + res.entity.compute.name + ebold + '</td>';
                html += '<td>' + sbold + res.entity.compute.nodes + ebold + '</td>';
            } else {
                html += '<td></td>';
                html += '<td></td>';
            }
            html += '<td>' + sbold + res.entity.status.state + ebold + '</td>';
            html += '<td>' + sbold + res.metadata.created_at + ebold + '</td>';
            html += '<td>' + sbold + res.metadata.guid + ebold + '</td>';
            if (isBold) {
                html += '<td></td>';
            } else {
                html += '<td>' + sbold + '<div id="'+divId+'_SELECT_'+res.metadata.guid+'" style="cursor:pointer">SELECT</div>'+ ebold +'</td>';
            }
            html += '<td>' + sbold + '<div id="'+divId+'_DELETE_'+res.metadata.guid+'" style="cursor:pointer">DELETE</div>'+ ebold + '</td>';
            html += '</tr/>';                       
        }
        html += '</table>';
        configDiv.innerHTML = html;
        for (let r in response.data.resources) {
            let res = response.data.resources[r];
            document.getElementById(divId+'_DELETE_'+res.metadata.guid).onclick = function() {
                deleteDeployement(workspace, dokey, res.metadata.guid, divId);
            }
            let isBold = ('deployment_id' in config[dokey] && config[dokey].deployment_id == res.metadata.guid)
            if (!isBold)
                document.getElementById(divId+'_SELECT_'+res.metadata.guid).onclick = function() {
                    selectDeployment(workspace, dokey, res.metadata.guid, divId);
                }
        }
    })
    .catch(showHttpError);     
}

// uses dokey and workspace and config

function showWML(divId) {
    if (divId == undefined)
        divId = 'wml_dev_div';    

    let div = document.getElementById(divId);

    let html = ''

    if ((dokey in config) && ('type' in config[dokey]))
        html += '(' + config[dokey].type.toUpperCase() + ')';
    else if (!('do' in config))
        html += '(none)';
    else
        html += '(default)';    
    html += '  ';

    
    if ((dokey in config) && ('type' in config[dokey]) && (config[dokey].type.toUpperCase() =='WML')) {
        html += '<button type="button" id="' + divId + '_DEPLOY"  title="Deploy" class="btn btn-outline-secondary btn-sm">DEPLOY</button>';
        html += '<button type="button" id="' + divId + '_CONFIG_SOLVE"  title="Configurations" class="btn btn-outline-secondary btn-sm">CONFIGURATIONS</button>';
    }

    html += '<div class="row" style="height:5px">  </div>';
    html += '<div id="'+divId+'_CONFIG_DIV"><div id="'+divId+'_CONFIG_DIV_DEPLOYED_MODELS"></div><div id="'+divId+'_CONFIG_DIV_DEPLOYMENTS"></div></div>';

    div.innerHTML = html;

    let configDiv = document.getElementById(divId+'_CONFIG_DIV');
    configDiv.style.display = 'none';

    

    if ((dokey in config) && ('type' in config[dokey]) && (config[dokey].type.toUpperCase() =='WML')) {
        document.getElementById(divId+"_CONFIG_SOLVE").onclick = function()
        {
            let configDiv = document.getElementById(divId+'_CONFIG_DIV');
            if (configDiv.style.display == 'none') {
                configDiv.style.display = 'block';
                getSolveDeployedModels(workspace, dokey, divId+'_CONFIG_DIV_DEPLOYED_MODELS');
                getSolveDeployments(workspace, dokey, divId+'_CONFIG_DIV_DEPLOYMENTS');
            } else
                configDiv.style.display = 'none';   
        };

        document.getElementById(divId+"_DEPLOY").onclick = function()
        {           
            deployWML(workspace, dokey, function () {
                getSolveDeployedModels(workspace, dokey, divId+'_CONFIG_DIV_DEPLOYED_MODELS');
                getSolveDeployments(workspace, dokey, divId+'_CONFIG_DIV_DEPLOYMENTS');
            })
        }
    }
}