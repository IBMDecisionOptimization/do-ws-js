# do-ws-js
This library provides both **back-end** and **front-end** services and APIs to ease the development of LoB application using Decision Optimization and Machine Learning for Watson Studio and Watson Machine Learning.

It includes support for:
* **scenario management** of LoB application: store different sets of data as scenario.
* **LoB User Interface** using google and d3 components: tables, charts, gantt charts, etc.
* **integration of deployed optimization and machine learning models execution** easer using Watson Studio or Watson Machine Learning.
* **integration with decision optimization and machine learning models development in Watson Studio** pushing production data to the development environment projects.
* **integration with Planning Analytics** for more complete mulyti user interactive strategic what-if applications.

##### Table of Contents  
* [Technical pre-requisites](Technical pre-requisites)  
* [Functionalities](Functionalities)
* [Scenario Management (scenario)](Scenario_Management_(scenario))
* [LoB User Interface](LoB_User_Interface)
* [Decision Optimization (do)](Decision_Optimization_(do))
* [Machine Learning (ml)](Machine_Learning_(ml))
* [Watson Studio (dsx)](Watson_Studio_(dsx))
* [Planning Analytics (pa)](Planning_Analytics_(pa))

## Technical pre-requisites

It is constructed around the Node js framework, including:
* a set of back-end services provided as REST APIs which can be added to an express Node JS server
* a set of corresponding front end Javascript classes and functions, which use these back end APIs and support the creation of front end. 

A demonstration application is available at: https://github.com/IBMDecisionOptimization/do-ws-ucp-demo-app

### Setting package dependency

To use this module, include it in your package.json file:
```
  "dependencies": {
   ...
    "do-ws-js": "0.1.x"
  },
```
  
To use the back end functions, extend the express router of your node.js app doing, for example with the scenario componetn of the dods part.
```
var router = express.Router();              // get an instance of the express Router
var dods = require('do-ws-js/dods');
dods.routeScenario(router);
```

To use the front end functions, include the right Javascript file, for example:
```
<script type="text/javascript" src="./do-ws-js/scenario.js"></script>
```

### Configuration

The configuration for the different set of back end APis can be provided either at the initialization:
```
configdo = {
  url:  'https://api-oaas.docloud.ibmcloud.com/job_manager/rest/v1/',
  key: 'api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  model: 'model.py'
}

dods.routeSolve(router, configdo);
```

Or using a configuration under:
```
./config/default/config.json
```

Usgin configuration files, you can manage several configurations in the same instance of the service.

## Functionalities

### Scenario Management (scenario)

#### back-end
These APIs support scenariomanagement on server side.
Scenarios are currently persisted as csv files in the file system (and hence are not appropriate for very large scenarios size).
Multiple scenarios are supported.
  
APIs include the ability to list all scenarios,, create new ones, delete existing ones. For a given scenario, list all tables, get content for a table, update table content, etc.

Included in the dods set of back end functions.
  
#### front-end
These functions allow to use the back end scenario APIs without writing any REST API code but using scenario manager and scenario Javascript objects and load or save them easily from/to the back-end / front-end.
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

This configuration is given to the constructor of the scenario manager.

### LoB User Interface

On the front-end side, many functions are available to easily enable a User Interface for the Line of Business user to interact with the scenarios and optimization and/or machine learning.

#### scenario-grid:

The scenario grid component allows to create a grid of widget that can be given a layout which can be changed by LoB.

The code to use is pretty starightforwrad:
```
        scenariogrid = new ScenarioGrid('UnitCommitment Demo', 'scenario_grid_div', scenariomgr);

        scenariogrid.addScenarioWidget(onChangeScenario, 0, 0, 2, 2);

        scenariogrid.addKPIsWidget(2, 0, 10, 5);
```        

Which will render like:
![Scenario Grid](/images/grid.png)

Many predefined types of components are available to be used in the grid or without the grid.

#### scenario-google:

This library of javascript functions allows to easily create HTML google tables or charts on the data of the scenario, using the previous scenario APIs.
You can create a multi tab table view of a set of tables using:
```
showAsGoogleTables(scenario, 'inputs_div', 'input',
                undefined,
                 scenariocfg)
```

That will look like:

![Scenario selector](/images/table.png)

The google table allows **edition** of rows if the allowEdition option as been set to true in the scenario configuration for the corresponding table.

That will look like:

