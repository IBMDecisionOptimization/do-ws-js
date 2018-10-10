


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

    routeSolve: function (router, OPTIM_URL, OPTIM_KEY) {
                
        let SOLVE_URL = undefined
        let SOLVE_CONFIG = undefined
        
        var request = require('request');

        router.get('/optim/config', function(req, res) {
            console.log('/api/optim/config called');

            url = OPTIM_URL
            console.log("Get Config: " + url);
            console.log("OPTIM_KEY: " + OPTIM_KEY);
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
        });

        multer = require('multer');
        upload = multer();


        router.post('/optim/solve', upload.fields([]), (req, res) => {
            console.log("/api/optim/solve called");

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
        });

        router.get('/optim/status', function(req, res) {
            console.log("/api/optim/status called");

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
                            
                
        });
            
    }
}