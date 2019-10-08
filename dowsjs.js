var configs = {}

// url: 'https://iam.bluemix.net/identity/token',
let IAM_URL = "https://iam.cloud.ibm.com/identity/token";
let IAM_TIMEOUT = 3600;

function getWorkspace(req) {
    let workspace = req.query.workspace;
    if ( (workspace == undefined) || (workspace == "") )
        workspace = "default";
    return workspace;
}


function readConfig(workspace = 'default') {
    let CONFIG_FILE_NAME = "config.json";
   
    var fs = require('fs');

    let workspaceDir = './workspaces/' + workspace;

    let filePath = './workspaces/'+workspace+'/'+CONFIG_FILE_NAME;

    let config = {}
        
    if (fs.existsSync(filePath)) {
        let contents = fs.readFileSync(filePath, 'utf8');
        config = JSON.parse(contents);
    } else {     
        config = JSON.parse(JSON.stringify(getConfig('default'))); // to copy to edit	

        config.name = workspace;
        config.ui.title = workspace;

        fs.mkdirSync(workspaceDir);
        fs.writeFileSync(filePath, JSON.stringify(config, null, 4), 'utf8');
    }
    
    if (!('ui' in config))
        config.ui = {};
    if (!('scenario' in config))
        config.scenario = {};
    if (!('config' in config.scenario))
        config.scenario.config = {};
    if (!('$parameters' in config.scenario.config))
        config.scenario.config['$parameters'] = {tableId: 'parameters'};        

    configs[workspace] = config;
}


function getConfig(workspace = 'default') {
    if (!(workspace in configs))
        readConfig(workspace);
    return configs[workspace];
}

