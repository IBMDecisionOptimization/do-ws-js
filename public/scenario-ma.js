function showAsMA(scenariomgr, divId) {

    function createDataSet(cb) {
        let scenario = scenariomgr.getSelectedScenario();

        showLoader();
        axios({
            method: 'put',
            url: './api/ma/dataset?scenario='+ scenario.getName() + '&workspace='+scenariomgr.workspace,
            responseType:'json'
        }).then(function(response) {
                console.log('Created MA Data set');
                cb();
        });

    }

    function refineSession() {
        let scenario = scenariomgr.getSelectedScenario();

        showLoader();
        axios({
            method: 'post',
            url: './api/ma/session?scenario='+ scenario.getName() + '&workspace='+scenariomgr.workspace,
            data: scenario.co_session,
            responseType:'json'
        }).then(function(response) {
                console.log('Updated MA session');
                scenario.co_session = response.data;
                if (scenario.co_session.alerts.length > 0)
                    alert(scenario.co_session.alerts[0].verbalization)
                for (let c in scenario.co_session.suggestedStatements) 
                    setEditable(scenario.co_session.suggestedStatements[c], true);                           
                macb();
                saveSession();                    
        });

    }

    function saveSession() {
        let scenario = scenariomgr.getSelectedScenario();

        axios({
            method: 'put',
            url: './api/ma/session?scenario='+ scenario.getName() + '&workspace='+scenariomgr.workspace,
            data: scenario.co_session,
            responseType:'json'
        }).then(function(response) {
                console.log('Saved MA session');
        });

    }

    function updateMAModel() {
        let scenario = scenariomgr.getSelectedScenario();

        axios({
            method: 'post',
            url: './api/ma/model?scenario='+ scenario.getName() + '&workspace='+scenariomgr.workspace,
            data: scenario.co_session,
            responseType:'json'
        }).then(function(response) {
                console.log('Updated MA model');
        });

    }

    function initMA() {
        let scenario = scenariomgr.getSelectedScenario();
        showLoader();
        createDataSet(function () {
            for (let c in scenario.co_session.suggestedStatements) 
                setEditable(scenario.co_session.suggestedStatements[c], true);
            macb();
        });        
    }


    function maquery() {
        let scenario = scenariomgr.getSelectedScenario();
        scenario.co_session.statementQuery = document.getElementById('MA_QUERY_TEXT').value;;
        refineSession();
    }

    function maremove(t) {
        let scenario = scenariomgr.getSelectedScenario();

        scenario.co_session.suggestedStatements.push(scenario.co_session.constraints[t]);
        scenario.co_session.constraints.splice(t, 1);

        macb();
        saveSession();
    }

    function maadd(t) {
        let scenario = scenariomgr.getSelectedScenario();
        
        scenario.co_session.constraints.push(scenario.co_session.suggestedStatements[t]);
        scenario.co_session.suggestedStatements.splice(t, 1)
        
        macb();
        saveSession();
    }

    // "properties": {
    //     "@class": "java.util.HashMap",
    //     "visible": 4,
    //     "editable": true
    //   },
    function setEditable(statement, value) {
        if (!('properties' in statement) || (statement.properties == null))
            statement.properties = {
                    "@class": "java.util.HashMap",
                    "editable": value
                };
    }
    function isEditable(statement) {
        if (!('properties' in statement))
            return false;
        if (statement.properties == null)
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

    function showContent() {
        let loaderDiv = document.getElementById(divId+'_loader');
        loaderDiv.style.display = 'none';
        let contentDiv = document.getElementById(divId+'_content');
        contentDiv.style.display = 'block';
    }
    function showLoader() {
        let loaderDiv = document.getElementById(divId+'_loader');
        loaderDiv.style.display = 'block';
        let contentDiv = document.getElementById(divId+'_content');
        contentDiv.style.display = 'none';
    }
    function macb() {

        let scenario = scenariomgr.getSelectedScenario();
        
        if (scenario.co_session != undefined) {
            let session = scenario.co_session;
            let contentDiv = document.getElementById(divId+'_content');
            let html = '<table width="100%">';

            //html += '<tr><th width="50%">Model</th><th width="50%">Suggestions</th></tr>';
            
            html += '<tr><td width="50%">';
            html += '<b>Base Goals</b>:<br>';
            for (let c in session.goals)
                html += session.goals[c].verbalization + '<br>';
            html += '<br>';
            html += '<b>Base Constraints</b>:<br>';
            for (let c in session.constraints) {
                if (isEditable(session.constraints[c]))
                    continue;
                html += '<i>';                
                html += session.constraints[c].verbalization;
                html += '</i>';
                html += '<br>';
            }
            html += '<br>';
            html += '<b>Additional Constraints</b>:<br>';
            let n = 0;
            for (let c in session.constraints) {
                if (isEditable(session.constraints[c])) {
                    html += '<button type="button" class="btn btn-default btn-xs" aria-label="Left Align" id="MA_REMOVE_'+n+'" style="background: url(./do-ws-js/images/minus-24.png); width: 24px; height:24px">';
                    //html += '<span class="glyphicon glyphicon-minus" aria-hidden="true"></span>';
                    html += '</button>  ';
                    html += session.constraints[c].verbalization;
                    if (!isEditable(session.constraints[c]))
                        html += '</i>';
                    html += '<br>';
                }
                n += 1;
            }
            html += '</td>';

            html += '<td  width="50%" valign="top">';

            html += '<b>Find more constraints:</b>';
            
            html += '<br>';
            
            //html += '<input id="MA_QUERY_TEXT" type="text">';
            //<input id="MA_QUERY" type="button" value="SUGGEST"><br>';


            html += '<div class="col-lg-6">';
            
            html += '<div class="input-group">';

            html += '<input type="text" id="MA_QUERY_TEXT" class="form-control" placeholder="Search for..." value="'+scenario.co_session.statementQuery+'">';
            html += '<span class="input-group-btn">';
            html += '<button type="button" class="btn btn-default" aria-label="Left Align" id="MA_QUERY" style="background: url(./do-ws-js/images/find-24.png); width: 24px; height:24px" >';
            //html += '<span class="glyphicon glyphicon-search" aria-hidden="true"></span>';
            //html += '<span><img src="./do-ws-js/images/find-24.png"/></span>';
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
                    html += '<button type="button" class="btn btn-default btn-xs" aria-label="Left Align" id="MA_ADD_'+n+'" style="background: url(./do-ws-js/images/plus-24.png); width: 24px; height:24px">';
                    //html += '<span class="glyphicon glyphicon-plus" aria-hidden="true"></span>';
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
            contentDiv.innerHTML = html;

            document.getElementById("MA_QUERY").onclick = maquery;
            document.getElementById("MA_QUERY_TEXT").addEventListener("keyup", function(event) {
                event.preventDefault();
                if (event.keyCode === 13) {
                    document.getElementById("MA_QUERY").click();
                }
            });

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

            showContent();
        }
    }

    let div = document.getElementById(divId);
    div.innerHTML = '<h4>Decision Optimization Modeling Assistant:</h4> <br> <div class="loader" id="'+divId+'_loader"></div><div id="'+divId+'_content">';
    showLoader();

    initMA();

}