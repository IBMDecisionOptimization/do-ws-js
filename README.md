# do-ws-js
This library provides lots of back end and front end goodies to ease the development of LoB application using Decision Optimization for Watson Studio (DO for WS).

It is constructed around the Node js framework, including:
* a set of back end REST APIs which can be added to an express Node JS server
* a set of corresponding front end Javascript functions, which use these back end APIs and ease the creation of front end. 

To use this module, include it in your package.json file:
```
  "dependencies": {
   ...
    "do-ws-js": "0.1.x"
  },
```
  
To use the back end functions, extend your node.js app doing, for example with the dods part.
```
var router = express.Router();              // get an instance of the express Router
var dods = require('do-ws-js/dods');
dods.routeScenario(router);
```

To use the front end functions, include the right Javascript file, for example:
```
<script type="text/javascript" src="./do-ws-js/scenario.js"></script>
```

## Scenario: 

### back-end
These functions allow to manage scenario on server side.
Scenarios are persisted as csv files in the file system (and hence are not appropriate for very large scenarios size).
Multiple scenarios are supported.
  
APIs include the ability to list all scenarios,, create new ones, delete existing ones. For a given scenario, list all tables, get content for a table, update table content, etc.

Included in the dods set of back end functions.
  
### front-end
These functions allow to use the back end scenario APIs without writing any REST code but using scenario manager and scenario Javascript objects and load or save them easily from/to the back-end / front-end.
Functions to create some HTML components to manage scenarios are also available.

You can hence create a scenario selector widget with:
```
scenariomgr = new ScenarioManager();        
scenariomgr.loadScenarios(scenariocfg);
scenariomgr.showAsSelector(`scenario_div`, onChangeScenario);
```

That will look like:

![Scenario selector](/images/scenarios.png)

The currently selected scenario can be accessed using:
```
scenariomgr.getSelectedScenario()
```

The scenario configuration allows to select the tables to use, the id columns of the table to use, and customize some visual elements like titles to be used when displaying.

Here is an example of configuration:
```
scenariocfg = {        
        'Canals' : { id:"id", title:"Canals", allowEdition:true},
        'Pipes' : { id:"id", title:"Pipes", allowEdition:true},
        'Stations' : { id:"id", title:"Stations", allowEdition:true},
        'Dams' : { id:"id", title:"Dams", allowEdition:true},
        'Tanks' : { id:"id", title:"Tanks",allowEdition:true},
        'Wells' : { id:"id", title:"Wells", allowEdition:true},

        'Nodes' : { id:"id", title:"Nodes"},
        'Links' : { title:"Links"}, // no id

        "kpis" : { cb : showKpis },

        "$scenario" : { cb : showInputsAndOutputs }
};
```


## scenario-google:

This library of javascript functions allows to easily create HTML google tables or charts on the data of the scenario, using the previous scenario APIs.
You can create a multi tab table view of a set of tables using:
```
showAsGoogleTables(scenario, 'inputs_div', 'input',
                undefined,
                 scenariocfg)
```

That will look like:

![Scenario selector](/images/table.png)

The google table allows edition of rows if the allowEdition option as been set to true in the scenario configuration for the corresponding table.

That will look like:

![Scenario selector](/images/edit.png)

You can also create KPI comparison charts which will look like:

![Scenario selector](/images/charts.png)

And other types of charts:

![Scenario selector](/images/kpis.png)

## scenario-d3

This library allows to easily create d3 charts using the scenario library. d3 is a framework to create interactive charts oin the web, see lots of examples at https://github.com/d3/d3/wiki/Gallery

That can look like:

![Scenario selector](/images/d3.png)

## scenario-gantt
This library allows to easily create gantt charts using the scenario library.

That will look like:

![Scenario selector](/images/gantt.png)

## do:
This library of back end and front end functions allow to easily integrate the call to a deployed Decision Optimization in Watson Studio from a node js application.
  
Included in the dods set of back end functions.
  
You can request a solve as easily as:
```

function solve() {
        var data = new FormData();

        let scenario = scenariomgr.getSelectedScenario();
        let tableIds = scenario.getInputTables()
        for (t in tableIds)  {
                let tableId = tableIds[t];
                data.append(tableId+".csv", scenario.getTableAsCSV(tableId));
        }
        
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
```

And check the status and get solution using:
```

function checkStatus() {
        let scenario = scenariomgr.getSelectedScenario();
        axios.get("/api/optim/status?jobId="+jobId)
        .then(function(response) {
                executionStatus = response.data.solveState.executionStatus
                console.log("JobId: "+jobId +" Status: "+executionStatus)
                document.getElementById('SOLVE').value = executionStatus;
                                
                if (executionStatus == "PROCESSED" ||
                        executionStatus == "INTERRUPTED" ) {
                        clearInterval(intervalId);
                        
                        let  nout = response.data.outputAttachments.length;
                        for (var i = 0; i < nout; i++) {
                                let oa = response.data.outputAttachments[i];
                                scenario.addTableFromRows(oa.name, oa.table.rows, 'output', scenariocfg[oa.name]);   
                        }

                        //document.getElementById('gantt_div').style.display="block";
                        showSolution(scenario);
                        showKpis(scenario);
                        enableSolve();

                }   
        })
        //.catch(showHttpError);    
}
```

## dsx: 
This library of functions allow to easily connect scenarios to Watson Studio (Local) environment where the optimization model canbe developped.

With simple functions you can create a project in a existing cluster, and push some tables of a scenario as data assets, so that the Data Scientist will be able to formulate and debug an optimization model.
  
Included in the dodsxpa set of back end functions.

## pa:
This library of back-end and front-end functions allow to easily connect to Planning Analytics.
Functions allow to connect to an existing TM1 serverm using authentication, and list cubes and dimensions.
Functions allow to read cubes and dimension into scenarios.
Functions allow to write scenarios to cubes and dimensions.

Included in the dodsxpa set of back end functions.  