module.exports = {

    
    routeConfig: function (router) {

        let hiddenKeys = ['username', 'password', 'accountId', 'tenantId', 'userId', 'key', 'apikey']
        let hiddenValue = "xxxxxxxxxxxxxxxxxxxxxx";
        function hideStuff(config) {
            let newconfig = {}
            for (let k in config) {
                if (typeof (config[k]) === "object") 
                    newconfig[k] = hideStuff(config[k]);
                else if (hiddenKeys.includes(k))
                    newconfig[k] = hiddenValue;                    
                else newconfig[k] = config[k];
            } 
            return newconfig;
        }
        function copyHiddenStuff(config, newconfig) {
            for (let k in newconfig) {
                if (typeof (newconfig[k]) === "object") {
                    if (!(k in config))
                        config[k] = {}
                    copyHiddenStuff(config[k], newconfig[k]);
                } else if (hiddenKeys.includes(k)) {
                    if (newconfig[k] != hiddenValue)
                        config[k] = newconfig[k];                    
                } else config[k] = newconfig[k];
            } 
            for (let k in config)
                if (!(k in newconfig))
                    delete config[k];
        }
        router.get('/config', function(req, res) {

            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            console.log('GET /api/config called for workspace ' + workspace);
            let hconfig = hideStuff(config);
            hconfig.ui = config.ui; // don't hide ui 
            res.json(hconfig);
        });

        router.get('/config/file', function(req, res) {
            let workspace = getWorkspace(req);
            let fileName = req.query.fileName;
            console.log('GET /api/config/file for fileName ' + fileName);
            var fs = require('fs');
            let filePath = './workspaces/'+workspace+'/'+fileName;
            // let contents = fs.readFileSync(filePath, 'utf8');
            // res.writeHead(200, {'Content-Type': 'text/plain'});
            // res.write(contents);
            // res.end();

            fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
                if (!err){
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.write(data);
                    res.end();
                } else {
                    console.log(err);
                }
            });
        });

        router.put('/config', function(req, res) {            

            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let newconfig = req.body;

            copyHiddenStuff(config, newconfig)

            if (req.query.dosave == "true") {
                var fs = require('fs');
                let CONFIG_FILE_NAME = "config.json";
                let dir = './workspaces/'+workspace;
                if (!fs.existsSync(dir)){
                    fs.mkdirSync(dir);
                }
                let filePath = dir+'/'+CONFIG_FILE_NAME;
                fs.writeFileSync(filePath, JSON.stringify(config, null, 4), 'utf8');
            }

            res.json({"changeConfig":"ok"});
        });

        router.get('/configs', function(req, res) {

            console.log('GET /api/configs');

            var fs = require('fs');

            let dir = "./workspaces";
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            let elts = fs.readdirSync(dir);
            let configs = {}
            for (let e in elts) {
                let config = getConfig(elts[e]);
                configs[elts[e]] = config; 
            }
            res.json(configs);;
        });
    },

    routeScenario: function (router) {
        var fs = require('fs');

        router.get('/scenarios', function(req, res) {            
            let workspace = getWorkspace(req);
            console.log('GET /api/scenarios called for workspace '+workspace);
            let dir = "./workspaces/"+workspace+'/data';
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
            fs.readFile("./workspaces/"+workspace+"/data/"+scenario+"/scenario.json", {encoding: 'utf-8'}, function(err,data){
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
            fs.rename('./workspaces/'+workspace+'/data/'+scenario, './workspaces/'+workspace+'/data/'+name, function(err,data){
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
            let dir = "./workspaces/"+workspace+'/data';
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            dir = './workspaces/'+workspace+'/data/'+scenario;
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            fs.writeFile("./workspaces/"+workspace+"/data/"+scenario+"/scenario.json", JSON.stringify(req.body, null, 2), { flag: 'w' },  function(err,data){
                if (!err){
                    res.status(200);
                    res.end();
                }else{
                    console.log('Error saving scenario: ' + err);
                }
            });
        });

        router.get('/scenario/:scenario/:table', function(req, res) {
            let scenario = req.params.scenario;
            let table = req.params.table; 
            let workspace = getWorkspace(req);
            console.log('GET /api/scenario/' + scenario + '/' + table + ' called');
            fs.readFile("./workspaces/"+workspace+"/data/"+scenario+"/"+table+".csv", {encoding: 'utf-8'}, function(err,data){
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
            fs.writeFile("./workspaces/"+workspace+"/data/"+scenario+"/"+table+".csv", req.body.csv, { flag: 'w' },  function(err,data){
                if (!err){                    
                    res.status(200);
                    res.end();
                }else{
                    console.log('Error saving table : ' + err);
                }
            });
        });
    },

    routeSolve: function (router, configdo = undefined) {     
        
        if (configdo != undefined)
            getConfig().do = configdo;
        
        let request = require('request');

        function getDOKey(req) {
            let dokey = req.query.dokey;
            if ( (dokey == undefined) || (dokey == "") )
                dokey = "do";
            return dokey;
        }

        function lookupAsynchDOBearerToken(workspace, dokey) {
        
            let config = getConfig(workspace);

            // Cloud
            console.log('Lookup Bearer Token from IAM (ASYNCH)')
            let options = {                
                url: IAM_URL,
                headers: {
                    'Accept': 'application/json',
                    'Authorization': 'Basic Yng6Yng='
                },
                body: 'apikey='+config[dokey].apikey+'&grant_type=urn%3Aibm%3Aparams%3Aoauth%3Agrant-type%3Aapikey'
            };

            request.post(options, function (error, response, body){
                if (error || response.statusCode >= 400) {
                    console.error('Error looking up token: ' + body.toString())
                } else {
                    let object = JSON.parse(body);

                    config[dokey].bearerToken =   object.access_token;
                    config[dokey].bearerTokenTime = Date.now();
                    console.log('Got Bearer Token from IAM')
                
                }
            });	
        }

    
            
        function lookupSynchDOBearerToken(workspace, dokey) {
            
            let config = getConfig(workspace);

            // Cloud
            console.log('Lookup Bearer Token from IAM (SYNCH)')
            let options = {                
                url: IAM_URL,
                headers: {
                    'Accept': 'application/json',
                    'Authorization': 'Basic Yng6Yng='
                },
                body: 'apikey='+config[dokey].apikey+'&grant_type=urn%3Aibm%3Aparams%3Aoauth%3Agrant-type%3Aapikey'
            };
            let srequest = require('sync-request');

            let sres = srequest('POST', options.url, options);
            if (sres.statusCode >= 400)
                console.error('Error looking up token: ' + sres.getBody().toString())
            let object = JSON.parse(sres.getBody())
            
            config[dokey].bearerToken =   object.access_token;
            config[dokey].bearerTokenTime = Date.now();
            console.log('Got Bearer Token from IAM')
        }

        function getDOBearerToken(workspace, dokey) {
            let config = getConfig(workspace);
            if ( !('bearerTokenTime' in config[dokey]) ||
                (config[dokey].bearerToken == null) ||
                (config[dokey].bearerTokenTime + 1000 * IAM_TIMEOUT < Date.now()) )
                lookupSynchDOBearerToken(workspace, dokey);

            return config[dokey].bearerToken;
        }

        router.get('/optim/config', function(req, res) {            
            let workspace = getWorkspace(req);
            let dokey = getDOKey(req);
            console.log('GET /api/optim/config called on workspace ' + workspace + ' and dokey ' +dokey);
            let config = getConfig(workspace);

            if (!(dokey in config))
                res.json({status: "No DO configuration", type:""});
            else if (('type' in config[dokey]) && config[dokey].type=='mos') {
                // Using MOS
                res.json({status: "OK", type:"mos"});
            } else if ( ('type' in config[dokey]) && (config[dokey].type=='wml')) { 
                // Using WML

                // Trigger Bearer Token lookup
                lookupAsynchDOBearerToken(workspace, dokey);

                if (!('deployment_id' in config[dokey])) {                                        
                    // Need to deploy

                    if (req.query.dodeploy == "true") {
                        // Create Model
                        console.log('Creating WML Model');
                        let options = {
                            url: config[dokey].url + '/v4/models',
                            headers: {
                            'Accept': 'application/json',
                            'Authorization': 'bearer ' + getDOBearerToken(workspace, dokey),
                            'ML-Instance-ID': config[dokey].instance_id,
                            'cache-control': 'no-cache'
                            },
                            json: {
                                "name": config.name,
                                "description": config.name,
                                "type": "do-docplex_12.9",
                                "runtime": {
                                    "href": "/v4/runtimes/do_12.9"
                                }
                            }
                        };    

                        request.post(options, function (error, response, body) {

                            if (error || response.statusCode >= 400) {
                                console.error("Create Deployed model error: " + + body.toString());
                                res.json({status: "Error creating deployed model", type:"WML"});
                            } else {
                                let object = body
                                // console.log(JSON.stringify(object));

                                config[dokey].model_id = object.metadata.guid;
                                let splits = object.metadata.href.split('=');
                                config[dokey].model_rev = splits[splits.length-1]

                                console.log('Create python model: ' + config[dokey].model_id);

                                // Create modified model (Python only)

                                let model = config[dokey].model;
                
                                let dir = "./workspaces/"+workspace+'/do';
                                if (!fs.existsSync(dir)){
                                    fs.mkdirSync(dir);
                                }
                                
                                
                                let main = "from docplex.util.environment import get_environment\n"
                                main += "from os.path import splitext\n"
                                main += "import pandas\n"
                                main += "from six import iteritems\n"
                                main += "\n"
                                main += "def get_all_inputs():\n"
                                main += "    '''Utility method to read a list of files and return a tuple with all\n"
                                main += "    read data frames.\n"
                                main += "    Returns:\n"
                                main += "        a map { datasetname: data frame }\n"
                                main += "    '''\n"
                                main += "    result = {}\n"
                                main += "    env = get_environment()\n"
                                main += "    for iname in [f for f in os.listdir('.') if splitext(f)[1] == '.csv']:\n"
                                main += "        with env.get_input_stream(iname) as in_stream:\n"
                                main += "            df = pandas.read_csv(in_stream)\n"
                                main += "            datasetname, _ = splitext(iname)\n"
                                main += "            result[datasetname] = df\n"
                                main += "    return result\n"
                                main += "\n"
                                main += "def write_all_outputs(outputs):\n"
                                main += "    '''Write all dataframes in ``outputs`` as .csv.\n"
                                main += "\n"
                                main += "    Args:\n"
                                main += "        outputs: The map of outputs 'outputname' -> 'output df'\n"
                                main += "    '''\n"
                                main += "    for (name, df) in iteritems(outputs):\n"
                                main += "        csv_file = '%s.csv' % name\n"
                                main += "        print(csv_file)\n"
                                main += "        with get_environment().get_output_stream(csv_file) as fp:\n"
                                main += "            if sys.version_info[0] < 3:\n"
                                main += "                fp.write(df.to_csv(index=False, encoding='utf8'))\n"
                                main += "            else:\n"
                                main += "                fp.write(df.to_csv(index=False).encode(encoding='utf8'))\n"
                                main += "    if len(outputs) == 0:\n"
                                main += "        print('Warning: no outputs written')\n"
                                main += "\n"
                                main += "# Load CVS files into inputs dictionnary\n"
                                main += "inputs = get_all_inputs()\n"
                                main += "\n"
                                main += getCommonFile(workspace, model);
                                main += "\n"
                                main += "# Generate output files\n"
                                main += "write_all_outputs(outputs)\n"
                
                                if (!fs.existsSync(dir+'/wml')){
                                    fs.mkdirSync(dir+'/wml');
                                }

                                if (!fs.existsSync(dir+'/wml/model')){
                                    fs.mkdirSync(dir+'/wml/model');
                                }

                                putFile(workspace, 'wml', 'model/main.py', main)

                                // ZIP model
                                var tar = require('tar')
                                tar.c(
                                    {
                                        cwd:'./workspaces/'+workspace+'/do/wml/model/',
                                        gzip: true,
                                        file: './workspaces/'+workspace+'/do/wml/main.tar.gz'
                                    },
                                    ['main.py']
                                ).then(_ => { 
                                        console.log('zipped model OK')
                                    
                                        // Upload model
                                        
                                        options = {
                                            url: config[dokey].url + '/v4/models/' + config[dokey].model_id + '/content',
                                            headers: {
                                                'Accept': 'application/json',
                                                'Authorization': 'bearer ' + getDOBearerToken(workspace, dokey),
                                                'ML-Instance-ID': config[dokey].instance_id,
                                                encoding: null                                            
                                            },
                                        };                    

                                        fs.createReadStream('./workspaces/'+workspace+'/do/wml/main.tar.gz').pipe(request.put(options).on('end', (done) => { 

                                            console.log('Uploaded WML model');

                                            // Deploy model
                            
                                            options = {
                                                url: config[dokey].url + '/v4/deployments',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                'Accept': 'application/json',
                                                'Authorization': 'bearer ' + getDOBearerToken(workspace, dokey),
                                                'ML-Instance-ID': config[dokey].instance_id,
                                                'cache-control': 'no-cache'
                                                },
                                                json: {
                                                    'asset': {
                                                        'href': '/v4/models/'+ config[dokey].model_id+'?rev='+config[dokey].model_rev
                                                    },
                                                    'name': config.name,
                                                    'batch': {},
                                                    'compute': {
                                                        'name': 'S',
                                                        'nodes': 1
                                                    }
                                                }
                                            };            
                            
                                            request.post(options, function (error, response, body) {

                                                let object = body
                                                
                                                if (response.statusCode >= 400)
                                                    console.error("Error creating deployment:" + body.toString())
                    
                                                config[dokey].deployment_id = object.metadata.guid;
                    
                                                console.log('Created WML deployment: ' + config[dokey].deployment_id);
                    
                                                res.json({status: "OK", type:"WML", model:config[dokey].model});   
                                            });
                                        }));

                                        

                                        
                                        
                                })
                            }
                        });
                        
                    } else {
                        //  dodeplou=false
                        res.json({status: "Model is not deployed", type:"WML", model:config[dokey].model});
                    }

                } else {
                    res.json({status: "OK", type:"WML", model:config[dokey].model});
                }
            } else if (!('model' in config[dokey])) {
                // Using WS/MMD
                console.log("Get Config: " + config[dokey].url);
                let options = {
                    headers: {
                        "Authorization": config[dokey].key
                        },
                    url:     url,
                    secureProtocol : 'SSLv23_method'
                };

                request.get(options, function(error, response, body){
                    if (!error && response.statusCode == 200) {
                        console.log("Optim Config returned OK")
                        obj = JSON.parse(body);
                        config[dokey].SOLVE_URL = obj.deploymentDescription.links[1].uri
                        console.log("SOLVE_URL: " + config[dokey].SOLVE_URL);
                        config[dokey].SOLVE_CONFIG = obj.deploymentDescription.solveConfig
                        outputstr= '{    "type" : "INLINE_TABLE",    "name" : ".*",    "category" : "output"  }';
                        // SOLVE_CONFIG.attachments.push(JSON.parse(outputstr))
                        config[dokey].SOLVE_CONFIG.attachments = [ JSON.parse(outputstr) ]; // FIX for 1.2.2
                        res.json({status: "OK", type:"mmd"});                        					
                                
                    } else
                        console.log("Optim Config error:" +error+ " response:" + JSON.stringify(response))
                        res.json({status: "Error", type:"mmd"});
                    });
            } else if ( ('type' in config[dokey]) && (config[dokey].type=='desktop')) { 
                // Using Desktop
                res.json({status: "OK", type:"desktop", model:config[dokey].model});
            } else { 
                // Using DO CPLEX CLOUD        
                res.json({status: "OK", type:"docplexcloud", model:config[dokey].model});
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
            return  fs.readFileSync("./workspaces/" + workspace + '/do/' + fileName, 'utf8');
        }
        function getFile(workspace, jobId, fileName) {
            let dir = "./workspaces/"+workspace+'/do/'+jobId;
            return  fs.readFileSync(dir + '/' + fileName, 'utf8');
        }        
        function putFile(workspace, jobId, fileName, content) {
            let dir = "./workspaces/"+workspace+'/do/'+jobId;
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            return  fs.writeFileSync(dir + '/' + fileName, content, 'utf8');
        }

        function createJob(workspace, dokey, model, inputs) {
            console.log("CREATE JOB");
            let config = getConfig(workspace);
            // https://developer.ibm.com/docloud/documentation/docloud/rest-api/rest-api-example/

            let attachments = []
            attachments.push({name: model});
            for (f in inputs)
                attachments.push({name: inputs[f]});

            let srequest = require('sync-request');
            let options = {
                type: "POST",
                url : config[dokey].url + 'jobs',
                json: {attachments : attachments},
                headers: {
                    "X-IBM-Client-Id": config[dokey].key,
                    "Content-Type": "application/json"
                }
            }
            //console.log(options)
            let res = srequest('POST', options.url, options);
            
            return res;
        }

        function pushAttachment(workspace, dokey, jobId, fileName, content) {
            console.log("PUSH ATTACHMENT "+ workspace + '/' + jobId+ '/' + fileName)
            //curl -i -H "X-IBM-Client-Id: <key>" -H "Content-Type: application/octet-stream" 
            // -X PUT -T truck.mod <URL>/jobs/<ID>/attachments/truck.mod/blob 
            let config = getConfig(workspace);
            let body = content;

            let srequest = require('sync-request');
            let options = {
                type: "PUT",
                url : config[dokey].url + 'jobs/' + jobId + '/attachments/' + fileName + "/blob",
                body : body,
                headers: {
                    "X-IBM-Client-Id": config[dokey].key,
                    "Content-Type": "application/octet-stream",
                    'Content-disposition': 'attachment; filename='+fileName
                }
            }
            let res = srequest('PUT', options.url, options);
            return res;
        }
        function pullAttachment(workspace, dokey, jobId, fileName) {
            console.log("PULL ATTACHMENT "+ workspace + '/' + jobId+ '/' + fileName)
            let config = getConfig(workspace);
            // curl -H "X-IBM-Client-Id: <key>" -X GET -o mysolution.json <URL>/jobs/<ID>/attachments/solution.json/blob
            let srequest = require('sync-request');
            let options = {
                type: "GET",
                url : config[dokey].url + 'jobs/' + jobId + '/attachments/' + fileName + "/blob",
                headers: {
                    "X-IBM-Client-Id": config[dokey].key,
                }
            }
            let res = srequest('GET', options.url, options);
            putFile(workspace, jobId, fileName, res.getBody());
       }
        function submitJob(workspace, dokey, jobId) {
            console.log("SUBMIT JOB")
            let config = getConfig(workspace);

            //curl -i -H "X-IBM-Client-Id: <key>" -H "Content-Type: application/json" -X POST -d "" <URL>/jobs/<ID>/execute
            let srequest = require('sync-request');
            let options = {
                type: "POST",
                url : config[dokey].url + 'jobs/' + jobId + '/execute',
                data : "",
                headers: {
                    "X-IBM-Client-Id": config[dokey].key,
                    "Content-Type": "application/json"
                }
            }
            let res = srequest('POST', options.url, options);
            //console.log(options)
            return res;
        }
        function getJobStatus(workspace, dokey, jobId) {
            let config = getConfig(workspace);
            //curl -i -H "X-IBM-Client-Id: <key>" -X GET <URL>/jobs/<ID>/execute
            let srequest = require('sync-request');
            let options = {
                type: "GET",
                url : config[dokey].url + 'jobs/' + jobId + '/execute',
                headers: {
                    "X-IBM-Client-Id": config[dokey].key,
                    "Content-Type": "application/json"
                }
            }
            let res = srequest('GET', options.url, options);
            if (res.statusCode >= 300) 
                return undefined;
            return JSON.parse(res.getBody());
        }
        function getSolution(workspace, dokey, jobId) {
            console.log("GET SOLUTION")
            let config = getConfig(workspace);
            // curl -i -H "X-IBM-Client-Id: <key>" -X GET <URL>/jobs/<ID>/attachments?type=OUTPUT_ATTACHMENT
            let srequest = require('sync-request');
            let options = {
                type: "GET",
                url : config[dokey].url + 'jobs/' + jobId + '/attachments?type=OUTPUT_ATTACHMENT',
                headers: {
                    "X-IBM-Client-Id": config[dokey].key,
                    "Content-Type": "application/json"
                }
            }
            let res = srequest('GET', options.url, options);
            let attachments = JSON.parse(res.getBody());
            let solution = {}
            for (a in attachments) {
                let fileName = attachments[a].name;
                pullAttachment(workspace, dokey, jobId, fileName);           
                solution[fileName] = fileName;     
            }
            return solution;
        }
        function pullLog(workspace, dokey, jobId) {
            console.log("PULL LOG")
            let config = getConfig(workspace);
            //curl -H "X-IBM-Client-Id: <key>" -X GET -o log.txt <URL>/jobs/<ID>/log/blob
            let srequest = require('sync-request');
            let options = {
                type: "GET",
                url : config[dokey].url + 'jobs/' + jobId + '/log/blob',
                headers: {
                    "X-IBM-Client-Id": config[dokey].key,
                }
            }
            let res = srequest('GET', options.url, options);
            putFile(workspace, jobId, 'log.txt', res.getBody());
        }
        function deleteJob(workspace, dokey, jobId) {
            console.log("DELETE JOB")
            let config = getConfig(workspace);
            //curl -i -H "X-IBM-Client-Id: <key>" -X DELETE <URL>/jobs/<ID>
            let srequest = require('sync-request');
            let options = {
                type: "DELETE",
                url : config[dokey].url + 'jobs/' + jobId,
                headers: {
                    "X-IBM-Client-Id": config[dokey].key,
                    "Content-Type": "application/json"
                }
            }
            let res = srequest('DELETE', options.url, options);

            return res;
        }
        /////////////////////////////////////////////////////////////////////////
        
        router.post('/optim/solve', upload.fields([]), (req, res) => {            
            
            let workspace = getWorkspace(req);
            let dokey = getDOKey(req);
            console.log('POST /api/optim/solve called on workspace ' + workspace + ' and dokey ' +dokey);

            let config = getConfig(workspace);

            if (('type' in config[dokey]) && config[dokey].type=='wml') {

                // WML
                payload = {
                    'deployment': {
                            'href':'/v4/deployments/'+config[dokey].deployment_id
                    },
                    'decision_optimization' : {
                        'solve_parameters' : {
                            'oaas.logAttachmentName':'log.txt',
                            'oaas.logTailEnabled':'true'
                        },
                        'input_data': [
                        ],
                        'output_data': [
                            {
                                "id":".*\.csv"
                            }
                        ]
                    }
                }
                
                let formData = req.body;
                // from formdata to jsondata
                for (let id in formData) {
                    let csv = formData[id];
                    let input_data = { 
                        id: id,
                        fields : [],
                        values: [] 
                    };
                    let lines = csv.split('\n');
                    let cols = undefined;
                    for (let l in lines) {
                        let line = lines[l];
                        if (line == '')
                            continue;
                        if (cols == undefined) {
                            cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                            var ncols = cols.length;
                            for (var c=0; c<ncols; c++) {
                                let col = cols[c];
                                if (col[0] == "\"" && col[col.length-1] == "\"") {
                                    col = col.substring(1, col.length-1);
                                    cols[c] = col;
                                }
                            }
                            input_data.fields = cols;
                            continue;
                        }
                        
                        let vals = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                    
                        let row = [];
                        for (let v in vals) {
                            let val = vals[v];
                            if (val[0] == "\"" && val[val.length-1] == "\"") {
                                val = val.substring(1, val.length-1);
                            }
                            if (val == 'null')
                                val = null; 
                            else if (!isNaN(val))
                                val = parseFloat(val);
                            row.push(val);
                        }
                        input_data.values.push(row);
                    }
                    payload.decision_optimization.input_data.push(input_data);
                }
                
                let options = {
                    url: config[dokey].url + '/v4/jobs',
                    headers: {
                       'Accept': 'application/json',
                       'Authorization': 'bearer ' + getDOBearerToken(workspace, dokey),
                       'ML-Instance-ID': config[dokey].instance_id,
                       'cache-control': 'no-cache'
                    },
                    json: payload
                   };                   

                request.post(options, function (error, response, body){
                    if (error || response.statusCode >= 400) {
                        console.error('Error Creating WML job: ' + body.toString())
                        res.status(500).send('Error Creating WML job: ' + body.toString());
                    } else {
                        let object = body;

                        let jobId = object.metadata.guid;
                        
                        for (let id in formData) {
                            let csv = formData[id];                    
                            putFile(workspace, 'wml-'+jobId, id, csv);
                        }

                        if (!('cache' in config[dokey]))
                            config[dokey].cache = {};
                        config[dokey].cache[jobId] = 'SUBMITTED';

                        res.json({jobId:jobId});
                    }
                });


            } else if (('type' in config[dokey]) && config[dokey].type=='mos') {

                // Maximo

                let srequest = require('sync-request');
                // Create job                    
                let options = {
                    url: config[dokey].url + 'jobs',
                    headers: {
                        "X-IBM-Client-Id": config[dokey].key
                    },
                    json: {
                        projectId: config[dokey].projectId,
                        modelName: config[dokey].modelName,
                        modelVersion: config[dokey].modelVersion,
                        userName: config[dokey].userName
                    }
                };
        
                let sres = srequest('POST', options.url, options);
                let jobId = JSON.parse(sres.body).id;
                console.log('MOS JobID: ' + jobId);

                // PUT DATA
                //http://mfaoptservice.rtp.raleigh.ibm.com:9080/mos/jobs/5d0cd147624d4700018e2d88/webattachments/test-craft-RES-5-OPASCPSinput-82.json/blob

                jsondata = {}
                let formData = req.body;
                // from formdata to jsondata
                for (let id in formData) {
                    let csv = formData[id];
                    let name = id.split('.')[0];
                    let lines = csv.split('\n');
                    let cols = undefined;
                    let table = [];
                    for (let l in lines) {
                        let line = lines[l];
                        if (line == '')
                            continue;
                        if (cols == undefined) {
                            cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                            var ncols = cols.length;
                            for (var c=0; c<ncols; c++) {
                                let col = cols[c];
                                if (col[0] == "\"" && col[col.length-1] == "\"") {
                                    col = col.substring(1, col.length-1);
                                    cols[c] = col;
                                }
                            }
                            continue;
                        }
                        let vals = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                    
                        let row = {};
                        for (let v in vals) {
                            let val = vals[v];
                            if (val[0] == "\"" && val[val.length-1] == "\"") {
                                val = val.substring(1, val.length-1);
                            }
                            if (val == 'null')
                                val = null; 
                            else if (!isNaN(val))
                                val = parseFloat(val);
                            row[cols[v]] = val;
                        }
                        table.push(row);
                    }
                    jsondata[name] = table;
                }
                // fix modelParameters
                let modelParameters = {}
                for (let r in jsondata["modelParameters"]) {
                    let row = jsondata["modelParameters"][r];
                    modelParameters[row.name] = row.value;
                }
                jsondata["modelParameters"] = modelParameters;

                // fix solverParameters
                let solverParameters = {}
                for (let r in jsondata["solverParameters"]) {
                    let row = jsondata["solverParameters"][r];
                    solverParameters[row.name] = row.value;
                }
                jsondata["solverParameters"] = solverParameters;

                jsondata["modelType"]= "java";
                jsondata["interruptibles"]=  [];
                jsondata["model"]= "ibm.maximo.optimization.opas.modeler.OpasScheduler";

                //  fs.writeFileSync('./inputs.json', JSON.stringify(jsondata, null, 2), 'utf8');      

                // options = {
                //     url: config[dokey].url + 'jobs/' + jobId + '/webattachments/inputs.json/blob',
                //     headers: {
                //         "X-IBM-Client-Id": config[dokey].key
                //     },
                //     formData: {
                //         file: {
                //             value:  fs.createReadStream('./inputs.json'),
                //             options: {
                //               filename: 'inputs.json',
                //               contentType: 'application/json'
                //             }
                //           }
                //     },
                   
                // };

                let content = JSON.stringify(jsondata);
                let upfile = 'inputs.json';
                
                let boundary = "xxxxxxxxxx";
                let data = "";
                data += "--" + boundary + "\r\n";
                data += "Content-Disposition: form-data; name=\"file\"; filename=\"" + upfile + "\"\r\n";
                data += "Content-Type:application/octet-stream\r\n\r\n";
                let payload = Buffer.concat([
                        Buffer.from(data, "utf8"),
                        new Buffer(content, 'binary'),
                        Buffer.from("\r\n--" + boundary + "\r\n", "utf8"),
                ]);
                options = {
                    method: 'post',
                    url: config[dokey].url + 'jobs/' + jobId + '/webattachments/inputs.json/blob',
                    headers: {
                        "X-IBM-Client-Id": config[dokey].key,
                        "Content-Type": "multipart/form-data; boundary=" + boundary},
                    body: payload,
                };

        
                sres = srequest('POST', options.url, options);
                console.log(sres);

                // EXECUTE
                //http://mfaoptservice.rtp.raleigh.ibm.com:9080/mos/jobs/5d0cd147624d4700018e2d88/execute
                options = {
                    url: config[dokey].url + 'jobs/' + jobId + '/execute',
                    headers: {
                        "X-IBM-Client-Id": config[dokey].key
                    },
                };
        
                sres = srequest('POST', options.url, options);
                console.log(sres);
                res.json({jobId:jobId});
            } else if (!('model' in config[dokey])) {
                
                // MMD
                let timeLimit = req.query.timeLimit;	
                let url =config[dokey].SOLVE_URL;
                let solveConfig = config[dokey].SOLVE_CONFIG;
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
                        "Authorization": config[dokey].key
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
                
                // DO CPLEX CLOUD OR DESKTOP
                
                let model = config[dokey].model;

                console.log('Using workspace: '+workspace);
                let inputs = {}
                let formData = req.body;
                for (id in formData)
                    inputs[id] = id;

                // Ensure dir exists
                let dir = "./workspaces/"+workspace+'/do';
                if (!fs.existsSync(dir)){
                    fs.mkdirSync(dir);
                }
                
                // if model is Python
                let main = 'import pandas as pd;\n';
                main += "import threading;\n"
                main = main + 'inputs = {};\n';
                main = main + 'outputs = {};\n';
                for (i in inputs) {
                    let k = inputs[i].split('.')[0];
                    main = main + 'inputs["' + k + '"] = pd.read_csv("' + inputs[i] + '")\n';
                }
                main += 'output_lock = threading.Lock()\n';

                if ('ma' in config && 'scenario' in req.query) {
                    let scenario = req.query.scenario;
                    main = main + getModelFromCOSession(workspace, scenario, false);
                } else
                    main = main + getCommonFile(workspace, model);

                main = main + '\n'


                if ( ('type' in config[dokey]) && (config[dokey].type=='desktop')) { 
                    
                    let jobId = undefined;
                    while (jobId == undefined) {
                        jobId = "desktop." + Math.trunc(1000000*Math.random())
                        dir = "./workspaces/" + workspace + '/do/' + jobId;
                        if (fs.existsSync(dir))
                            jobId = undefined;
                    }

                    let cplex_config = "context.solver.auto_publish = True\n";
                    putFile(workspace, jobId, 'cplex_config.py', cplex_config);

                    main += "\n";

                    main += "from docplex.mp.model import *\n"
                    main += "def write_all_outputs(outputs):\n"
                    main += "    for (name, df) in iteritems(outputs):\n"
                    main += "        csv_file = '%s.csv' % name\n"
                    main += "        print(csv_file)\n"
                    main += "        with get_environment().get_output_stream(csv_file) as fp:\n"
                    main += "            if sys.version_info[0] < 3:\n"
                    main += "                fp.write(df.to_csv(index=False, encoding='utf8'))\n"
                    main += "            else:\n"
                    main += "                fp.write(df.to_csv(index=False).encode(encoding='utf8'))\n"
                    main += "write_all_outputs(outputs)\n"

                    main += "\n";                    
                    main += 'import json\n';
                    main += 'jsonsol = {};\n';
                    main += 'for (name, df) in iteritems(outputs):\n';
                    main += "   csv = '%s.csv' % name;\n"    
                    main += "   jsonsol[csv] = csv \n";
                    main += "with open('mysolution.json', 'w+') as outfile:\n";  
                    main += "   json.dump(jsonsol, outfile)";

                    putFile(workspace, jobId, 'main.py', main);                
                    for (i in inputs) {
                        putFile(workspace, jobId, inputs[i], formData[i]);               
                    }
                    var exec = require('child_process').exec, child;

                    exec('python main.py > log.txt', 
                    // exec('where python', 
                        {cwd: "./workspaces/"+workspace+'/do/'+jobId},
                        function (error, stdout, stderr) {
                            console.log('Dekstop solve ended.');
                            config[dokey].cache[jobId] = 'PROCESSED';
                            if (error !== null) {
                                console.log('exec error: ' + error);
                            }
                        });
                    if (!('cache' in config[dokey]))
                        config[dokey].cache = {}
                    config[dokey].cache[jobId] = 'RUNNING';

                    res.json({jobId:jobId});

                } else {

                    main = main + 'from docplex.util.environment import get_environment\n'
                    main = main + 'get_environment().store_solution(outputs)\n'

                    let job = createJob(workspace, dokey, model, inputs)
                    var location = job.headers.location; 
                    var jobId = location.substr(location.lastIndexOf('/') + 1)


                    putFile(workspace, jobId, 'main.py', main);                
                    pushAttachment(workspace, dokey, jobId, model, main);
                    for (i in inputs) {
                        putFile(workspace, jobId, inputs[i], formData[i]);
                        pushAttachment(workspace, dokey, jobId, inputs[i], formData[i]);                     
                    }
                    submitJob(workspace, dokey, jobId)
                    res.json({jobId:jobId});
                }
            }	
        });

        router.get('/optim/status', function(req, res) {
            
            let workspace = getWorkspace(req);
            let dokey = getDOKey(req);
            console.log('GET /api/optim/status called on workspace ' + workspace + ' and dokey ' +dokey);

            let config = getConfig(workspace);

            if (('type' in config[dokey]) && config[dokey].type=='wml') {

                // WML

                let jobId = req.query.jobId;	               
                if (!('cache' in config[dokey]))
                    config[dokey].cache = {};

                let status = {executionStatus: config[dokey].cache[jobId]}
                if (config[dokey].cache[jobId] == 'DONE') {
                    
                    let resjson = {solveState:status};
                    res.json(resjson);

                } else {
                    // curl -X GET https://us-south.ml.cloud.ibm.com/v4/jobs/<job_id> \
                    //     -H "Authorization: bearer <token>" \
                    //     -H "ML-Instance-ID: <ml_instance_id>" \
                    //     -H 'Content-Type: application/json' \
                    //     -H 'cache-control: no-cache'

    
                    let options = {
                        url: config[dokey].url + '/v4/jobs/' + jobId,
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': 'bearer ' + getDOBearerToken(workspace, dokey),
                            'ML-Instance-ID': config[dokey].instance_id,
                            'cache-control': 'no-cache'
                        }
                    };

                    request.get(options, function (error, response, body){
                        if (error || response.statusCode >= 400) {
                            console.error('Error Getting WML status: ' + body.toString())
                            res.status(500).send('Error Getting WML status: ' + body.toString());
                        } else {
                            let object = JSON.parse(body);
                            
                            let state = object.entity.decision_optimization.status.state;
                            
                            let resjson = {};

                            if (state == 'queued') {
                                config[dokey].cache[jobId] = 'QUEUED'
                                status.executionStatus = 'QUEUED'
                            } else if (state == 'running') {
                                config[dokey].cache[jobId] = 'RUNNING'
                                status.executionStatus = 'RUNNING'
                            } else if (state == 'failed') {

                                config[dokey].cache[jobId] = 'FAILED'
                                status.executionStatus = 'FAILED'

                            } else if (state == 'completed') {

                                status.executionStatus = "PROCESSED"
                                let outputAttachments = []
                                for (s in object.entity.decision_optimization.output_data) {
                                    let output = object.entity.decision_optimization.output_data[s];
                                    
                                    let name = output.id.split('.')[0];
                                    let csv =''
                                    let first = true;
                                    for (c in output.fields) {
                                        if (!first)
                                            csv += ',';
                                        csv += output.fields[c]
                                        first = false;
                                    }
                                    csv += '\n';
                                    for (r in output.values) {
                                        let row = output.values[r]
                                        first = true;
                                        for (c in row) {
                                            if (!first)
                                                csv += ',';
                                            csv += row[c]
                                            first = false;
                                        }
                                        csv += '\n';
                                    }
                                    outputAttachments.push({name:name, csv:csv});
                                                       
                                    putFile(workspace, 'wml-'+jobId, name+'.csv', csv);
                                    
                                }     
                                // if (!('kpis.csv' in solution))
                                //     outputAttachments.push({name:'kpis', csv:getFile(workspace, jobId, 'kpis.csv')});
                                resjson.outputAttachments = outputAttachments;
                                config[dokey].cache[jobId] = 'DONE'
                            } 

                            resjson.solveState = status;
                            res.json(resjson);
                            
                        }
                    });
                                    
                }


            } else if (('type' in config[dokey]) && config[dokey].type=='mos') {

                // Maximo

                let jobId = req.query.jobId;	

                if (!('cache' in config[dokey]))
                    config[dokey].cache = {};
                if ( (jobId in config[dokey].cache) && 
                    config[dokey].cache[jobId] =='DONE') {
                        res.json({solveState:{executionStatus:'UNKNOWN'}});
                        return;
                    }

                let srequest = require('sync-request');
                

                // get job status         
                let options = {
                    url: config[dokey].url + 'jobs/' + jobId,
                    headers: {
                        "X-IBM-Client-Id": config[dokey].key
                    }
                };
        
                let sres = srequest('GET', options.url, options);
                let status= JSON.parse(sres.body)

                config[dokey].cache[jobId] = status.executionStatus;

                let resjson = {solveState:status};
                console.log(status.executionStatus);
                if (status.executionStatus == "PROCESSED") {

                    //http://mfaoptservice.rtp.raleigh.ibm.com:9080/mos/jobs/5d108798624d4700018e2ee6/attachments/output.json/blob

                    let options = {
                        url: config[dokey].url + 'jobs/' + jobId + '/attachments/output.json/blob',
                        headers: {
                            "X-IBM-Client-Id": config[dokey].key
                        }
                    };
            
                    let sres = srequest('GET', options.url, options);
                    let solutionjson = JSON.parse(sres.body);

                    function isArray (value) {
                        return value && typeof value === 'object' && value.constructor === Array;
                    }

                    // let solution = JSON.parse(getFile(workspace, jobId, 'solution.json'));
                    let outputAttachments = []
                    for (let s in solutionjson) {
                        let name = s;
                        let solution = solutionjson[s];
                        let csv = '';
                        if (isArray(solution) && solution.length > 0) {
                            let first = true;
                            for (let c in solution[0]) {
                                if (!first)
                                    csv += ',';
                                csv += '"'+c+'"'
                                first = false;
                            }
                            csv += '\n';
                            
                            for (let i in solution)  {
                                let row = solution[i];
                                first = true;
                                for (let c in solution[0]) {
                                    if (!first)
                                        csv += ',';
                                    csv += '"'+row[c]+'"'
                                    first = false;
                                }
                                csv += '\n';
                            }
                        } else {
                            csv = '"name","value"\n';
                            for (let i in solution)  {
                                csv += '"' + i + '","' + solution[i] + '"\n';
                            }
                        }
                        outputAttachments.push({name:name, csv:csv});
                    }     
                    // if (!('kpis.csv' in solution))
                    //     outputAttachments.push({name:'kpis', csv:getFile(workspace, jobId, 'kpis.csv')});
                    resjson.outputAttachments = outputAttachments;
                    
                    config[dokey].cache[jobId] = 'DONE';
                }

                res.json(resjson);
            } else if (!('model' in config[dokey])) {
                
                // MMD

                let jobId = req.query.jobId;	

                let options = {
                    type: "GET",
                    url: config[dokey].SOLVE_URL.split("?")[0]+"/"+jobId, // FIX for DO4WS 1.1
                    headers: {
                        "Authorization": config[dokey].key
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
                            
            } else if ( ('type' in config[dokey]) && (config[dokey].type=='desktop')) { 
                
                // DESKTOP

                let jobId = req.query.jobId;
                let status = {executionStatus: config[dokey].cache[jobId]}
                let resjson = {solveState:status};
                console.log(status.executionStatus);
                if (status.executionStatus == "PROCESSED") {
                    let solution = JSON.parse(getFile(workspace, jobId, 'mysolution.json'));
                    let outputAttachments = []
                    for (s in solution) {
                        if (s.includes('csv')) {
                            let name = s.split('.')[0];
                            outputAttachments.push({name:name, csv:getFile(workspace, jobId, s)});
                        }
                    }     
                    if (!('kpis.csv' in solution))
                        outputAttachments.push({name:'kpis', csv:getFile(workspace, jobId, 'kpis.csv')});
                    resjson.outputAttachments = outputAttachments;
                    config[dokey].cache[jobId] = 'DONE'
                }
            
                res.json(resjson);
            } else {
                
                // DO CPLEX CLOUD

                let jobId = req.query.jobId;

                console.log('Using workspace: '+workspace);
                let status = getJobStatus(workspace, dokey, jobId);
                if (status == undefined)
                    status = {executionStatus: "UNKNOWN"};

                let resjson = {solveState:status};
                console.log(status.executionStatus);
                if (status.executionStatus == "PROCESSED") {
                    let solution = getSolution(workspace, dokey, jobId) 
                    let outputAttachments = []
                    for (s in solution) {
                        if (s.includes('csv')) {
                            let name = s.split('.')[0];
                            outputAttachments.push({name:name, csv:getFile(workspace, jobId, s)});
                        }
                    }     
                    resjson.outputAttachments = outputAttachments;
                    pullLog(workspace, dokey, jobId)
                    deleteJob(workspace, dokey, jobId)
                }
                if (status.executionStatus == "FAILED") {
                    pullLog(workspace, dokey, jobId)
                    deleteJob(workspace, dokey, jobId)
                }
            
                res.json(resjson);

            }
        });
     

        router.get('/optim/deployed_models', function(req, res) {
            
            let workspace = getWorkspace(req);
            let dokey = getDOKey(req);
            console.log("GET/api/optim/deployed_models called for workspace "+workspace + ' and dokey ' +dokey);
            let config = getConfig(workspace);

            if (('type' in config[dokey]) && config[dokey].type=='wml') {

                let options = {
                    url: config[dokey].url + '/v4/models',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': 'bearer ' + getDOBearerToken(workspace, dokey),
                        'ML-Instance-ID': config[dokey].instance_id,
                        'cache-control': 'no-cache'
                    }
                };

                request.get(options, function (error, response, body){
                    if (error || response.statusCode >= 400) {
                        console.error('Error getting deployed models: ' + body.toString())
                        res.json({});
                    } else {
                        let object = JSON.parse(body);
    
                        res.json(object);
                    
                    }
                });	

            } else {
                res.json({});
            }
        });

        router.delete('/optim/deployed_models/:guid', function(req, res) {
            let guid = req.params.guid;
            
            let workspace = getWorkspace(req);
            let dokey = getDOKey(req);
            console.log('DELETE /api/optim/deployed_models called on workspace ' + workspace + ' and dokey ' +dokey);
            let config = getConfig(workspace);

            if (('type' in config[dokey]) && config[dokey].type=='wml') {

                let options = {
                    url: config[dokey].url + '/v4/models/' + guid,
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': 'bearer ' + getDOBearerToken(workspace, dokey),
                        'ML-Instance-ID': config[dokey].instance_id,
                        'cache-control': 'no-cache'
                    }
                };

                request.delete(options, function (error, response, body){
                    if (error || response.statusCode >= 400) {
                        console.error('Error deleting deployed model: ' + body.toString())
                        res.json({});
                    } else {
                        res.json({});                    
                    }
                });	

            } else {
                res.json({});
            }
        });


        router.get('/optim/deployments', function(req, res) {
            
            let workspace = getWorkspace(req);
            let dokey = getDOKey(req);
            console.log("GET /api/optim/deployments called for workspace "+workspace + ' and dokey ' +dokey);
            let config = getConfig(workspace);

            if (('type' in config[dokey]) && config[dokey].type=='wml') {

                let options = {
                    url: config[dokey].url + '/v4/deployments',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': 'bearer ' + getDOBearerToken(workspace, dokey),
                        'ML-Instance-ID': config[dokey].instance_id,
                        'cache-control': 'no-cache'
                    }
                };
                
                request.get(options, function (error, response, body){
                    if (error || response.statusCode >= 400) {
                        console.error('Error getting deployments: ' + body.toString())
                        res.json({});
                    } else {
                        let object = JSON.parse(body);
    
                        res.json(object);
                    
                    }
                });	

            } else {
                res.json({});
            }
        });

        router.delete('/optim/deployments/:guid', function(req, res) {
            let guid = req.params.guid;
            
            let workspace = getWorkspace(req);
            let dokey = getDOKey(req);
            console.log('DELETE /api/optim/deployments called on workspace ' + workspace + ' and dokey ' +dokey);
            let config = getConfig(workspace);

            if (('type' in config[dokey]) && config[dokey].type=='wml') {

                let options = {
                    url: config[dokey].url + '/v4/deployments/'+guid,
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': 'bearer ' + getDOBearerToken(workspace, dokey),
                        'ML-Instance-ID': config[dokey].instance_id,
                        'cache-control': 'no-cache'
                    }
                };

                request.delete(options, function (error, response, body){
                    if (error || response.statusCode >= 400) {
                        console.error('Error deleting deployment: ' + body.toString())
                        res.json({});
                    } else {
                        res.json({});                    
                    }
                });	

            } else {
                res.json({});
            }
        });

        function getCOSession(workspace, scenario) {
            let config = getConfig(workspace);
            var fs = require('fs');

            let filePath = './workspaces/'+workspace+'/data/'+scenario+'/'+config.ma.session;
            let contents = fs.readFileSync(filePath, 'utf8');
            let co_session = JSON.parse(contents);
            
            return  co_session;
        }

        // load the session
        router.get('/ma/session', function(req, res) {
            let workspace = getWorkspace(req);
            let scenario = req.query.scenario;            

            console.log("GET /api/ma/session called for scenario " + scenario);
            
            let session = getCOSession(workspace, scenario);
            
            res.json(session);
        });        

        // save the session
        router.put('/ma/session', function(req, res) {
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let scenario = req.query.scenario;
            let co_session = req.body;

            console.log("PUT /api/ma/session called for scenario " + scenario);
            

            fs.writeFileSync('./workspaces/'+workspace+'/data/'+scenario+'/'+config.ma.session, 
                JSON.stringify(co_session, null, 2), 'utf8');

            res.status(200);
            res.end();
        });
        
        // refine the session
        router.post('/ma/session', function(req, res) {
            console.log("POST /api/ma/session called");
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let scenario = req.query.scenario;
            let co_session = req.body;            

            let mauser = 'TestUser';
            let maurl = config.ma.url;

            let srequest = require('sync-request');

            const options = {
                url: maurl + mauser + '/refineDesignSession?dataset=' + scenario,
                json: co_session
            };
        
            let sres = srequest('POST', options.url, options);

            if (sres.statusCode >= 400)
                console.error(sres.getBody().toString())

            res.json(JSON.parse(sres.body).designSession);
        });
        

        // save data in data set
        router.put('/ma/dataset', function(req, res) {
            console.log("PUT /api/ma/dataset called");
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let scenario = req.query.scenario;            

            let mauser = 'TestUser';
            let maurl = config.ma.url;

            let srequest = require('sync-request');

            let tables = JSON.parse(fs.readFileSync("./workspaces/"+workspace+"/data/"+scenario+"/scenario.json", {encoding: 'utf-8'}));
            for (let tableId in tables) {
                let table = tables[tableId];
                if (table.category == 'input') {
                    let csvtxt = fs.readFileSync("./workspaces/"+workspace+"/data/"+scenario+"/"+tableId+".csv", {encoding: 'utf-8'});
                    const options = {
                        url:maurl + mauser + '/uploadCsvFile?dataset=' + scenario + '&tableName=' + tableId,
                        headers: {"Content-Type": "text/plain"},
                        body: csvtxt
                        };
                                    
                    let sres = srequest('PUT', options.url, options);
                    if (sres.statusCode == 200)
                        console.log('Pushed to MA data set ' + tableId)
                    else
                        console.error(sres);
                }
            }
            res.status(200);
            res.end();

        });        

        function getModelFromCOSession(workspace, scenario, saveModel = false) {
            console.log('Get model from session');

            let config = getConfig(workspace);
            let mauser = 'TestUser';
            let maurl = config.ma.url;

            let srequest = require('sync-request');

            let co_session = getCOSession(workspace, scenario);

            const options = {
                url: maurl + mauser + '/getOptimModel?dataset=' + scenario,
                json: co_session
            };
        
            let sres = srequest('POST', options.url, options);

            let obj = JSON.parse(sres.body.toString()); 
            let model = obj.updatedOptimModels[0].model;

            if (saveModel)
                fs.writeFileSunc("./workspaces/"+workspace+"/data/"+scenario+'/'+config[dokey].model, model, { flag: 'w' });

            return model
        }

        // Calculate model
        router.post('/ma/model', function(req, res) {
            console.log("POST /api/ma/model called");
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let scenario = req.query.scenario;
          
            let model = getModelFromCOSession(workspace, scenario, true);


            console.log("Model saved in scenario folder OK")
            res.status(200);
            res.end();            
        });        

        router.put('/optim/model', function(req, res) {

            let workspace = getWorkspace(req);
            let dokey = getDOKey(req);
            let config = getConfig(workspace);
			
            if (!('model' in config[dokey])) {
            } else {

                let workspace = getWorkspace(req);
                let config = getConfig(workspace);

                console.log("PUT /api/optim/model called on workspace: " + workspace + ' and dokey ' +dokey);
                let dir = "./workspaces/"+workspace+'/do';
                if (!fs.existsSync(dir)){
                    fs.mkdirSync(dir);
                }
                fs.writeFile("./workspaces/"+workspace+"/do/"+config[dokey].model, req.body.model, { flag: 'w' },  function(err,data){
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

        function lookupMLBearerToken(workspace, mlkey) {
            
            let config = getConfig(workspace);

            // Cloud

            const options = {
                url: IAM_URL,
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
                body: 'grant_type=urn:ibm:params:oauth:grant-type:apikey&response_type=cloud_iam&apikey='+config[mlkey].apikey
                };

            let srequest = require('sync-request');

            let res = srequest('POST', options.url, options);
            let object = JSON.parse(res.getBody())

            //console.log(object);

            config[mlkey].bearerToken =   object.access_token;
            config[mlkey].bearerTokenTime = Date.now();
            
    
        }

        function getMLBearerToken(workspace, mlkey) {
            let config = getConfig(workspace);
            if ( !('bearerTokenTime' in config[mlkey]) ||
                (config[mlkey].bearerToken == null) ||
                (config[mlkey].bearerTokenTime + 1000 * IAM_TIMEOUT < Date.now()) )
                lookupMLBearerToken(workspace, mlkey);

            return config[mlkey].bearerToken;
        }

        function getMLKey(req) {
            let mlkey = req.query.mlkey;
            if ( (mlkey == undefined) || (mlkey == "") )
                mlkey = "ml";
            return mlkey;
        }

        router.post('/ml/score', upload.fields([]), (req, res) => {

            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let mlkey = getMLKey(req);

            console.log("/api/ml/score called for workspace "+workspace+" and mlkey "+mlkey);

            // expected input 
            // {
            //     "fields": ["Pregnancies", "Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI", "DiabetesPedigreeFunction", "Age", "Id"],
            //     "values": [[1,1,1,1,1,1,1,1,1]]
            // }

            let json = req.body;

            // console.log(json);

            let useV4 = ( ('version' in config[mlkey]) && (config[mlkey].version == 'v4') );
            if ( useV4 ) { 
                json = {input_data:[json]};
                //console.log(JSON.stringify(json, null, 2));
            }

            let options = {
                type: "POST",
                url: config[mlkey].url,
                json: json,
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + getMLBearerToken(workspace, mlkey)
                },
                secureProtocol : 'SSLv23_method'
            }

            if ( useV4 )
                options.headers['ML-Instance-ID'] = config[mlkey].instance_id;

            let request = require('request');

            request.post(options, function (error, response, body){

                if (!error ) {          
                    if (response.statusCode >= 400) {
                        console.error(body.toString())
                    } else if ('errors' in body) {
                        console.error("ML score Errors : ");
                        for (let e in body.errors)                    
                            console.error(body.errors[e].message);
                        res.json(body)
                    } else {
                        console.log("ML score OK")
                        if ( useV4 ) 
                            res.json(body.predictions[0])
                        else
                            res.json(body)                      
                        }
                } else   
                    console.error("ML score error:" +error+ " response:" + JSON.stringify(response))
                });		
            	
        });

    },

    
    routePA: function (router) {        

        function getPAToken(workspace) {
            let config = getConfig(workspace);

			if ('authurl' in config.pa) {
				let options = {
					type: "POST",
					url: config.pa.authurl,
					body: "grant_type=client_credentials&scope=v0userContext",
					headers: {
						authorization: 'Basic ' + new Buffer(config.pa.username + ':' + config.pa.password, 'ascii').toString('base64'),
						accountId:config.pa.accountId,
						tenantId:config.pa.tenantId,
						userId:config.pa.userId,
						"Content-Type":"application/x-www-form-urlencoded"
					}                
				}

				let srequest = require('sync-request');

				let res = srequest('POST', options.url, options);
				try {
					let object = JSON.parse(res.getBody())
					console.log(object);

                    config.pa.access_token = object.access_token;
                    config.pa.token_time = Date.now();
		
				} catch (err) {
					console.log(err);
				}
			} else if ('loginurl' in config.pa) {
				
				let options = {
					type: "POST",
					url: config.pa.loginurl,
					body: "mode=basic&username="+config.pa.username+"&password="+config.pa.password,
					
					headers: {						
						"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8",
						Accept: 'application/json'
					}                
				}

				let srequest = require('sync-request');

				let res = srequest('POST', options.url, options);
				try {
					console.log(res.getBody());
					let object = JSON.parse(res.getBody())
					console.log(object);
					console.log(res.headers);
					
					config.pa.cookies = res.headers['set-cookie'][1].split(';')[0];
                    config.pa.token_time = Date.now();
		
				} catch (err) {
					console.log(err);
				}
				
			} 
        }

        function getHeaders(workspace) {
            let config = getConfig(workspace);
			if ('authurl' in config.pa) {
                if ( !('token_time' in config.pa) || 
                     (config.pa.token_time + 1000*60 < Date.now()) ) 
                    getPAToken(workspace)

				return {
					Authorization: "Bearer " + config.pa.access_token,
					accountId:config.pa.accountId,
					tenantId:config.pa.tenantId,
					userId:config.pa.userId
				};
			} else if ('loginurl' in config.pa) {
                if ( !('token_time' in config.pa) || 
                     (config.pa.token_time + 1000*60 < Date.now()) ) 
                    getPAToken(workspace)

				return {
					cookie:config.pa.cookies
				};
			} else {
                return {
                    Authorization: 'CAMNamespace ' + new Buffer(config.pa.username + ':' + config.pa.password + ':' + config.pa.camnamespace, 'ascii').toString('base64'),
				};
            }
        }

        function getURL(workspace) {
            let config = getConfig(workspace);
            return config.pa.url;
        }


        function initCache(workspace) {
            let config = getConfig(workspace);
            if (!('cache' in config.pa))
                config.pa.cache = {}
            if (!('dimensions' in config.pa.cache))
                config.pa.cache.dimensions = {}
            if (!('cubes' in config.pa.cache))
                config.pa.cache.cubes = {}
        }
        function getDimensions(workspace, allowCache = false) {

            initCache(workspace);

            let config = getConfig(workspace);
            if (allowCache && 'alldimensions' in config.pa.cache)
                return Object.keys(config.pa.cache.alldimensions);

            let options = {
                headers: getHeaders(workspace),
                url: getURL(workspace) + '/api/v1/Dimensions'
            };          

            let srequest = require('sync-request');

            let res = srequest('GET', options.url, options);
            let obj = JSON.parse(res.getBody())

            let nDimensions = obj.value.length;
    
            let dimensionNames = [];

            config.pa.cache.alldimensions = {}

            for (let i=0; i<nDimensions; i++) {
                let dimensionName = obj.value[i].Name;
                if (dimensionName.startsWith('}'))
                    continue;
                dimensionNames.push(dimensionName)
                config.pa.cache.alldimensions[dimensionName] = {}
            }	
                
            return dimensionNames;					
                   
        }
        router.get('/pa/dimensions', function(req, res) {
            console.log('GET /api/pa/dimensions called');
            let workspace = getWorkspace(req);
            res.json(getDimensions(workspace));
        });

        
        function existsDimension(workspace, dimensionName, allowCache = false) {            
            return getDimensions(workspace, allowCache).includes(dimensionName);                    
        }
    
        function getDimension(workspace, dimensionName, onlyLevel = undefined, allowCache = false) {            

            initCache(workspace);

            let config = getConfig(workspace)
            let level = (onlyLevel == undefined) ? 'ALL' : onlyLevel;
            if ( allowCache &&
                (dimensionName in config.pa.cache.dimensions) && 
                ('values' in config.pa.cache.dimensions[dimensionName]) ) {
                    if (level in config.pa.cache.dimensions[dimensionName].values)
                        return config.pa.cache.dimensions[dimensionName].values[level];
                }

            //dimensionName = encodeURIComponent(dimensionName);

            let options = {
                headers: getHeaders(workspace),
                url: getURL(workspace) + "/api/v1/Dimensions('"+dimensionName+"')/Hierarchies('"+dimensionName+"')/Elements?$expand=Parents"
            };

            let srequest = require('sync-request');

            let res = srequest('GET', options.url, options);
            let object = JSON.parse(res.getBody())


            let nElements = object.value.length;				
            
            let dimensionValues = [];

            for (let i=0; i<nElements; i++) {
                let name = object.value[i].Name;
                let level = object.value[i].Level;

                if (onlyLevel != undefined) {
                    if (onlyLevel!=level)
                        continue;
                    dimensionValues.push(name);
                } else {
                    let parents = []
                    for (o in  object.value[i].Parents) {
                        let parent = object.value[i].Parents[o].Name;
                        parents.push(parent);
                    }
                    dimensionValues.push({name:name, level:level, parents:parents})   
                }
            }                

            if ( !(dimensionName in config.pa.cache.dimensions) )
                config.pa.cache.dimensions[dimensionName] = { }
            if (!('values' in config.pa.cache.dimensions[dimensionName]))
                config.pa.cache.dimensions[dimensionName].values={}

            config.pa.cache.dimensions[dimensionName].values[level] = dimensionValues;

            return dimensionValues;					
                      
        }

        router.get('/pa/dimension/:dimensionName', function(req, res) {
            let dimensionName = req.params.dimensionName;
            let onlyLevel  = req.query.onlyLevel;
            let workspace = getWorkspace(req);
            console.log('GET /api/pa/dimension/' + dimensionName + '/dimensions called for workspace '+ workspace);            
            res.json(getDimension(workspace, dimensionName, onlyLevel));
            
        });

        function createDimensionSubset(workspace, dimensionName, values, setName, element_type = undefined) {
            // Suppose values are already added before
            // Suppose hierarhcy already created with dimensionName

            //dimensionName = encodeURIComponent(dimensionName);
            let hierarchyName = dimensionName;

    //		POST /api/v1/Dimensions
    //
    //		{
    //		    "Name": "my_plan_department",
    //		    "UniqueName": "[my_plan_department]",
    //		    "Attributes": {
    //		        "Caption": "My plan department"
    //		    }  
    //		}
            let content = {
                "Name": setName,
                "UniqueName": "["+setName+"]",
                "Attributes" : {
                    "Caption": setName
                }
            };                        

            let options = {
                type: "POST",
                url: getURL(workspace) + "/api/v1/Dimensions('"+dimensionName+"')/Hierarchies('"+hierarchyName+"')/Subsets",
                json: content,
                headers: getHeaders(workspace)
            }


            let srequest = require('sync-request');

            let sres = srequest('POST', options.url, options);
            if (sres.statusCode >= 400) {
                console.error(JSON.stringify(allcontent));
                console.error(sres.getBody().toString())
            }

                
    //		PATCH https://ibmtraining.planning-analytics.ibmcloud.com/tm1/api/Decision%20Optimisation/api/v1/Dimensions('countries')/Hierarchies('continents')/Subsets('Europe')
    //		{  "Elements@odata.bind":
    //			[
    //			"Dimensions('countries')/Hierarchies('countries')/Elements('France')"
    //			]
    //			}
            
            content = {}
            let aelements = []
            for (let v in values) {
                let value = values[v]
                aelements.push("Dimensions('"+dimensionName+"')/Hierarchies('"+hierarchyName+"')/Elements('"+value+"')");			
            }
            content["Elements@odata.bind"] = aelements;

            options = {
                type: "PATCH",
                url: getURL(workspace) + "/api/v1/Dimensions('"+dimensionName+"')/Hierarchies('"+hierarchyName+"')/Subsets('"+setName+"')",
                json: content,
                headers: getHeaders(workspace)
            }

            sres = srequest('PATCH', options.url, options);
            if (sres.statusCode >= 400) {
                console.error(JSON.stringify(allcontent));
                console.error(sres.getBody().toString())
            }
        }

        function addValuesToDimension(workspace, dimensionName, values, parent = undefined, level = 0, element_type = undefined) {
            //dimensionName = encodeURIComponent(dimensionName);
            let hierarchyName = dimensionName;
            
            let allcontent = []
            for (let v in values) {
                let content = {
                    "Name": values[v],
                    "Level": level
                }
                if (level>0) {
                    content["Type"] = "Consolidated";
                } 
                else if (element_type != undefined)
    			    content["Type"] = element_type;                    
 
                allcontent.push(content)        
            }

            let url = getURL(workspace) + "/api/v1/Dimensions('"+dimensionName+"')/Hierarchies('"+hierarchyName+"')/Elements";
            if (parent != undefined)
                url += "('"+parent+"')/Components";

            let options = {
                type: "POST",
                url: url,
                json: allcontent,
                headers: getHeaders(workspace)
            }


            let srequest = require('sync-request');

            let sres = srequest('POST', options.url, options);
            if (sres.statusCode >= 400) {
                console.error(JSON.stringify(allcontent));
                console.error(sres.getBody().toString())
            }
        }

        function addValueToDimension(workspace, dimensionName, value, parent = undefined, level = 0, element_type = undefined) {
            //dimensionName = encodeURIComponent(dimensionName);
            hierarchyName = dimensionName;
            
            let content = {
                "Name": value,
                "Level": level
            }
            if (element_type != undefined)
    			content["Type"] = element_type;                    
            
            let options = {
                type: "POST",
                url: getURL(workspace) + "/api/v1/Dimensions('"+dimensionName+"')/Hierarchies('"+hierarchyName+"')/Elements",
                json: content,
                headers: getHeaders(workspace)
            }


            let srequest = require('sync-request');

            let sres = srequest('POST', options.url, options);
            if (sres.statusCode >= 400)
                console.error(sres.getBody().toString())
        }

        function createDimension(workspace, dimensionName, values = undefined, dimension_type = undefined)  {

            console.log('  Creating PA dimension: ' + dimensionName);
            //dimensionName = encodeURIComponent(dimensionName);

            initCache(workspace);
            let config = getConfig(workspace);

            if ('alldimensions' in config.pa.cache)
                config.pa.cache.alldimensions[dimensionName] = {}

            let content = {
                "Name":  dimensionName,
                "UniqueName": "["+dimensionName+"]"
            }

    		// if (dimension_type != undefined)
            //     content["Type"] = dimension_type;
                
            let  att = {
                "Caption": dimensionName
            }
            if (dimension_type!=undefined)
                att["Type"] = dimension_type;
            content["Attributes"] = att;
            
            let options = {
                type: "POST",
                url: getURL(workspace) + '/api/v1/Dimensions',
                json: content,
                headers: getHeaders(workspace)
            }


            let srequest = require('sync-request');

            let res = srequest('POST', options.url, options);
            let object = JSON.parse(res.getBody())


            // create Hierarchy
            let hierarchyName = dimensionName;
            content = {
                "Name": hierarchyName,
                "UniqueName": "["+hierarchyName+"]",
                "Attributes": {
                    "Caption": hierarchyName
                }
            }

            options = {
                type: "POST",
                url: getURL(workspace) + "/api/v1/Dimensions('"+hierarchyName+"')/Hierarchies",
                json: content,
                headers: getHeaders(workspace)                
            }
            

            res = srequest('POST', options.url, options);
            object = JSON.parse(res.getBody())

            let ALL = 'All';

            // Add values
            if (values != undefined) {

                let all = undefined;
                if (dimension_type != "String") {
                    // CREATE_CONSOLIDATED
                    all = ALL + " " + dimensionName.substring(0, 1).toUpperCase() + dimensionName.substring(1, dimensionName.length);
                    if (!all.endsWith("s"))
                        all = all + "s";
                    addValueToDimension(workspace, dimensionName, all, undefined, 1, "Consolidated");
                }

                addValuesToDimension(workspace, dimensionName, values, all, 0, dimension_type)
            }

            createDimensionSubset(workspace, dimensionName, values, ALL);
        }

        function deleteDimension(workspace, dimensionName) {
            
            console.log('  Deleting PA dimension: ' + dimensionName);

            initCache(workspace)

            let config = getConfig(workspace);
                
            // String encDimensionName = encode(dimensionName);            
         
            let options = {
                type: "DELETE",
                url: getURL(workspace) + "/api/v1/Dimensions('"+dimensionName+"')",
                headers: getHeaders(workspace)               
            }
            let request = require('request');

            request.delete(options, function(error, response, body){
               
                if (error || response.statusCode >= 400) {
                    console.error('Error deleting dimension '+dimensionName);
                } else {

                    // let object = JSON.parse(res.getBody())

                    // Remove from cache
                    if ('alldimensions' in config.pa.cache && dimensionName in config.pa.cache.alldimensions) {
                        delete config.pa.cache.alldimensions[dimensionName];
                    }
                    if ('dimensions' in config.pa.cache && dimensionName in config.pa.cache.dimensions) {
                        delete config.pa.cache.dimensions[dimensionName];
                    }
                }
            });
        }

        router.delete('/pa/dimension/:dimensionName', function(req, res) {
            let dimensionName = req.params.dimensionName;
            let workspace = getWorkspace(req);
          
            console.log('DELETE /api/pa/dimension/' + dimensionName + ' called form workspace '+workspace);

            if (existsDimension(workspace, dimensionName, true))
                deleteDimension(workspace, dimensionName);
            res.status(200);
            res.end();
        });


    
        function getCubes(workspace, allowCache=false) {
            
            initCache(workspace)  

            let config = getConfig(workspace);
            if (allowCache && ('allcubes' in config.pa.cache))
                return config.pa.cache.allcubes;

            let options = {
                headers: getHeaders(workspace),
                url: getURL(workspace) + '/api/v1/Cubes'
            };    

            let srequest = require('sync-request');

            let res = srequest('GET', options.url, options);
            let obj = JSON.parse(res.getBody())


            let nCubes = obj.value.length;
    
            let cubeNames = [];

            for (let i=0; i<nCubes; i++) {
                let cubeName = obj.value[i].Name;
                if (cubeName.startsWith('}'))
                    continue;
                cubeNames.push(cubeName)
            }	
                
            config.pa.cache.allcubes = cubeNames;

            return cubeNames;					
                            
        }

        router.get('/pa/cubes', function(req, res) {
            console.log('GET /api/pa/cubes called');
            let workspace = getWorkspace(req);
            res.json(getCubes(workspace));					
                            
        });

        function existsCube(workspace, cubeName, allowCache = false) {                      
            return getCubes(workspace, allowCache).includes(cubeName);                    
        }

        function getCubeDimensionNames(workspace, cubeName) {            

            initCache(workspace);

            let config = getConfig(workspace);
            if ( (cubeName in config.pa.cache.cubes) && 
                ('dimensions' in config.pa.cache.cubes[cubeName]) )
                return config.pa.cache.cubes[cubeName].dimensions;

            //cubeName = encodeURIComponent(cubeName);

            let options = {
                headers: getHeaders(workspace),
                url: getURL(workspace) + '/api/v1/Cubes(\''+cubeName+'\')/Dimensions'
            };
        
            let srequest = require('sync-request');

            let res = srequest('GET', options.url, options);
            let obj = JSON.parse(res.getBody())

            let nDimensions = obj.value.length;
    
            let dimensionNames = [];

            for (let i=0; i<nDimensions; i++) {
                let dimensionName = obj.value[i].Name;
                if (dimensionName.startsWith('}'))
                    continue;
                dimensionNames.push(dimensionName)
            }	
    
            if ( !(cubeName in config.pa.cache.cubes) )
                config.pa.cache.cubes[cubeName] = {}
            config.pa.cache.cubes[cubeName].dimensions = dimensionNames;

            return dimensionNames;
                
        }

        router.get('/pa/cube/:cubeName/dimensions', function(req, res) {
            let cubeName = req.params.cubeName;
            let workspace = getWorkspace(req);
            console.log('GET /api/pa/cube/' + cubeName + '/dimensions called for workspace '+ workspace);            
            res.json(getCubeDimensionNames(workspace, cubeName));
        });

        function rootElements(name) {
            //		[" + name + "].AllMembers
                    return "{TM1FILTERBYLEVEL( {TM1SUBSETALL( ["+name+"] )}, 0 )}";
                }

        function makeQuery(workspace, cubeName, versionDimensionName, version)  {
            let cubeDimensionNames = getCubeDimensionNames(workspace, cubeName);
            let nDim = cubeDimensionNames.length;
            let query = null;
            if ((nDim==2) && (versionDimensionName!=null)) {
                // SELECT {[Version].[Baseline]} *  {{TM1FILTERBYLEVEL( {TM1SUBSETALL( [state] )}, 0)}} ON 0 FROM [stateCustomers]
                // SELECT {[Version].[baseline]} ON 0, {{TM1FILTERBYLEVEL( {TM1SUBSETALL( [salesrep] )}, 0)}} ON 1 FROM [salesrepNum]
                query = "SELECT  {[" +  versionDimensionName + "].[" + version + "]} on 0, ";
                query += " {" + rootElements(cubeDimensionNames[0]) + "} ON 1";	
            } else {
                query = "SELECT";
                if (versionDimensionName != null) {
                    query += " {[" +  versionDimensionName + "].[" + version + "]} * ";
                    nDim--; // TODO ASSUME THIS IS LAST
                }
                
                for (let  i=1; i<nDim-1; i++)
                    query += " " + rootElements(cubeDimensionNames[i]) + " * ";
                query += " " + rootElements(cubeDimensionNames[nDim-1]);
                query += " on 0,";
                query += " {" + rootElements(cubeDimensionNames[0]) + "} ON 1";		
            }
            
            query += " FROM [" + cubeName +"]";
            return query;
        }

        router.get('/pa/cube/:cubeName', function(req, res) {
            let cubeName = req.params.cubeName;
            let version = req.query.version;
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            console.log('GET /api/pa/cube/' + cubeName + ' called for workspace '+ workspace);

			// Manage the readVersion configuration (for SD)
            let query;
            if ('readVersion' in config.pa.mapping.input.cubes[cubeName] &&
                !config.pa.mapping.input.cubes[cubeName].readVersion)
                query = makeQuery(workspace, cubeName, null, null);
            else
                query = makeQuery(workspace, cubeName, config.pa.mapping.versionDimensionName, version);
            let content = {"MDX": query};                  

            //console.log('Query: ' + query);

            let options = {
                type: "POST",
                url: getURL(workspace) + '/api/v1/ExecuteMDX?$expand=Cells',
                body: content,
                json: true,
                headers: getHeaders(workspace)               
            }

            function quoteIfRequired(str) {
                if (str.includes(','))
                    return '"' + str + '"';
                return str;
            }
            //console.log('URL: ' + options.url);
        
            let request = require('request');

            request.post(options, function(error, response, body){
                if (!error && response.statusCode == 201) {
                    let object = body;

                    if (object != null) {
                        let ID = object["ID"];
                        let nCells = object["Cells"].length;
                        
                        let values = [];
                        for (let i=0; i<nCells; i++) {
                            let value= object["Cells"][i].Value;
                            values.push(value);
                        }
                        
                        doptions = {
                            type: "DELETE",
                            url: getURL(workspace) + "/api/v1/Cellsets('"+ID+"')",
                            headers: getHeaders(workspace)                           
                        }
                        request.delete(doptions, function(derror, dresponse, dbody){
                            console.log("Deleted query " + ID + " for cube " + cubeName);
                        });

                        let valueColumnName = 'value';                        
                        if ((cubeName in config.pa.mapping.input.cubes) &&
                            ('valueColumnName' in config.pa.mapping.input.cubes[cubeName])) {
                                valueColumnName = config.pa.mapping.input.cubes[cubeName].valueColumnName;
                            }

                        // Create CSV
                        let csv = "";
                        let cubeDimensionNames = getCubeDimensionNames(workspace, cubeName);
                        let nDimensions = cubeDimensionNames.length;
                        let dimensions = [];
                        let propertyDimensionName = config.pa.mapping.input.cubes[cubeName].propertyDimensionName;
                        let nPropertyDimension = -1;
                        let nProperties = 0;
                        let line = "";
                        for (let d in cubeDimensionNames) {		
                            let dimensionName = cubeDimensionNames[d];
                            if (dimensionName == config.pa.mapping.versionDimensionName) {
                                nDimensions--;
                                continue;
                            }
                            if (dimensionName == propertyDimensionName) {
                                nPropertyDimension = d;
                                let dimensionValues = getDimension(workspace, dimensionName, undefined, true);
                                nProperties = dimensionValues.length;
                                for (v in dimensionValues) {
                                    if (line != "")
                                        line += ',';
                                    line += dimensionValues[v].name;
                                }
                            } else {
                                if (dimensionName != 'dummy') {
                                    if (line != "")
                                        line += ',';                                
                                    line += dimensionName;
                                }
                            }
                            dimensions.push(getDimension(workspace, dimensionName, undefined, true));
                        }
                        if (nPropertyDimension < 0)
                            line += ","+valueColumnName;
                        csv += line +"\r\n";
                        let indexes = [];
                        for (let i=0; i<nDimensions; i++) {
                            indexes.push(0);
                        }
                        
                        line = "";
                        for (let v in values) {
                            let leaf = true; 
                                
                            do {
                                leaf = true;
                                for (let i=0; i<nDimensions; i++) {
                                    if (dimensions[i][indexes[i]].level != 0)
                                        leaf = false;				
                                }
                                if (leaf == false) {
                                    // NEXT
                                    for (let i=nDimensions-1; i>=0; i--) {
                                        if (indexes[i] < dimensions[i].length - 1) {
                                            indexes[i] = indexes[i]+1;
                                            break;
                                        } else
                                            indexes[i] = 0;					
                                    }
                                }
                            } while (leaf == false);
                            if (leaf) {	
                                // HACK?	
                                if (values[v] == null)
                                    values[v] = 0;
                                if (values[v] != null) {
                                    if (nPropertyDimension < 0) {
                                        for (i=0; i<nDimensions; i++) {
                                            if (cubeDimensionNames[i] == 'dummy')
                                                continue;
                                            if (line != "")
                                                line += ",";
                                            line += quoteIfRequired(dimensions[i][indexes[i]].name);
                                        }
                                        line += "," + values[v];
                                        csv += line+"\r\n";
                                        line = "";
                                    } else {
                                        // If first property write indexes
                                        if (indexes[nPropertyDimension] == 0) {
                                            for (i=0; i<nDimensions; i++) {
                                                if (i == nPropertyDimension)
                                                    continue;
                                                if (line != "")
                                                    line += ",";
                                                line += quoteIfRequired(dimensions[i][indexes[i]].name);
                                            }
                                        }
                                        // write property value
                                        line += "," + values[v];
                                        // If last property then end line
                                        if (indexes[nPropertyDimension] == nProperties -1) {
                                            csv += line+"\r\n";
                                            line = "";
                                        }
                                    }
                                }
                            }
                            // NEXT
                            for (let i=nDimensions-1; i>=0; i--) {
                                if (indexes[i] < dimensions[i].length - 1) {
                                    indexes[i] = indexes[i]+1;
                                    break;
                                } else
                                    indexes[i] = 0;					
                            }
                            
                        }
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.write(csv);
                        res.end();
                        
                    }
                    
                            
                } else
                    console.log("PA Server  error:" +error+ " response:" + JSON.stringify(response))
            
            });
        });
        
        function createCube(workspace, cubeName, cubeDimensionNames) {
            
            console.log('  Creating PA cube: ' + cubeName);

            initCache(workspace)

            let config = getConfig(workspace);
            if ('allcubes' in config.pa.cache)
                config.pa.cache.allcubes.push(cubeName);

            //cubeName = encodeURIComponent(cubeName);
            let content = {
                Name: cubeName,
                
            };
            let dimensions = []
            for (d in cubeDimensionNames) {
                dimensions.push("Dimensions('"+cubeDimensionNames[d]+"')");
            }
            content['Dimensions@odata.bind'] = dimensions;

            let options = {
                type: "POST",
                url: getURL(workspace) + '/api/v1/Cubes',
                json: content,
                headers: getHeaders(workspace)               
            }

            console.log('URL: ' + options.url);
            console.log(JSON.stringify(content));
        
            let srequest = require('sync-request');

            let res = srequest('POST', options.url, options);
            let object = JSON.parse(res.getBody())
    
            //return object;
        }
        
        router.put('/pa/cube/:cubeName', function(req, res) {
            let cubeName = req.params.cubeName;
            let version = req.query.version;
            let adddummy = req.query.adddummy;            
            if (adddummy == undefined)
                adddummy = false;
            else
                adddummy = (adddummy === 'true')
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);                
            console.log('PUT /api/pa/cube/' + cubeName + ' called');

            let valueColumnName = 'value';
            let useVersion = true;
            if ((cubeName in config.pa.mapping.input.cubes)) {
                if ('valueColumnName' in config.pa.mapping.input.cubes[cubeName]) {
                    valueColumnName = config.pa.mapping.input.cubes[cubeName].valueColumnName;
                }
                if ('readVersion' in config.pa.mapping.input.cubes[cubeName]) {
                    useVersion = config.pa.mapping.input.cubes[cubeName].readVersion;
                }
            }

            if ((cubeName in config.pa.mapping.output.cubes) &&
                ('valueColumnName' in config.pa.mapping.output.cubes[cubeName])) {
                    valueColumnName = config.pa.mapping.output.cubes[cubeName].valueColumnName;
                }
            

            let csv = req.body.csv;
            let lines = csv.split('\n');
            
            
            let dimensionNames = [];
            let rows = [];

            if ((cubeName in config.pa.mapping.input.cubes) &&
                ('propertyDimensionName' in config.pa.mapping.input.cubes[cubeName])) {
                let properties = [];
                let first = true;
                let cols = null;
                for (l in lines) {
                    let line = lines[l];
                    if (first) {
                        cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                        for (c in cols) {
                            let col = cols[c];
                            if (col[0] == "\"" && col[col.length-1] == "\"")
                                col = col.substring(1, col.length-1);
                            if (c == 0)
                                dimensionNames.push(col);
                            else 
                                properties.push(col);
                        }
                        first = false;
                    } else {
                        let vals = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                        for (v in vals) { 
                            if (v > 0) {
                                let row = {} 
                                let val = vals[0];
                                if (val[0] == "\"" && val[val.length-1] == "\"")
                                    val = val.substring(1, val.length-1);
                                row[cols[0]] = val;
                                let col = cols[v];
                                if (col[0] == "\"" && col[col.length-1] == "\"")
                                    col = col.substring(1, col.length-1);
                                row[config.pa.mapping.input.cubes[cubeName].propertyDimensionName] = col
                                val = vals[v];
                                if (val[0] == "\"" && val[val.length-1] == "\"")
                                    val = val.substring(1, val.length-1);                                
                                row[valueColumnName] = val;
                                if (adddummy)
                                    row['dummy'] = 'dummyvalue';                                
                                rows.push(row);
                            }
                        }
                    }
                }

                // Create property dimension
                if (!existsDimension(workspace, config.pa.mapping.input.cubes[cubeName].propertyDimensionName, true)) 
                    createDimension(workspace, config.pa.mapping.input.cubes[cubeName].propertyDimensionName, properties, config.pa.mapping.input.cubes[cubeName].propertyDimensionType)

                dimensionNames.push(config.pa.mapping.input.cubes[cubeName].propertyDimensionName);

            } else {
                let first = true;
                let cols = null;
                for (l in lines) {
                    let line = lines[l];
                    if (first) {
                        cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                        for (c in cols) {
                            let col = cols[c];
                            if (col != valueColumnName)
                                dimensionNames.push(col);
                        }
                        first = false;
                    } else {
                        let vals = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                        let row = {};
                        for (v in vals) 
                            row[cols[v]] = vals[v];
                        if (adddummy)
                            row['dummy'] = 'dummyvalue';
                        if (Object.keys(row).length == cols.length + (adddummy ? 1 : 0))
                            rows.push(row);
                    }
                }
            }

            for (d in dimensionNames) {
                let dimensionName = dimensionNames[d];
                if (!existsDimension(workspace, dimensionName, true)) {
                    let values = [];
                    for (r in rows)
                        if (values.indexOf(rows[r][dimensionName]) < 0)
                            values.push(rows[r][dimensionName]);
                    createDimension(workspace, dimensionName, values)
                }

            }

            if (adddummy) {
                if (!existsDimension(workspace, "dummy")) {
                    createDimension(workspace, "dummy", ["dummyvalue"]);
                }
                dimensionNames.push("dummy");
            }
            if (useVersion && config.pa.mapping.versionDimensionName != null) {
                dimensionNames.push(config.pa.mapping.versionDimensionName);
                if (!getDimension(workspace, config.pa.mapping.versionDimensionName, 0).includes(version)) {
                    // create version
                    addValueToDimension(workspace, config.pa.mapping.versionDimensionName, version);
                }
            }

            if (!existsCube(workspace, cubeName, true))
                createCube(workspace, cubeName, dimensionNames);

            let  query;
            if (useVersion) 
                query = makeQuery(workspace, cubeName, config.pa.mapping.versionDimensionName, version);
            else
                query = makeQuery(workspace, cubeName, null, null);
            let  content = {"MDX": query};                  

            //console.log('Query: ' + query);

            let options = {
                type: "POST",
                url: getURL(workspace) + '/api/v1/ExecuteMDX?$expand=Cells',
                body: content,
                json: true,
                headers: getHeaders(workspace)     
            }

            //console.log('URL: ' + options.url);

        
            let request = require('request');

            request.post(options, function(error, response, body){
                if (!error && response.statusCode == 201) {
                    let object = body;
                
                    if (object != null) {
                        let ID = object["ID"];
                        let nCells = object["Cells"].length;

                        let cubeDimensionNames = getCubeDimensionNames(workspace, cubeName);
                        let nDimensions= cubeDimensionNames.length;
                        if (useVersion && config.pa.mapping.versionDimensionName != null)
                            nDimensions--;
                        let dimensions = []
                        let sizes = []
                        for (let d in cubeDimensionNames) {
                            let allowCache = (cubeDimensionNames[d] != version)
                            dimensions[d] = getDimension(workspace, cubeDimensionNames[d], 0, allowCache);
                            sizes[d] = dimensions[d].length;
                        }
                        
                        let values = [];
                        for (r in rows) {
                            let row = rows[r];
                            let index = 0;
                            for (let i=0; i<nDimensions; i++) {
                                let idxElt = row[cubeDimensionNames[i]];
                                let thisIdx = dimensions[i].indexOf(idxElt, 0); 
                                for (let  j=i+1; j<nDimensions; j++)
                                    thisIdx *= sizes[j];
                                index += thisIdx;
                            }
                            //let cellValue = parseFloat(rows[r][valueColumnName]);
                            let cellValue = rows[r][valueColumnName];
                            let value = {
                                Ordinal: index,
                                Value: cellValue
                            }
                            // if (isNaN(cellValue)) {
                            //     value['FormattedValue'] = rows[r][valueColumnName];
                            //     value.Value = 0;
                            // }
                            values[index]=value;
        
                        }

                        // Add missing values (when not all are passed) (SD)
                        index =0
                        for (index=0; index<nCells; index++)
                            if (values[index] == undefined)
                                values[index] = {
                                    Ordinal: index,
                                    Value: 0
                                }
			
                        poptions = {
                            type: "PATCH",
                            url: getURL(workspace) + "/api/v1/Cellsets('"+ID+"')/Cells",
                            body: values,
                            json: true,
                            headers: getHeaders(workspace)                            
                        }
                        request.patch(poptions, function(perror, presponse, pbody){
                            console.log("Patched query " + ID + " for cube " + cubeName);                     

                            doptions = {
                                type: "DELETE",
                                url: getURL(workspace) + "/api/v1/Cellsets('"+ID+"')",
                                headers: getHeaders(workspace)                           
                            }
                            request.delete(doptions, function(derror, dresponse, dbody){
                                console.log("Deleted query " + ID + " for cube " + cubeName);
                            
                                res.json(dbody)          
                            });



                        });

                    }
                } else 
                    console.log("PA Server  error:" +error+ " response:" + JSON.stringify(response))
            });
        
        });

        function deleteCube(workspace, cubeName) {
            
            console.log('  Deleting PA cube: ' + cubeName);

            initCache(workspace)

            let config = getConfig(workspace);
                
            // String encCubeName = encode(cubeName);            
         
            let options = {
                type: "DELETE",
                url: getURL(workspace) + "/api/v1/Cubes('"+cubeName+"')",
                headers: getHeaders(workspace),
                json: {}        
            }
            let request = require('request');

            request.delete(options, function(error, response, body){
               
                if (error || response.statusCode >= 400) {
                    console.error('Error deleting cube '+cubeName);
                } else {

                    // Remove from cache
                    if ('allcubes' in config.pa.cache) {
                        var index = config.pa.cache.allcubes.indexOf(cubeName);
            
                        if (index > -1) {
                            config.pa.cache.allcubes.splice(index, 1);
                        }
                    }
                    if ('cubes' in config.pa.cache && cubeName in config.pa.cache.cubes) {
                        delete config.pa.cache.cubes[cubeName];
                    }
                }
            });

        }

        router.delete('/pa/cube/:cubeName', function(req, res) {
            let cubeName = req.params.cubeName;
            let workspace = getWorkspace(req);
          
            console.log('DELETE /api/pa/cube/' + cubeName + ' called form workspace '+workspace);

            if (existsCube(workspace, cubeName, true)) {
                deleteCube(workspace, cubeName);
                let config = getConfig(workspace);
                if (cubeName in config.pa.mapping.input.cubes &&
                    'propertyDimensionName' in config.pa.mapping.input.cubes[cubeName] &&
                    existsDimension(workspace, config.pa.mapping.input.cubes[cubeName].propertyDimensionName, true))
                    deleteDimension(workspace, config.pa.mapping.input.cubes[cubeName].propertyDimensionName)
            }

            res.status(200);
            res.end();
        });
    },

    routeWS: function (router, configws = undefined) {
        
        if (configws != undefined) {
            let config = getConfig();
            config.ws = configws;
            if (!('type' in config.ws))
                config.ws.type = 'local';
            if (!('apiurl' in config.ws))
                config.ws.apiurl = config.ws.url;
        }
            
        function lookupWSBearerToken(workspace) {
                
            let config = getConfig(workspace);

            if (!('type' in config.ws))
                config.ws.type = 'local';
            if (!('apiurl' in config.ws))
                config.ws.apiurl = config.ws.url;

            if (config.ws.type == 'local') {
                // Local
                let content = {
                    username: config.ws.login,
                    password: config.ws.password
                    
                };
                
                let options = {
                    type: "POST",
                    url: config.ws.apiurl + '/v1/preauth/signin',
                    json: content,
                            
                }

                console.log('URL: ' + options.url);
                console.log(JSON.stringify(content));
            
                let srequest = require('sync-request');

                let res = srequest('POST', options.url, options);
                let object = JSON.parse(res.getBody())

                let cookies = res.headers['set-cookie'];

                let cookieName = 'ibm-private-cloud-session';
                let bearerCode = null;
                for (c in cookies) {
                    let cookie = cookies[c]; 

                    let fields = cookie.split(";\\s*");
                    for (let j = 0; j < fields.length; j++) {				        	 
                        if (fields[j].indexOf('=') > 0) {
                            let f = fields[j].split("=");
                            console.log("CookieValue  : " + f[0] + " = " +f[1]);
                            if (cookieName == f[0]) {
                                bearerCode = f[1].split(";")[0];
                            }
                        } else {
                            console.log("CookieValue  : " + fields[j]);
                        }
                    }
                        

                }
                
                
                
                console.log("BearerToken = " + bearerCode);
        
                config.ws.bearerToken =   bearerCode;
                config.ws.bearerTokenTime = Date.now();
            } else {
                // Cloud

                const options = {
                    url: IAM_URL,
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
                    body: 'grant_type=urn:ibm:params:oauth:grant-type:apikey&response_type=cloud_iam&apikey='+config.ws.apikey
                  };

                let srequest = require('sync-request');

                let res = srequest('POST', options.url, options);
                let object = JSON.parse(res.getBody())

                //console.log(object);

                config.ws.bearerToken =   object.access_token;
                config.ws.bearerTokenTime = Date.now();
            }
    
      }

        function getWSBearerToken(workspace) {
            let config = getConfig(workspace);

            if ( !('bearerTokenTime' in config.ws) ||
                (config.ws.bearerToken == null) ||
                (config.ws.bearerTokenTime + 1000 * IAM_TIMEOUT < Date.now()) )
                lookupWSBearerToken(workspace);

            return config.ws.bearerToken;
        }
    
        router.get('/ws/projects', function(req, res) {
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);

            console.log('GET /api/ws/projects');

            if (config.ws.type == 'local') {
                // Local
                let options = {
                    type: "GET",
                    url: config.ws.apiurl + '/v3/projects',
                    headers: {
                        "Authorization": "Bearer " + getWSBearerToken(workspace)
                    },
                    secureProtocol : 'SSLv23_method'
                }

                let request = require('request');

                request.get(options, function (error, response, body){
                    if (!error ) {
                        res.json(body)                      
                    } else   
                        console.log("GET WS projects error:" +error+ " response:" + JSON.stringify(response))
                    });		

            } else {
                // Cloud
                let options = {
                    type: "GET",
                    url: config.ws.apiurl + '/v2/projects?limit=50',
                    headers: {
                        "Authorization": "Bearer " + getWSBearerToken(workspace)
                    },
                    secureProtocol : 'SSLv23_method'
                }

                let request = require('request');

                request.get(options, function (error, response, body){
                    if (!error ) {
                        let object = JSON.parse(body)
                        projects = object.resources;
                        if (!('cache' in config.ws))
                            config.ws.cache={}
                        config.ws.cache.projects={};
                        for (let p in projects) {
                            projects[p].name = projects[p].entity.name;
                            projects[p].guid = projects[p].metadata.guid;
                            config.ws.cache.projects[projects[p].name] = projects[p];
                        }
                        res.json(projects)                      
                    } else   
                        console.log("GET WS projects error:" +error+ " response:" + JSON.stringify(response))
                    });		
            }
        });

        router.put('/ws/project/:projectName', function(req, res) {
            let projectName = req.params.projectName;
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            console.log('PUT /api/ws/project/' + projectName + ' called');

            if ('type' in config.ws && config.ws.type == 'cloud') {
 
                // Cloud
                let project = { 
                    name: projectName, 
                    description: "PA-"+ projectName,
                    generator: "do-ws-js-Projects",
                    storage: config.ws.storage
                }
                let options = {
                    type: "POST",
                    url: config.ws.apiurl + '/transactional/v2/projects',
                    body: project,
                    json: true,
                    headers: {
                        "Authorization": "Bearer " + getWSBearerToken(workspace),
                        "X-UAA-Authorization": "Bearer " + getWSBearerToken(workspace)
                    },
                    secureProtocol : 'SSLv23_method'
                }

                let request = require('request');
    
                request.post(options, function (error, response, json){
                    if (error || response.statusCode >= 400) {
                        console.log("PUT WS project error:" +error+ " response:" + JSON.stringify(response))
                    } else {

                        if (!('cache' in config.ws))
                            config.ws.cache = {}
                        if (!('projects' in config.ws.cache))
                            config.ws.cache.projects = {}
                        let project = {
                            name: projectName,
                            guid: json.location.substr(json.location.lastIndexOf('/') + 1)
                        }

                        config. ws.cache.projects[projectName] = project
                        res.json({})
                    }
                });		

            } else {
                // Local
                let project = { 
                    name: projectName, 
                    description: "PA-"+ projectName
                }
                let options = {
                    type: "PUT",
                    url: config.ws.apiurl + '/v3/project',
                    body: project,
                    json: true,
                    headers: {
                        "Authorization": "Bearer " + getWSBearerToken(workspace)
                    },
                    secureProtocol : 'SSLv23_method'
                }
    
                let request = require('request');
    
                request.put(options, function (error, response, body){
                    if (error || response.statusCode >= 400) {
                        console.log("PUT WS project error:" +error+ " response:" + JSON.stringify(response))
                    } else {
                        res.json(body)
                    }
                });		
            }
            		
        });

        multer = require('multer');
        upload = multer({
            limits: { 
              fieldSize: 5 * 1024 * 1024 ,
              fileSize: 5 * 1024 * 1024 
            }
          })
        router.post('/ws/project/:projectName/dataset/:datasetName', upload.fields([]), (req, res) => {
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let projectName = req.params.projectName;
            let datasetName = req.params.datasetName;
            console.log('POST /api/ws/project/' + projectName+ '/dataset/' + datasetName + ' called');
    
            if (config.ws.type == 'local') {

                
                let boundary = "----WebKitFormBoundaryO3V5EPVGgT6NABIC"; //"===" + System.currentTimeMillis() + "===";
                let LINE_FEED = "\r\n";
                let content ='';

                {
                    content = content + "--" + boundary+ LINE_FEED;
                    content = content + "Content-Disposition: form-data; name=\"type\"" + LINE_FEED;
                    //writer.append("Content-Type: text/plain; charset=" +  StandardCharsets.UTF_8).append( LINE_FEED);
                    content = content + LINE_FEED;
                    content = content + "datasets" + LINE_FEED;

                }
                {
                    let  fieldName = "upfile";
                    let fileName = datasetName+".csv";

                    content = content + "--" + boundary + LINE_FEED;
                    content = content +
                            "Content-Disposition: form-data; name=\"" + fieldName
                            + "\"; filename=\"" + fileName + "\"" + LINE_FEED;
                    content = content +
                            "Content-Type: "
                                    //+ "application/vnd.ms-excel"
                                    + "text/plain" //URLConnection.guessContentTypeFromName(fileName)
                            + LINE_FEED;
                    //writer.append("Content-Transfer-Encoding: binary").append(LINE_FEED);
                    content = content + LINE_FEED;

                    content = content + req.body[fileName]; 



                }

                content = content + LINE_FEED;
                content = content + "--" + boundary + "--" + LINE_FEED;            

                let options = {
                        type: "POST",
                        url: config.ws.apiurl + '/v3/project/' + projectName + '/asset',
                        body: content,
                        headers: {
                            "Content-Type": "multipart/form-data; boundary=" + boundary,
                            "Authorization": "Bearer " + getWSBearerToken(workspace),
                            "Cookie": "__preloginurl__=/; ibm-private-cloud-session=" + getWSBearerToken(workspace),
                        },
                        secureProtocol : 'SSLv23_method',
                        
                    }

                let request = require('request');

                request.post(options, function (error, response, body){
                    if (!error ) {
                        res.json(body)                      
                    } else   
                        console.log("PUT WS dataset error:" +error+ " response:" + JSON.stringify(response))
                    });			

            } else {
                // Cloud
                let fileName = datasetName+".csv";

                let projectId = config.ws.cache.projects[projectName].guid;

                // CREATE ASSET
                let assetcfg = {
                    metadata: {
                        name: fileName, 
                        description: fileName,
                        asset_type: "data_asset",                     
                        origin_country: "us", 
                        asset_category: "USER"
                    }
                }

                
                options = {
                    type: "POST",
                    url: config.ws.apiurl + '/v2/assets/?project_id=' + projectId ,
                    json: assetcfg,
                    headers: {
                        Authorization: 'Bearer ' + getWSBearerToken(workspace)
                    }                
                }

                
                let srequest = require('sync-request');
                let sres = srequest('POST', options.url, options);

                if (sres.statusCode >= 400)
                    console.error('Error creating data asset: ' + sres.getBody().toString())
                let asset_id = JSON.parse(sres.getBody()).asset_id;
                if (!('assets' in config.ws.cache.projects[projectName]))
                    config.ws.cache.projects[projectName].assets ={}
                config.ws.cache.projects[projectName].assets[fileName] = {asset_id:asset_id}

                // CREATE ATTACHMENT
                assetcfg = {
                    asset_type: "data_asset",
                    mime: "text/csv",
                    name: fileName,
                    description: fileName,
                    data_partitions: 1,
                    private_url: false,
                    is_partitioned: false
                }
                options = {
                    type: "POST",
                    url: config.ws.apiurl + '/v2/assets/' + asset_id + '/attachments?project_id=' + projectId ,
                    json: assetcfg,
                    headers: {
                        Authorization: 'Bearer ' + getWSBearerToken(workspace)
                    }                
                }
                
                sres = srequest('POST', options.url, options);
                
                if (sres.statusCode >= 400)
                    console.error('Error creating data asset attachement: ' + sres.getBody().toString())

                let json = JSON.parse(sres.getBody());
                let attachment_id = json.attachment_id;
                let url1 = json.url1;

                // PUT CONTENT

                options = {
                    type: "PUT",
                    url : url1,
                    body : req.body[fileName],
                    headers: {
                        Authorization: 'Bearer ' + getWSBearerToken(workspace)
                    }
                }
                
                sres = srequest('PUT', options.url, options);

                if (sres.statusCode >= 400)
                    console.error('Error uploading data asset attachement content: ' + sres.getBody().toString())

                // MARK COMPLETE
                // /v2/assets/{asset_id}/attachments/{attachment_id}/complete

                options = {
                    type: "POST",
                    url: config.ws.apiurl + '/v2/assets/' + asset_id + '/attachments/' + attachment_id + '/complete?project_id=' + projectId ,
                    body: '',
                    headers: {
                        Authorization: 'Bearer ' + getWSBearerToken(workspace)
                    }                
                }

                sres = srequest('POST', options.url, options);

                if (sres.statusCode >= 400)
                    console.error('Error completing data asset attachement: ' + sres.getBody().toString())

                res.json({})                 
      
            }				
        });

        router.get('/ws/domodels', function(req, res) {
            console.log('GET /api/ws/domodels');
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let projectName = req.query.projectName;
            let projectId = req.query.projectId;
            if (projectId == undefined)
                projectId = projectName;

            let options = {
                type: "GET",
                url: config.ws.apiurl + '/v2/decisions?projectId=' + projectId,
                headers: {
                    "Authorization": "Bearer " + getWSBearerToken(workspace)
                },
                secureProtocol : 'SSLv23_method'
            }

            let request = require('request');

            request.get(options, function (error, response, body){
                if (!error ) {
                    res.json(body)                      
                } else   
                    console.log("GET WS projects error:" +error+ " response:" + JSON.stringify(response))
                });		
        });

        router.get('/ws/domodel', function(req, res) {
            console.log('GET /api/ws/domodel');
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let projectName = req.query.projectName;
            let projectId = req.query.projectId;
            if (projectId == undefined)
                projectId = projectName;  
            let modelName = req.query.modelName;

            let options = {
                type: "GET",
                url: config.ws.apiurl + '/v2/containers?projectId=' + projectId + '&parentId=' + modelName,
                headers: {
                    "Authorization": "Bearer " + getWSBearerToken(workspace)
                },
                secureProtocol : 'SSLv23_method'
            }

            let request = require('request');

            request.get(options, function (error, response, body){
                if (!error ) {
                    res.json(body)                      
                } else   
                    console.log("GET WS projects error:" +error+ " response:" + JSON.stringify(response))
                });		
        });

        router.get('/ws/domodel/tables', function(req, res) {
            console.log('GET /api/ws/domodel/tables');
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let projectName = req.query.projectName;
            let projectId = req.query.projectId;
            if (projectId == undefined)
                projectId = projectName;  
            let modelName = req.query.modelName;
            let scenarioName = req.query.scenarioName;

            let options = {
                type: "GET",
                url: config.ws.apiurl + '/v2/containers/' + scenarioName + '/tables?projectId=' + projectId + '&parentId=' + modelName,
                headers: {
                    "Authorization": "Bearer " + getWSBearerToken(workspace)
                },
                secureProtocol : 'SSLv23_method'
            }

            let request = require('request');

            request.get(options, function (error, response, body){
                if (!error ) {
                    res.json(body)                      
                } else   
                    console.log("GET WS projects error:" +error+ " response:" + JSON.stringify(response))
                });		
        });

         router.get('/ws/domodel/table', function(req, res) {
            console.log('GET /api/ws/domodel/table');
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let projectName = req.query.projectName;
            let projectId = req.query.projectId;
            if (projectId == undefined)
                projectId = projectName;  
            let modelName = req.query.modelName;
            let scenarioName = req.query.scenarioName;
            let tableName = req.query.tableName;

            let options = {
                type: "GET",
                url: config.ws.apiurl + '/v2/containers/' + scenarioName + '/tables/' + tableName + '/data?projectId=' + projectId + '&parentId=' + modelName,
                headers: {
                    "Authorization": "Bearer " + getWSBearerToken(workspace)
                },
                secureProtocol : 'SSLv23_method'
            }

            let request = require('request');

            request.get(options, function (error, response, body){
                if (!error ) {
                    res.json(body)                      
                } else   
                    console.log("GET WS projects error:" +error+ " response:" + JSON.stringify(response))
                });		
        });

        router.get('/ws/domodel/table', function(req, res) {
            console.log('GET /api/ws/domodel/table');
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let projectName = req.query.projectName;
            let projectId = req.query.projectId;
            if (projectId == undefined)
                projectId = projectName;  
            let modelName = req.query.modelName;
            let scenarioName = req.query.scenarioName;
            let tableName = req.query.tableName;

            let options = {
                type: "GET",
                url: config.ws.apiurl + '/v2/containers/' + scenarioName + '/tables/' + tableName + '/data?projectId=' + projectId  + '&parentId=' + modelName,
                headers: {
                    "Authorization": "Bearer " + getWSBearerToken(workspace)
                },
                secureProtocol : 'SSLv23_method'
            }

            let request = require('request');

            request.get(options, function (error, response, body){
                if (!error ) {
                    res.json(body)                      
                } else   
                    console.log("GET WS projects error:" +error+ " response:" + JSON.stringify(response))
                });		
        });


        router.get('/ws/domodel/assets', function(req, res) {
            console.log('GET /api/ws/domodel/assets');
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let projectName = req.query.projectName;
            let projectId = req.query.projectId;
            if (projectId == undefined)
                projectId = projectName;  
            let modelName = req.query.modelName;
            let scenarioName = req.query.scenarioName;

            let options = {
                type: "GET",
                url: config.ws.apiurl + '/v2/containers/' + scenarioName + '/assets?projectId=' + projectId + '&parentId=' + modelName,
                headers: {
                    "Authorization": "Bearer " + getWSBearerToken(workspace)
                },
                secureProtocol : 'SSLv23_method'
            }

            let request = require('request');

            request.get(options, function (error, response, body){
                if (!error ) {
                    res.json(body)                      
                } else   
                    console.log("GET WS projects error:" +error+ " response:" + JSON.stringify(response))
                });		
        });
            
        router.get('/ws/domodel/data', function(req, res) {
            console.log('GET /api/ws/domodel/data');
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let projectName = req.query.projectName;
            let projectId = req.query.projectId;
            if (projectId == undefined)
                projectId = projectName;              
            let modelName = req.query.modelName;
            let scenarioName = req.query.scenarioName;
            let assetName = req.query.assetName;


            let url = config.ws.apiurl + '/v2/containers/' + scenarioName;
            if (assetName != undefined)
                url = url + '/assets/' + assetName + '/data/';
            url = url + '?projectId=' + projectId + '&parentId=' + modelName;


            let options = {
                type: "GET",
                url: url,
                headers: {
                    "Authorization": "Bearer " + getWSBearerToken(workspace)
                },
                secureProtocol : 'SSLv23_method'
            }

            let request = require('request');

            request.get(options, function (error, response, body){
                if (!error ) {
                    res.json(body)                      
                } else   
                    console.log("GET WS projects error:" +error+ " response:" + JSON.stringify(response))
                });		
        });
    }
}