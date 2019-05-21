var configs = {}

function getWorkspace(req) {
    let workspace = req.query.workspace;
    if ( (workspace == undefined) || (workspace == "") )
        workspace = "default";
    return workspace;
}


function readConfig(workspace = 'default') {
    let CONFIG_FILE_NAME = "config.json";
   
    var fs = require('fs');

    let filePath = './config/'+workspace+'/'+CONFIG_FILE_NAME;
    if (!fs.existsSync(filePath)) {
        filePath = './config/default/'+CONFIG_FILE_NAME;
        if (!fs.existsSync(filePath)) 
            filePath = './'+CONFIG_FILE_NAME;
    }
    let config = {}
    if ('default' in configs)
        config = configs['default'];	
    if (fs.existsSync(filePath)) {
        let contents = fs.readFileSync(filePath, 'utf8');
        config = JSON.parse(contents);
    } 
    if (!('ui' in config))
        config.ui = {};
    configs[workspace] = config;
}


function getConfig(workspace = 'default') {
    if (!(workspace in configs))
        readConfig(workspace);
    return configs[workspace];
}

module.exports = {
    routeScenario: function (router) {
        var fs = require('fs');

        router.get('/scenarios', function(req, res) {
            console.log('/api/scenarios called');
            let workspace = getWorkspace(req);
            let dir = "./data/"+workspace;
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            var scenarios = fs.readdirSync(dir);
            res.json(scenarios);
        });

        router.get('/scenario/:scenario', function(req, res) {
            let scenario = req.params.scenario;
            let workspace = getWorkspace(req);
            console.log('GET /api/scenario/' + scenario + ' called');
            fs.readFile("./data/"+workspace+"/"+scenario+"/scenario.json", {encoding: 'utf-8'}, function(err,data){
                if (!err){
                    res.writeHead(200, {'Content-Type': 'text/json'});
                    res.write(data);
                    res.end();
                }else{
                    console.log(err);
                }
            });
        });

        router.patch('/scenario/:scenario', function(req, res) {
            let scenario = req.params.scenario;
            let name  = req.query.name;
            let workspace = getWorkspace(req);
            console.log('PATCH /api/scenario/' + scenario + ' called with new name ' + name);
            fs.rename('./data/'+workspace+'/'+scenario, './data/'+workspace+'/'+name, function(err,data){
                if (!err){
                    res.json({})
                }else{
                    console.log(err);
                }
            });
        });

        router.put('/scenario/:scenario', function(req, res) {
            let scenario = req.params.scenario;
            let workspace = getWorkspace(req);
            console.log('PUT /api/scenario/' + scenario + ' called');
            var dir = './data/'+workspace+'/'+scenario;
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            fs.writeFile("./data/"+workspace+"/"+scenario+"/scenario.json", JSON.stringify(req.body), { flag: 'w' },  function(err,data){
                if (!err){
                    console.log("Scenario saved  OK")
                    res.status(200);
                    res.end();
                }else{
                    console.log(err);
                }
            });
        });

        router.get('/scenario/:scenario/:table', function(req, res) {
            let scenario = req.params.scenario;
            let table = req.params.table; 
            let workspace = getWorkspace(req);
            console.log('GET /api/scenario/' + scenario + '/' + table + ' called');
            fs.readFile("./data/"+workspace+"/"+scenario+"/"+table+".csv", {encoding: 'utf-8'}, function(err,data){
                if (!err){
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.write(data);
                    res.end();
                }else{
                    console.log(err);
                }
            });
        });

        router.put('/scenario/:scenario/:table', function(req, res) {
            let scenario = req.params.scenario;
            let table = req.params.table; 
            let workspace = getWorkspace(req);
            console.log('PUT /api/scenario/' + scenario + '/' + table + ' called');
            fs.writeFile("./data/"+workspace+"/"+scenario+"/"+table+".csv", req.body.csv, { flag: 'w' },  function(err,data){
                if (!err){
                    console.log("Scenario table aved  OK")
                    res.status(200);
                    res.end();
                }else{
                    console.log(err);
                }
            });
        });
    },

    routeSolve: function (router, configdo = undefined) {     
        
        if (configdo != undefined)
            getConfig().do = configdo;
        
        var request = require('request');

        router.get('/optim/config', function(req, res) {
            console.log('/api/optim/config called');
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);

            if (!('model' in config.do)) {
                // Using WS/WML
                console.log("Get Config: " + config.do.url);
                let options = {
                    headers: {
                        "Authorization": config.do.key
                        },
                    url:     url,
                    secureProtocol : 'SSLv23_method'
                };

                request.get(options, function(error, response, body){
                    if (!error && response.statusCode == 200) {
                        console.log("Optim Config returned OK")
                        obj = JSON.parse(body);
                        config.do.SOLVE_URL = obj.deploymentDescription.links[1].uri
                        console.log("SOLVE_URL: " + config.do.SOLVE_URL);
                        config.do.SOLVE_CONFIG = obj.deploymentDescription.solveConfig
                        outputstr= '{    "type" : "INLINE_TABLE",    "name" : ".*",    "category" : "output"  }';
                        // SOLVE_CONFIG.attachments.push(JSON.parse(outputstr))
                        config.do.SOLVE_CONFIG.attachments = [ JSON.parse(outputstr) ]; // FIX for 1.2.2
                        res.json(obj);					
                                
                    } else
                        console.log("Optim Config error:" +error+ " response:" + JSON.stringify(response))
                    });
            } else {
                // Using DO CPLEX CLOUD
                res.json({"status": "Using DO CPLEX CLOUD with model: " + config.do.model });
            }
            
        });

        multer = require('multer');
        upload = multer({
            limits: { 
              fieldSize: 5 * 1024 * 1024 ,
              fileSize: 5 * 1024 * 1024 
            }
          })
          

        //////////////////////////////////////////////////////////////
        var fs = require('fs');
        function getCommonFile(workspace, fileName) {
            return  fs.readFileSync("./dodata/" + workspace + '/' + fileName, 'utf8');
        }
        function getFile(workspace, jobId, fileName) {
            let dir = "./dodata/"+workspace+'/'+jobId;
            return  fs.readFileSync(dir + '/' + fileName, 'utf8');
        }        
        function putFile(workspace, jobId, fileName, content) {
            let dir = "./dodata/"+workspace+'/'+jobId;
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            return  fs.writeFileSync(dir + '/' + fileName, content, 'utf8');
        }

        function createJob(workspace, model, inputs) {
            console.log("CREATE JOB");
            let config = getConfig(workspace);
            // https://developer.ibm.com/docloud/documentation/docloud/rest-api/rest-api-example/

            let attachments = []
            attachments.push({name: model});
            for (f in inputs)
                attachments.push({name: inputs[f]});

            var srequest = require('sync-request');
            let options = {
                type: "POST",
                url : config.do.url + 'jobs',
                json: {attachments : attachments},
                headers: {
                    "X-IBM-Client-Id": config.do.key,
                    "Content-Type": "application/json"
                }
            }
            //console.log(options)
            let res = srequest('POST', options.url, options);
            
            return res;
        }

        function pushAttachment(workspace, jobId, fileName, content) {
            console.log("PUSH ATTACHMENT "+ workspace + '/' + jobId+ '/' + fileName)
            //curl -i -H "X-IBM-Client-Id: <key>" -H "Content-Type: application/octet-stream" 
            // -X PUT -T truck.mod <URL>/jobs/<ID>/attachments/truck.mod/blob 
            let config = getConfig(workspace);
            let body = content;

            var srequest = require('sync-request');
            let options = {
                type: "PUT",
                url : config.do.url + 'jobs/' + jobId + '/attachments/' + fileName + "/blob",
                body : body,
                headers: {
                    "X-IBM-Client-Id": config.do.key,
                    "Content-Type": "application/octet-stream",
                    'Content-disposition': 'attachment; filename='+fileName
                }
            }
            let res = srequest('PUT', options.url, options);
            return res;
        }
        function pullAttachment(workspace, jobId, fileName) {
            console.log("PULL ATTACHMENT "+ workspace + '/' + jobId+ '/' + fileName)
            let config = getConfig(workspace);
            // curl -H "X-IBM-Client-Id: <key>" -X GET -o mysolution.json <URL>/jobs/<ID>/attachments/solution.json/blob
            var srequest = require('sync-request');
            let options = {
                type: "GET",
                url : config.do.url + 'jobs/' + jobId + '/attachments/' + fileName + "/blob",
                headers: {
                    "X-IBM-Client-Id": config.do.key,
                }
            }
            let res = srequest('GET', options.url, options);
            putFile(workspace, jobId, fileName, res.getBody());
       }
        function submitJob(workspace, jobId) {
            console.log("SUBMIT JOB")
            let config = getConfig(workspace);

            //curl -i -H "X-IBM-Client-Id: <key>" -H "Content-Type: application/json" -X POST -d "" <URL>/jobs/<ID>/execute
            var srequest = require('sync-request');
            let options = {
                type: "POST",
                url : config.do.url + 'jobs/' + jobId + '/execute',
                data : "",
                headers: {
                    "X-IBM-Client-Id": config.do.key,
                    "Content-Type": "application/json"
                }
            }
            let res = srequest('POST', options.url, options);
            //console.log(options)
            return res;
        }
        function getJobStatus(workspace, jobId) {
            let config = getConfig(workspace);
            //curl -i -H "X-IBM-Client-Id: <key>" -X GET <URL>/jobs/<ID>/execute
            var srequest = require('sync-request');
            let options = {
                type: "GET",
                url : config.do.url + 'jobs/' + jobId + '/execute',
                headers: {
                    "X-IBM-Client-Id": config.do.key,
                    "Content-Type": "application/json"
                }
            }
            let res = srequest('GET', options.url, options);
            if (res.statusCode >= 300) 
                return undefined;
            return JSON.parse(res.getBody());
        }
        function getSolution(workspace, jobId) {
            console.log("GET SOLUTION")
            let config = getConfig(workspace);
            // curl -i -H "X-IBM-Client-Id: <key>" -X GET <URL>/jobs/<ID>/attachments?type=OUTPUT_ATTACHMENT
            var srequest = require('sync-request');
            let options = {
                type: "GET",
                url : config.do.url + 'jobs/' + jobId + '/attachments?type=OUTPUT_ATTACHMENT',
                headers: {
                    "X-IBM-Client-Id": config.do.key,
                    "Content-Type": "application/json"
                }
            }
            let res = srequest('GET', options.url, options);
            let attachments = JSON.parse(res.getBody());
            let solution = {}
            for (a in attachments) {
                let fileName = attachments[a].name;
                pullAttachment(workspace, jobId, fileName);           
                solution[fileName] = fileName;     
            }
            return solution;
        }
        function pullLog(workspace, jobId) {
            console.log("PULL LOG")
            let config = getConfig(workspace);
            //curl -H "X-IBM-Client-Id: <key>" -X GET -o log.txt <URL>/jobs/<ID>/log/blob
            var srequest = require('sync-request');
            let options = {
                type: "GET",
                url : config.do.url + 'jobs/' + jobId + '/log/blob',
                headers: {
                    "X-IBM-Client-Id": config.do.key,
                }
            }
            let res = srequest('GET', options.url, options);
            putFile(workspace, jobId, 'log.txt', res.getBody());
        }
        function deleteJob(workspace, jobId) {
            console.log("DELETE JOB")
            let config = getConfig(workspace);
            //curl -i -H "X-IBM-Client-Id: <key>" -X DELETE <URL>/jobs/<ID>
            var srequest = require('sync-request');
            let options = {
                type: "DELETE",
                url : config.do.url + 'jobs/' + jobId,
                headers: {
                    "X-IBM-Client-Id": config.do.key,
                    "Content-Type": "application/json"
                }
            }
            let res = srequest('DELETE', options.url, options);

            return res;
        }
        /////////////////////////////////////////////////////////////////////////
        
        router.post('/optim/solve', upload.fields([]), (req, res) => {
            console.log("/api/optim/solve called");

            let workspace = getWorkspace(req);
            let config = getConfig(workspace);

            if (!('model' in config.do)) {
                // Using WS/WML
                let timeLimit = req.query.timeLimit;	
                let url =config.do.SOLVE_URL;
                let solveConfig = config.do.SOLVE_CONFIG;
                if (timeLimit != undefined)
                    solveConfig.solveParameters['oaas.timeLimit'] = timeLimit;

                let formData = req.body;

                myFormData = {
                    'solveconfig' : JSON.stringify(solveConfig)
                }
                for (id in formData)
                    myFormData[id] = formData[id];

                let options = {
                    type: "POST",
                    url: url,
                    formData: myFormData,
                    headers: {
                        "Authorization": config.do.key
                    },
                    secureProtocol : 'SSLv23_method'
                }

                request.post(options, function (error, response, body){
                    if (!error ) {
                        console.log("Optim solve OK")
                        let obj = JSON.parse(body); 
                        res.json(obj)                      
                    } else   
                        console.log("Optim solve  error:" +error+ " response:" + JSON.stringify(response))
                    });			

            } else {
                // Using DO CPLEX CLOUD
                
                let model = config.do.model;

                console.log('Using workspace: '+workspace);
                let inputs = {}
                let formData = req.body;
                for (id in formData)
                    inputs[id] = id;

                let job = createJob(workspace, model, inputs)
                var location = job.headers.location; 
                var jobId = location.substr(location.lastIndexOf('/') + 1)


                // if model is Python
                let main = 'import pandas as pd;\n';
                main = main + 'inputs = {};\n';
                main = main + 'outputs = {};\n';
                for (i in inputs) {
                    let k = inputs[i].split('.')[0];
                    main = main + 'inputs["' + k + '"] = pd.read_csv("' + inputs[i] + '")\n';
                }
                main = main + getCommonFile(workspace, model);

                main = main + '\n'
                main = main + 'from docplex.util.environment import get_environment\n'
                main = main + 'get_environment().store_solution(outputs)\n'

                putFile(workspace, jobId, 'main.py', main);                
                pushAttachment(workspace, jobId, model, main);
                for (i in inputs) {
                    putFile(workspace, jobId, inputs[i], formData[i]);
                    pushAttachment(workspace, jobId, inputs[i], formData[i]);                     
                }
                submitJob(workspace, jobId)
                res.json({jobId:jobId});
            }	
        });

        router.get('/optim/status', function(req, res) {
            console.log("/api/optim/status called");
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);

            if (!('model' in config.do)) {
                // Using WS/WML
                let jobId = req.query.jobId;	

                let options = {
                    type: "GET",
                    url: config.do.SOLVE_URL.split("?")[0]+"/"+jobId, // FIX for DO4DSX 1.1
                    headers: {
                        "Authorization": config.do.key
                    },
                    secureProtocol : 'SSLv23_method'
                }

                request.get(options, function (error, response, body){
                    if (!error ) {
                        console.log("Optim status OK")
                        res.json(JSON.parse(body))                       
                    } else   
                        console.log("Optim status error:" +error+ " response:" + JSON.stringify(response))
                    });
                            
            } else {
                // Using DO CPLEX CLOUD

                let jobId = req.query.jobId;

                console.log('Using workspace: '+workspace);
                let status = getJobStatus(workspace, jobId);
                if (status == undefined)
                    status = {executionStatus: "UNKNOWN"};

                let resjson = {solveState:status};
                console.log(status.executionStatus);
                if (status.executionStatus == "PROCESSED") {
                    let solution = getSolution(workspace, jobId) 
                    let outputAttachments = []
                    for (s in solution) {
                        if (s.includes('csv')) {
                            let name = s.split('.')[0];
                            outputAttachments.push({name:name, csv:getFile(workspace, jobId, s)});
                        }
                    }     
                    resjson.outputAttachments = outputAttachments;
                    pullLog(workspace, jobId)
                    deleteJob(workspace, jobId)
                }
                if (status.executionStatus == "FAILED") {
                    pullLog(workspace, jobId)
                    deleteJob(workspace, jobId)
                }
            
                res.json(resjson);

            }
        });
     
        router.put('/optim/model', function(req, res) {

			let workspace = getWorkspace(req);
            let config = getConfig(workspace);
			
            if (!('model' in config.do)) {
            } else {

                let workspace = getWorkspace(req);
                let config = getConfig(workspace);

                console.log("PUT /api/optim/model called on workspace: " + workspace);
                let dir = "./dodata/"+workspace;
                if (!fs.existsSync(dir)){
                    fs.mkdirSync(dir);
                }
                fs.writeFile("./dodata/"+workspace+"/"+config.do.model, req.body.model, { flag: 'w' },  function(err,data){
                    if (!err){
                        console.log("Model saved  OK")
                        res.status(200);
                        res.end();
                    }else{
                        console.log(err);
                    }
                });
            }
           
        });
    },

    routeScore: function (router, configml = undefined) {        

        if (configml != undefined)
            getConfig().ml = configml;

        function lookupBearerToken(workspace) {
            
            let config = getConfig(workspace);

            // Cloud

            const options = {
                url: 'https://iam.bluemix.net/identity/token',
                headers: {
                    //'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'Authorization': 'Basic Yng6Yng='
                },
                // form: {
                //     grant_type:'urn:ibm:params:oauth:grant-type:apikey',
                //     apikey: config.apikey,
                //     response_type: 'cloud_iam'
                // },
                body: 'grant_type=urn:ibm:params:oauth:grant-type:apikey&response_type=cloud_iam&apikey='+config.ml.apikey
                };

            var srequest = require('sync-request');

            let res = srequest('POST', options.url, options);
            let object = JSON.parse(res.getBody())

            //console.log(object);

            config.ml.bearerToken =   object.access_token;
            config.ml.bearerTokenTime = Date.now();
            
    
        }

        function getBearerToken(workspace) {
            let config = getConfig(workspace);
            if ( !('bearerTokenTime' in config.ml) ||
                (config.ml.bearerToken == null) ||
                (config.ml.bearerTokenTime + 1000*60 < Date.now()) )
                lookupBearerToken(workspace);

            return config.ml.bearerToken;
        }

        router.post('/ml/score', upload.fields([]), (req, res) => {
            console.log("/api/ml/score called");

            let workspace = getWorkspace(req);
            let config = getConfig(workspace);

            // expected input 
            // {
            //     "fields": ["Pregnancies", "Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI", "DiabetesPedigreeFunction", "Age", "Id"],
            //     "values": [[1,1,1,1,1,1,1,1,1]]
            // }

            let json = req.body;

            let options = {
                type: "POST",
                url: config.ml.url,
                json: json,
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + getBearerToken(workspace)
                },
                secureProtocol : 'SSLv23_method'
            }

            var request = require('request');

            request.post(options, function (error, response, body){
                if (!error ) {
                    console.log("ML score OK")
                    res.json(body)                      
                } else   
                    console.log("ML score error:" +error+ " response:" + JSON.stringify(response))
                });		
            	
        });

    }
}