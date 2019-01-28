# do-ws-js
This library provides lots of back end and front end goodies to eSe the development of LoB application using Decision Optimization for Watson Studio (DO for WS).

It is constructed around the Node js technology, including:
* a set of back end fuctions which can be added to an express Node JS server
* a set of corresponding front end functions, which use these back end functions and ease the creation of front end. 

To use this module, include it in your package.json file:
```
  "dependencies": {
   ...
    "do-ws-js": "0.1.x"
  },
```
  
To use the back end functions, extend your node.js app doing, for example:
```
var router = express.Router();              // get an instance of the express Router
var dods = require('do-ws-js/dods');
dods.routeScenario(router);
```

To use the fron end functions, include the right jsvascript file, for example:
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
These functions allow to use the back end scenatrio without writing any REST code but using scenario manager and scenario objects, load or save them easily form/to the back-end / front-end.
Functions to create some HTML components to manage scenarios are also available.

You can hence create a scenario selector widget with:
```
scenariomgr = new ScenarioManager();        
scenariomgr.loadScenarios(scenariocfg);
scenariomgr.showAsSelector(`scenario_div`, onChangeScenario);
```

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

You can also create KPI compariaons charts, etc.

## scenario-d3

This library allows to easily create d3 charts using the scenario library.

## scneario-gantt
This library allows to easily create gantt charts using the scenario library.


## do:
This library of back end and front end functions allow to easily integrate the call to a deployed Decision Optimization in Watson Studio from a node js application.
  
Included in the dods set of back end functions.
  

## dsx: 
This library of functions allow to easily connect scenarios to Watson Studio (Local) environment where the optimization model canbe developped.

With simple functions you can create a project in a existing cluster, and push some tables of a scenario as data assets, so that the Data Scientist will be able to formulate and debug an optimization model.
  
Included in the dodsxpa set of back end functions.

## pa:
This library of back-end and fron-tned functions allow to easily connect to Planning Analytics.
Functions allow to connect to an existing TM1 serverm using authentication, and list cubes and dimensions.
Functions allow to read cubes and dimension into scenarios.
Functions allow to write scenarios to cubes and dimensions.

Included in the dodsxpa set of back end functions.  