![Edition](/images/edit.png)

The table also support pair wise scenario comparison:

![Comparison](/images/comparison.png)

You can also create KPI comparison charts which will look like:

![Charts](/images/charts.png)

And other types of charts:

![Scenario selector](/images/kpis.png)

#### scenario-d3

This library allows to easily create d3 charts using the scenario library. d3 is a framework to create interactive charts oin the web, see lots of examples at https://github.com/d3/d3/wiki/Gallery

That can look like:

![d3charts](/images/d3.png)

Or like:

![d3nvcharts](/images/d3charts.png)

#### scenario-gantt
This library allows to easily create gantt charts using the scenario library.

That will look like:

![Scenario selector](/images/gantt.png)

### Decision Optimization (do)
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

The URL and key for optimization is provided on the back end side. The configuration can be either passed to the routing initialization functions or included in a JSON configuration file.

Are currently supported the execution of a WML deployed optimization model (Local only) and the use of the DO CPLEX CLOUD services.

### Machine Learning (ml)

This library of functions allows you to easily run scoring of a machine learning deployed on Watson machine learning.

The URL and key for machine learning models is provided on the back end side. The configuration can be either passed to the routing initialization functions or included in a JSON configuration file.

Are currently supported the execution of a WML deployed machin model (Cloud only)

### Watson Studio (dsx)
This library of functions allow to easily connect scenarios to Watson Studio (Local) environment so that ethe data scientist can work on creating the models to be deployed and then integrated.

With simple functions you can create a project in a existing cluster, and push some tables of a scenario as data assets, so that the Data Scientist will be able to formulate and debug an optimization model.
  
Included in the dodsxpa set of back end functions.

### Planning Analytics (pa)
This library of back-end and front-end functions allow to easily connect to Planning Analytics.
Functions allow to connect to an existing TM1 serverm using authentication, and list cubes and dimensions.
Functions allow to read cubes and dimension into scenarios.
Functions allow to write scenarios to cubes and dimensions.

With these APIs and functions you can easily create a widget to integrate DO into PA, such as:

![DO dev in PA](/images/padev.png)

Included in the dodsxpa set of back end functions.  

## Configuration file format

For each application (that can be used with workspace=XXX), there is a configuration file under config/XXX/config.json It looks like (this one if the default one when no workspace is given):

```
{
    "name": "UCP",
    "scenario" : {        
        "config" : {
            "Units" : { "id":"Units", "title":"Units", "allowEdition":true},        
            "Loads" : {  "id":"Periods", "title":"Load", "allowEdition":true},
            "UnitMaintenances" : {"id":null, "title":"Maintenances", "allowEdition":true, "maxSize":1680},
            "Periods" : { "id":"Id", "title":"Periods"},
            "Weights" : { "id":"Id", "title":"Weights", "allowEdition":true},

            "production" : { "title":"Production", "columns": ["Units", "Periods", "value"] },
            "started" : { "title":"Started", "columns": ["Units", "Periods", "value"]},
            "used" : { "title":"Used", "columns": ["Units", "Periods", "value"]},
            "kpis" : { "id":"kpi", "title":"KPIs"}
        }
    },
    "dsx" : {
        "type" : "local",
        "apiurl": "https://xxxxxx
        "url": "https://xxxxx
        "login": "alain.chabrier@ibm.com",
        "password": "xxxxxxxxxxxxx",
        "projectName": "PA3"
      },
    "do" : {  
        "url":  "https://api-oaas.docloud.ibmcloud.com/job_manager/rest/v1/",
        "key": "api_xxxxxxxxxxxxxxxxxxxxxxxxx",
        "model": "model.py"
    },
    "ui" : {
        "title": "Unit Commitment",
        "grid" : "grid.js"
    }

}
```

The difference sections:
* **name** the name of the configuration
* **scenario**: some configuration on the different tables (input and output) used in the scenarios.
 * **scenario.config** the configuration for scenarios, one item for each table
   * **scenario.config.table1.id** the id column of the table
   * **scenario.config.table1.title** the title to use for the table
   * **scenario.config.table1.allowEdition** will set the table as editable or not.
* **dsx**: (optional) configuration of connection to some Watson Studio Local instance to import models and data.
* **do**: configuration of how optimization is executed
* **ui**: configuration of some additional UI properties, including the use of a separate JS file which will do some more precise setup of the grid layout.
