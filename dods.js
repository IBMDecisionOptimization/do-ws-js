


module.exports = {
    routeScenario: function (router) {
        var fs = require('fs');
        router.get('/scenarios', function(req, res) {
            console.log('/api/scenarios called');
            var scenarios = fs.readdirSync("./data");
            res.json(scenarios);
        });

        router.get('/scenario/:scenario', function(req, res) {
            let scenario = req.params.scenario;
            console.log('GET /api/scenario/' + scenario + ' called');
            fs.readFile("./data/"+scenario+"/scenario.json", {encoding: 'utf-8'}, function(err,data){
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
            console.log('PATCH /api/scenario/' + scenario + ' called with new name ' + name);
            fs.rename('./data/'+scenario, './data/'+name, function(err,data){
                if (!err){
                    res.json({})
                }else{
                    console.log(err);
                }
            });
        });

        router.put('/scenario/:scenario', function(req, res) {
            let scenario = req.params.scenario;
            console.log('PUT /api/scenario/' + scenario + ' called');
            var dir = './data/'+scenario;
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            fs.writeFile("./data/"+scenario+"/scenario.json", JSON.stringify(req.body), { flag: 'w' },  function(err,data){
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
            console.log('GET /api/scenario/' + scenario + '/' + table + ' called');
            fs.readFile("./data/"+scenario+"/"+table+".csv", {encoding: 'utf-8'}, function(err,data){
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
            console.log('PUT /api/scenario/' + scenario + '/' + table + ' called');
            fs.writeFile("./data/"+scenario+"/"+table+".csv", req.body.csv, { flag: 'w' },  function(err,data){
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
        upload = multer();

        //////////////////////////////////////////////////////////////
        var fs = require('fs');
        function getFile(fileName) {
            return  fs.readFileSync("./dodata/" + fileName, 'utf8');
        }
        function putFile(fileName, content) {
            return  fs.writeFileSync("./dodata/" + fileName, content, 'utf8');
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

        function pushAttachment(jobId, fileName, content = undefined) {
            console.log("PUSH ATTACHMENT "+ fileName)
            //curl -i -H "X-IBM-Client-Id: <key>" -H "Content-Type: application/octet-stream" 
            // -X PUT -T truck.mod <URL>/jobs/<ID>/attachments/truck.mod/blob 

            let body = content;
            if (content == undefined)
                body = getFile(fileName);

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
            //console.log(options)
            return res;
        }
        function getAttachment(jobId, fileName) {
            console.log("GET ATTACHMENT "+ fileName)
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
            putFile(fileName, res.getBody());
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
        function getSolution(jobId) {
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
                getAttachment(jobId, fileName);           
                solution[fileName] = fileName;     
            }
            return solution;
        }
        function getLog(jobId) {
            console.log("GET LOG")
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
            putFile('log.txt', res.getBody());
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
                main = main + getFile(model);

                main = main + '\n'
                main = main + 'from docplex.util.environment import get_environment\n'
                main = main + 'get_environment().store_solution(outputs)\n'

                putFile('main.py', main);
                
                pushAttachment(jobId, model, main);
                for (i in inputs)
                    pushAttachment(jobId, inputs[i], formData[i]);
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

                let status = getJobStatus(jobId);
                if (status == undefined)
                    status = {executionStatus: "UNKNOWN"};

                let resjson = {solveState:status};
                console.log(status.executionStatus);
                if (status.executionStatus == "PROCESSED") {
                    let solution = getSolution(jobId) 
                    let outputAttachments = []
                    for (s in solution) {
                        if (s.includes('csv')) {
                            let name = s.split('.')[0];
                            outputAttachments.push({name:name, csv:getFile(s)});
                        }
                    }     
                    resjson.outputAttachments = outputAttachments;
                    getLog(jobId)
                    deleteJob(jobId)
                }
                if (status.executionStatus == "FAILED") {
                    getLog(jobId)
                    deleteJob(jobId)
                }
            
                res.json(resjson);

            }
        });
            
    }
}