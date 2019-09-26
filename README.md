# do-ws-js
This library provides both **back-end** and **front-end** services and APIs to ease the development of LoB application using Decision Optimization and Machine Learning for Watson Studio and Watson Machine Learning, including integration with Planning Analytics.

It includes support for:
* **scenario management** of LoB application: store different sets of data as scenario.
* **LoB User Interface** using google and d3 components: tables, charts, gantt charts, etc.
* **integration of deployed optimization and machine learning models execution** easer using Watson Studio or Watson Machine Learning.
* **integration with decision optimization and machine learning models development in Watson Studio** pushing production data to the development environment projects.
* **integration with Planning Analytics** for more complete mulyti user interactive strategic what-if applications.

##### Table of Contents  
* [Technical pre-requisites](#Technical-pre-requisites)  
* [Release Notes](#Release-Notes)
* [Functionalities](#Functionalities)
  * [Scenario Management](#Scenario-Management)
  * [LoB User Interface](#LoB-User-Interface)
  * [Decision Optimization](#Decision-Optimization)
  * [Machine Learning](#Machine-Learning)
  * [Watson Studio](#Watson-Studio)
  * [Planning Analytics](#Planning-Analytics)
* [Documentation](#Documentation)
  * [REST APIs](#REST-APIs)
  * [JavaScript classes and methods](#JavaScript-classes-and-methods)
  * [Configuration file format](#Configuration-file-format)

## Technical pre-requisites

It is constructed around the Node js framework, including:
* a set of back-end services provided as REST APIs which can be added to an express Node JS server
* a set of corresponding front end Javascript classes and functions, which use these back end APIs and support the creation of front end. 

A demonstration application is available at: https://github.com/IBMDecisionOptimization/do-ws-pa

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
./workspaces/default/config.json
```

Using configuration files, you can manage several configurations in the same instance of the service.
See documentation below on configuration file format

## Release Notes
* 1.123 dokey and addSolveWidget
* 1.122 mlkey and score widget
* 1.118 improved vega widget (container arg and resize)
* 1.114-1.117 Fixed use of WML from some cloud servers which was crashing.
* 1.113 edition of tables without id
* 1.111-1.112 better list of deployed models and deployements for MWL, with DELETE, and manual deployment
* 1.104-1.110 merge pa and app codes, added pa.js file.
* 1.103 removed pa output prefix
* 1.102 improved PA init 
* 1.101 added code to allow initialization of PA from a workspace and scenario
* 1.98/1.99 ws condif taken form the right workspace, and paameters table Id configurable
* 1.97 now support new DO for WML deployment to solve optimization, see additional do configurtion below
* 1.96 all DSX references have been renamed to WS, in APIs, configurations, UI, etc
* 1.90 for consistency config.mapping should now be in config.pa.mapping
* 1.89 **new structure for configuration and workspaces** + nicer scenario explorer
* 1.85 lots of improvements for sensitivity analysis
* 1.81 improved performance on PA import/export + solve on desktop.
* 1.78 improve status for import/export PA
* 1.77 lots of new stuf including **modeling assistant support**
* 1.64 maintenance
* 1.59 **workspaces overview**
* 1.57 json editor
* 1.56 d3 fixed for v3
* 1.54 **configurations under config directory and use of workspace URL parameter**  and fixes
* 1.47 fixes between import progress and grid redraw
* 1.46 job ids used in dodata saved local files
* 1.43 **ML support**
* 1.42 sensitivity chart and run on grid, scnerioa run, dsx on cloud
* 1.41 scanerio chart select KPI + KPI chart on selected/reference
* 1.39 id -> allow edition
* 1.38 import and put model, workspace for model
* 1.37 small fixes
* 1.36 config in scenariomgr + autoid **need to pass config in scenariomgr constructor**
* 1.35 fix diffs
* 1.34 scenario workspace **need subfolder on data**
* 1.33 import all scenario, dashboard checkbox, multiple tables widget
* 1.32 much better import (select models, etc)
* 1.31 better import
* 1.30 inputs and outputs, delete scenario, vega lite multiple scenario, kpis update
* 1.29 dsx timeout
* 1.28 gridconfig and do config **need app config for optim**

## Functionalities

### Scenario Management

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
It can be included in the config.json configuration file.

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

### Decision Optimization
This library of back end and front end functions allow to easily integrate the call to a deployed Decision Optimization in Watson Studio from a node js application.
  
Included in the dods set of back end functions.

#### DO runtimes supported
You can solve using:
* **Watson Studio Local <= 1.2.3 Model Management and Deployment APIs**: you need to provide the URL and key of the deployed model. You dont need to provide a model as it is deployed.
```
    "do" : {
        "url" : "https://9.20.64.100/dsvc/v1/cps/domodel/optim/model/CPS_LM_saved",
        "key" : "Bearer XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    }
```
* **DO CPLEX CLOUD**: you must provide the URL of DO CPLEX CLOUD, your API key and the model to use: (the model.py file should be in the do directory on the back end side).
```
    "do" : {  
        "url":  "https://api-oaas.docloud.ibmcloud.com/job_manager/rest/v1/",
        "key": "api_7fe447c0-46eb-4f68-a7e5-196c95be0260",
        "model": "model.py"
    }
```
* **Desktop**: you just provide the name of the model to use (traken from do directory). You need your backend server to have python, docplex and cplex installed correctly:
```
    "do": {
        "model": "model.py",
        "type": "desktop"
    }
```    
* **WML**: *coming soon*

#### Solve using scenario

Using the scenario on the front end allows to use very simple action functions. To solve, use:
```
let scenario = scenariomgr.getSelectedScenario();
scenario.solve(
    function (status) {
        // disply status
    }, function () { 
        // do something with scenario when finished
    });
```

#### Solve without using a scenario

If you prefer not use the scenario but want to solve a model using a set of csv file, you can still get support from the back end functions doing something like :

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
                                if ('csv' in oa)
                                    scenario.addTableFromCSV(tableName, oa.csv, 'output', scenariomgr.config[oa.name]);     
                                else
                                    scenario.addTableFromRows(oa.name, oa.table.rows, 'output', scenariocfg[oa.name]);   
                        }

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

### Machine Learning

This library of functions allows you to easily run scoring of a machine learning deployed on Watson machine learning.

The URL and key for machine learning models is provided on the back end side. The configuration can be either passed to the routing initialization functions or included in a JSON configuration file.

Are currently supported the execution of a WML deployed machin model (Cloud only)

### Watson Studio
This library of functions allow to easily connect scenarios to Watson Studio (Local) environment so that ethe data scientist can work on creating the models to be deployed and then integrated.

With simple functions you can create a project in a existing cluster, and push some tables of a scenario as data assets, so that the Data Scientist will be able to formulate and debug an optimization model.

### Planning Analytics
This library of back-end and front-end functions allow to easily connect to Planning Analytics.
Functions allow to connect to an existing TM1 serverm using authentication, and list cubes and dimensions.
Functions allow to read cubes and dimension into scenarios.
Functions allow to write scenarios to cubes and dimensions.

With these APIs and functions you can easily create a widget to integrate DO into PA, such as:

![DO dev in PA](/images/padev.png)

## Documentation

### REST APIs

### JavaScript classes and methods

### Configuration file format

**Since 1.89 all workspaces specific files are under workspaces folder.**

For each application (that can be used with workspace=XXX), there is a configuration file under workspaces/XXX/config.json It looks like (this one if the default one when no workspace is given):

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
    "ws" : {
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
* **ws**: (optional) configuration of connection to some Watson Studio Local instance to import models and data.
* **do**: configuration of how optimization is executed
  * **do.type** can be used to indcate solve mode (e.g. "desktop" means models are solved on the back end server and not sent to a service.
  * **do.url** the url of the solve service
  * **do.key** the key for the solve service
  * **do.model** the name of the model file (stored under ./dodata/myworkspace/) to be used when solving with a service that has not pre-deployed model.
  * **do.action.text** the text of the button to be used in the default UIs for thesolve button.
* **ui**: configuration of some additional UI properties, including the use of a separate JS file which will do some more precise setup of the grid layout.
  * **ui.title** the title of the grid 
  * **ui.gridjs** a file stored beside configuration to be executed with javascript code for creating the grid, see some examples in the different workspaces of the demo application (https://github.com/IBMDecisionOptimization/do-ws-ucp-demo-app/tree/master/config/ta)
  * **ui.grid** a json configuration of the grid 
* **pa**: (optional) connection to Planning Analytics
  * **pa.mapping**: (optional) mapping between PA cubes and dimensions and tables.



You can refer to [do-ws-pa documentation](https://github.com/IBMDecisionOptimization/do-ws-pa/blob/master/README.md) for more information on the configuration of PA section.


#### WS configuration

The WS configuration is used to set the connection information for the project and data assets creation in the development environment. You can also choose the name of the project to use. The service will create the project if it does not exist. 

This part is only working for WS local only at this point.

It can be something like:

```
	"ws": {
		"url": "https://9.20.64.100",
		"login": "alain.chabrier@ibm.com",
		"password": "Hot6cold",
		"projectName": "PA3"
	},
```

#### DO configuration

The DO configuration is used to connect to a DO deployed model to be used to solve the problem from Planning Analytics.

Currently supported type of configurations are:



##### DO for WML

The execution will occur on new Do for WML instance.
You can either provide a pre-deployed `deployment_id`, or provide a model which will be deloyed.


Providing the `deployment_id`, it will be directly used.
```
 "do": {
        "type": "wml",
        "apikey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "instance_id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxx
        "url": "https://us-south.ml.cloud.ibm.com",
        "action": {
            "text": "PLAN"
        },
        "deployment_id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
``` 

Otherwise, you can provide  the `model` which  will get deployed and startup and then used.
```
 "do": {
        "type": "wml",
        "apikey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "instance_id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxx
        "url": "https://us-south.ml.cloud.ibm.com",
        "model": "model.py"        
    },
```


##### Desktop

The CPLEX engines must be installed oin the machine where the service is running

```
	"do": {
  "type" : "desktop",
		"model" : "model.py"
	},
```
 
##### WS Local MMD deployed model

```
	"do": {
		"url": "https://9.20.64.100/dsvc/v1/ucp/domodel/optim/model/UCPsaved",		
		"key": "Bearer ________________mybearer_____________"
	},
 ```
 
##### DO CPLEX CLOUD

The model used should be inclued in the dodata directory.

```
	"do": {
		"model" : "model.py",
		"url": "https://api-oaas.docloud.ibmcloud.com/job_manager/rest/v1/",		
		"key": "api____________________________________"
	},
```

#### ML configuration

The ML configuration is used to connect to a ML deployed model to be used to score  from Planning Analytics.

Currently supported type of configurations are:

#### WML Cloud

```
	"ml": {
		"url": "https://us-south.ml.cloud.ibm.com/v3/wml_instances/8a69e5fe-b112-4b92-adfd-0dbce326332b/deployments/25b7a943-3578-4e88-a308-432718177678/online",
		"apikey": "_____________________________",
		"input": "Diabetes",
		"output": "DiabetesOutcome"
	},
```

#### PA configuration

Your Planning Analytics configuration can point either to a Local or Cloud setup.

The most complex part is to configure the TM1 authentication credentials.
See the page (https://www.ibm.com/support/knowledgecenter/en/SS9RXT_10.2.2/com.ibm.swg.ba.cognos.tm1_rest_api.10.2.2.doc/dg_tm1_odata_auth.html) for information on TM1 

**Local configuration with a login URL**
```
	"pa": {	
		"description": "PA Local on ibmdemos",
		"loginurl": "http://ibmdemos/login",
		"url": "http://ibmdemos/tm1/Decision%20Optimisation",
		"username": "pm",
		"password": "IBMDem0s",
		"mapping" : {
			...
		}
	}
```

* `Decision Optimization` is the TM1 server name
* Ask your PA administrator for the authorized `username` and `password`.

**Local configuration with a CAMNameSpace**
```
	"palocal": {	
		"description": "PA Local on ibmdemos",
		"url": "http://ibmdemos:54045",
		"username": "pm",
		"password": "IBMDem0s",
		"camnamespace": "Harmony LDAP",
		"mapping" : {
			...
		}
	}
```

* `"Harmony LDAP` is the camnamespace
* Ask your PA administrator for the authorized `username` and `password`.

**Cloud configuration**

```
	"pa": {
		"authurl" : "https://ibmtraining.planning-analytics.ibmcloud.com/oauth2/token",
		"url" : "https://ibmtraining.planning-analytics.ibmcloud.com/api/v0/tm1/Decision%20Optimisation",
		"accountId": "xxxxxxxxxxxx",
        	"tenantId": "xxxxxxxxxxxx",
        	"userId": "xxxxxxxxxxxx",
        	"username": "xxxxxxxxxxxx",
		"password": "xxxxxxxxxxxx",
		"mapping" : {
			...
		}
	}
```
* `Decision Optimization` is the TM1 server name
* Ask your PA administrator for the cerdentals `accountId`, `tenantId`, `userId`, `username` and `password`
