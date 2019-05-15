
function getWorkspace(req) {
    let workspace = req.query.workspace;
    if ( (workspace == undefined) || (workspace == "") )
        workspace = "default";
    return workspace;
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

    routeSolve: function (router, doconfig) {
                
        let OPTIM_URL = doconfig.url;
        let OPTIM_KEY = doconfig.key;
        let OPTIM_MODEL = doconfig.model;

        let SOLVE_URL = undefined
        let SOLVE_CONFIG = undefined
        
        var request = require('request');

        router.get('/optim/config', function(req, res) {
            console.log('/api/optim/config called');

            if (OPTIM_MODEL == undefined) {
                // Using WS/WML
                url = OPTIM_URL
                console.log("Get Config: " + url);
                //console.log("OPTIM_KEY: " + OPTIM_KEY);
                let options = {
                    headers: {
                        "Authorization": OPTIM_KEY
                        },
                    url:     url,
                    secureProtocol : 'SSLv23_method'
                };

                request.get(options, function(error, response, body){
                    if (!error && response.statusCode == 200) {
                        console.log("Optim Config returned OK")
                        obj = JSON.parse(body);
                        SOLVE_URL = obj.deploymentDescription.links[1].uri
                        console.log("SOLVE_URL: " + SOLVE_URL);
                        SOLVE_CONFIG = obj.deploymentDescription.solveConfig
                        outputstr= '{    "type" : "INLINE_TABLE",    "name" : ".*",    "category" : "output"  }';
                        // SOLVE_CONFIG.attachments.push(JSON.parse(outputstr))
                        SOLVE_CONFIG.attachments = [ JSON.parse(outputstr) ]; // FIX for 1.2.2
                        res.json(obj);					
                                
                    } else
                        console.log("Optim Config error:" +error+ " response:" + JSON.stringify(response))
                    });
            } else {
                // Using DO CPLEX CLOUD
                res.json({"status": "Using DO CPLEX CLOUD with model: " + OPTIM_MODEL });
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

        function createJob(model, inputs) {
            console.log("CREATE JOB");
            // https://developer.ibm.com/docloud/documentation/docloud/rest-api/rest-api-example/

            let attachments = []
            attachments.push({name: model});
            for (f in inputs)
                attachments.push({name: inputs[f]});

            var srequest = require('sync-request');
            let options = {
                type: "POST",
                url : OPTIM_URL + 'jobs',
                json: {attachments : attachments},
                headers: {
                    "X-IBM-Client-Id": OPTIM_KEY,
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

            let body = content;

            var srequest = require('sync-request');
            let options = {
                type: "PUT",
                url : OPTIM_URL + 'jobs/' + jobId + '/attachments/' + fileName + "/blob",
                body : body,
                headers: {
                    "X-IBM-Client-Id": OPTIM_KEY,
                    "Content-Type": "application/octet-stream",
                    'Content-disposition': 'attachment; filename='+fileName
                }
            }
            let res = srequest('PUT', options.url, options);
            return res;
        }
        function pullAttachment(workspace, jobId, fileName) {
            console.log("PULL ATTACHMENT "+ workspace + '/' + jobId+ '/' + fileName)
            // curl -H "X-IBM-Client-Id: <key>" -X GET -o mysolution.json <URL>/jobs/<ID>/attachments/solution.json/blob
            var srequest = require('sync-request');
            let options = {
                type: "GET",
                url : OPTIM_URL + 'jobs/' + jobId + '/attachments/' + fileName + "/blob",
                headers: {
                    "X-IBM-Client-Id": OPTIM_KEY,
                }
            }
            let res = srequest('GET', options.url, options);
            putFile(workspace, jobId, fileName, res.getBody());
       }
        function submitJob(jobId) {
            console.log("SUBMIT JOB")
            //curl -i -H "X-IBM-Client-Id: <key>" -H "Content-Type: application/json" -X POST -d "" <URL>/jobs/<ID>/execute
            var srequest = require('sync-request');
            let options = {
                type: "POST",
                url : OPTIM_URL + 'jobs/' + jobId + '/execute',
                data : "",
                headers: {
                    "X-IBM-Client-Id": OPTIM_KEY,
                    "Content-Type": "application/json"
                }
            }
            let res = srequest('POST', options.url, options);
            //console.log(options)
            return res;
        }
        function getJobStatus(jobId) {
            //curl -i -H "X-IBM-Client-Id: <key>" -X GET <URL>/jobs/<ID>/execute
            var srequest = require('sync-request');
            let options = {
                type: "GET",
                url : OPTIM_URL + 'jobs/' + jobId + '/execute',
                headers: {
                    "X-IBM-Client-Id": OPTIM_KEY,
                    "Content-Type": "application/json"
                }
            }
            let res = srequest('GET', options.url, options);
            if (res.statusCode >= 300) 
                return undefined;
            return JSON.parse(res.getBody());
        }
        function getSolution(jobId, workspace) {
            console.log("GET SOLUTION")
            // curl -i -H "X-IBM-Client-Id: <key>" -X GET <URL>/jobs/<ID>/attachments?type=OUTPUT_ATTACHMENT
            var srequest = require('sync-request');
            let options = {
                type: "GET",
                url : OPTIM_URL + 'jobs/' + jobId + '/attachments?type=OUTPUT_ATTACHMENT',
                headers: {
                    "X-IBM-Client-Id": OPTIM_KEY,
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
        function pullLog(jobId, workspace) {
            console.log("PULL LOG")
            //curl -H "X-IBM-Client-Id: <key>" -X GET -o log.txt <URL>/jobs/<ID>/log/blob
            var srequest = require('sync-request');
            let options = {
                type: "GET",
                url : OPTIM_URL + 'jobs/' + jobId + '/log/blob',
                headers: {
                    "X-IBM-Client-Id": OPTIM_KEY,
                }
            }
            let res = srequest('GET', options.url, options);
            putFile(workspace, jobId, 'log.txt', res.getBody());
        }
        function deleteJob(jobId) {
            console.log("DELETE JOB")
            //curl -i -H "X-IBM-Client-Id: <key>" -X DELETE <URL>/jobs/<ID>
            var srequest = require('sync-request');
            let options = {
                type: "DELETE",
                url : OPTIM_URL + 'jobs/' + jobId,
                headers: {
                    "X-IBM-Client-Id": OPTIM_KEY,
                    "Content-Type": "application/json"
                }
            }
            let res = srequest('DELETE', options.url, options);

            return res;
        }
        /////////////////////////////////////////////////////////////////////////
        
        router.post('/optim/solve', upload.fields([]), (req, res) => {
            console.log("/api/optim/solve called");

            if (OPTIM_MODEL == undefined) {
                // Using WS/WML
                let timeLimit = req.query.timeLimit;	
                let url = SOLVE_URL;
                let solveConfig = SOLVE_CONFIG;
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
                        "Authorization": OPTIM_KEY
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
                
                let model = OPTIM_MODEL;
                let workspace = getWorkspace(req);

                console.log('Using workspace: '+workspace);
                let inputs = {}
                let formData = req.body;
                for (id in formData)
                    inputs[id] = id;

                let job = createJob(model, inputs)
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
                submitJob(jobId)
                res.json({jobId:jobId});
            }	
        });

        router.get('/optim/status', function(req, res) {
            console.log("/api/optim/status called");

            if (OPTIM_MODEL == undefined) {
                // Using WS/WML
                let jobId = req.query.jobId;	

                let options = {
                    type: "GET",
                    url: SOLVE_URL.split("?")[0]+"/"+jobId, // FIX for DO4DSX 1.1
                    headers: {
                        "Authorization": OPTIM_KEY
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
                let workspace = getWorkspace(req);
                console.log('Using workspace: '+workspace);
                let status = getJobStatus(jobId);
                if (status == undefined)
                    status = {executionStatus: "UNKNOWN"};

                let resjson = {solveState:status};
                console.log(status.executionStatus);
                if (status.executionStatus == "PROCESSED") {
                    let solution = getSolution(jobId, workspace) 
                    let outputAttachments = []
                    for (s in solution) {
                        if (s.includes('csv')) {
                            let name = s.split('.')[0];
                            outputAttachments.push({name:name, csv:getFile(workspace, jobId, s)});
                        }
                    }     
                    resjson.outputAttachments = outputAttachments;
                    pullLog(jobId, workspace)
                    deleteJob(jobId)
                }
                if (status.executionStatus == "FAILED") {
                    pullLog(jobId, workspace)
                    deleteJob(jobId)
                }
            
                res.json(resjson);

            }
        });
     
        router.put('/optim/model', function(req, res) {


            if (OPTIM_MODEL == undefined) {
            } else {

                let workspace = getWorkspace(req);
                console.log("PUT /api/optim/model called on workspace: " + workspace);
                let dir = "./dodata/"+workspace;
                if (!fs.existsSync(dir)){
                    fs.mkdirSync(dir);
                }
                fs.writeFile("./dodata/"+workspace+"/"+OPTIM_MODEL, req.body.model, { flag: 'w' },  function(err,data){
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

    routeScore: function (router, mlconfig) {
        
        var bearerToken = null;
        var bearerTokenTime = 0;

        function lookupBearerToken() {
            
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
                body: 'grant_type=urn:ibm:params:oauth:grant-type:apikey&response_type=cloud_iam&apikey='+mlconfig.apikey
                };

            var srequest = require('sync-request');

            let res = srequest('POST', options.url, options);
            let object = JSON.parse(res.getBody())

            //console.log(object);

            bearerToken =   object.access_token;
            bearerTokenTime = Date.now();
            
            return bearerToken
    
        }

        function getBearerToken() {
            if ( (bearerToken == null) ||
                (bearerTokenTime + 1000*60 < Date.now()) )
                bearerToken = lookupBearerToken();

            return bearerToken;
        }

        router.post('/ml/score', upload.fields([]), (req, res) => {
            console.log("/api/ml/score called");

            // expected input 
            // {
            //     "fields": ["Pregnancies", "Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI", "DiabetesPedigreeFunction", "Age", "Id"],
            //     "values": [[1,1,1,1,1,1,1,1,1]]
            // }

            let json = req.body;

            let options = {
                type: "POST",
                url: mlconfig.url,
                json: json,
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + getBearerToken()
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