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
            let filePath = './config/'+workspace+'/'+fileName;
            let contents = fs.readFileSync(filePath, 'utf8');
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write(contents);
            res.end();
        });

        router.put('/config', function(req, res) {            

            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let newconfig = req.body;

            copyHiddenStuff(config, newconfig)

            if (req.query.dosave == "true") {
                var fs = require('fs');
                let CONFIG_FILE_NAME = "config.json";
                let dir = './config/'+workspace;
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

            let dir = "./config";
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

				var srequest = require('sync-request');

				let res = srequest('POST', options.url, options);
				try {
					console.log(res.getBody());
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

				var srequest = require('sync-request');

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


        function getDimensions(workspace) {
            let options = {
                headers: getHeaders(workspace),
                url: getURL(workspace) + '/api/v1/Dimensions'
            };
          

            var srequest = require('sync-request');

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
                
            return dimensionNames;					
                   
        }
        router.get('/pa/dimensions', function(req, res) {
            console.log('GET /api/pa/dimensions called');
            let workspace = getWorkspace(req);
            res.json(getDimensions(workspace));
        });

        
        function existsDimension(workspace, dimensionName) {            
            return getDimensions(workspace).includes(dimensionName);                    
        }
    
        function getDimension(workspace, dimensionName, onlyLevel = undefined) {
            dimensionName = encodeURIComponent(dimensionName);

            let options = {
                headers: getHeaders(workspace),
                url: getURL(workspace) + "/api/v1/Dimensions('"+dimensionName+"')/Hierarchies('"+dimensionName+"')/Elements?$expand=Parents"
            };

            var srequest = require('sync-request');

            let res = srequest('GET', options.url, options);
            let object = JSON.parse(res.getBody())


            let nElements = object.value.length;				
            
            let dimension = [];

            for (let i=0; i<nElements; i++) {
                let name = object.value[i].Name;
                let level = object.value[i].Level;

                if (onlyLevel != undefined) {
                    if (onlyLevel!=level)
                        continue;
                    dimension.push(name);
                } else {
                    let parents = []
                    for (o in  object.value[i].Parents) {
                        let parent = object.value[i].Parents[o].Name;
                        parents.push(parent);
                    }
                    dimension.push({name:name, level:level, parents:parents})   
                }
            }                

            return dimension;					
                      
        }

        router.get('/pa/dimension/:dimensionName', function(req, res) {
            let dimensionName = req.params.dimensionName;
            let onlyLevel  = req.query.onlyLevel;
            let workspace = getWorkspace(req);
            res.json(getDimension(workspace, dimensionName, onlyLevel));
            
        });

        
        function addValueToDimension(workspace, dimensionName, value, level = 0, element_type = undefined) {
            dimensionName = encodeURIComponent(dimensionName);
            hierarchyName = dimensionName;
            
            let content = {
                "Name": value,
                "Level": level
            }
            if (level>0) {
                content["Type"] = "Consolidated";
            } 
    //		else if (element_type != null)
    //			content.put("Type", element_type);                    
            
            let options = {
                type: "POST",
                url: getURL(workspace) + "/api/v1/Dimensions('"+dimensionName+"')/Hierarchies('"+hierarchyName+"')/Elements",
                json: content,
                headers: getHeaders(workspace)
            }


            var srequest = require('sync-request');

            let res = srequest('POST', options.url, options);
            let object = JSON.parse(res.getBody())
        }

        function createDimension(workspace, dimensionName, values = undefined, dimension_type = undefined)  {

            dimensionName = encodeURIComponent(dimensionName);

            let content = {
                "Name":  dimensionName,
                "UniqueName": "["+dimensionName+"]"
            }

    //		if (dimension_type!=null)
    //			content.put("Type", dimension_type);
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


            var srequest = require('sync-request');

            let res = srequest('POST', options.url, options);
            let object = JSON.parse(res.getBody())


            // create Hierarchy
            let hierarchyName = dimensionName;
            content = {
                "Name": hierarchyName,
                "UniqueName": "["+hierarchyName+"]"
            }
            att = {
                "Caption": hierarchyName
            }

            content["Attributes"] = att;

            options = {
                type: "POST",
                url: getURL(workspace) + "/api/v1/Dimensions('"+hierarchyName+"')/Hierarchies",
                json: content,
                headers: getHeaders(workspace)                
            }
            

            res = srequest('POST', options.url, options);
            object = JSON.parse(res.getBody())

            // Add values
            if (values != undefined) {
                for (v in values) {
                    let value = values[v];
                    addValueToDimension(workspace, dimensionName, value);
                }
            }
        }


    
        function getCubes(workspace) {
            
            let options = {
                headers: getHeaders(workspace),
                url: getURL(workspace) + '/api/v1/Cubes'
            };    

            var srequest = require('sync-request');

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
                
            return cubeNames;					
                            
        }

        router.get('/pa/cubes', function(req, res) {
            console.log('GET /api/pa/cubes called');
            let workspace = getWorkspace(req);
            res.json(getCubes(workspace));					
                            
        });

        function existsCube(workspace, cubeName) {            
            return getCubes(workspace).includes(cubeName);                    
        }

        function _getCubeDimensionNames(cubeName) {
            cubeName = encodeURIComponent(cubeName);

            let options = {
                headers: getHeaders(),
                url: getURL() + '/api/v1/Cubes(\''+cubeName+'\')/Dimensions'
            };
        
                  

                var request = require('request');

                request.get(options, function(error, response, body){
                    if (!error && response.statusCode == 200) {
                        let obj = JSON.parse(body);
    
                        let nDimensions = obj.value.length;
            
                        let dimensionNames = [];
    
                        for (let i=0; i<nDimensions; i++) {
                            let dimensionName = obj.value[i].Name;
                            if (dimensionName.startsWith('}'))
                                continue;
                            dimensionNames.push(dimensionName)
                        }	
                
                        return dimensionNames;				
                                
                    } else
                        console.log("PA Server  error:" +error+ " response:" + JSON.stringify(response))
                    });
        }

        function getCubeDimensionNames(workspace, cubeName) {
            cubeName = encodeURIComponent(cubeName);

            let options = {
                headers: getHeaders(workspace),
                url: getURL(workspace) + '/api/v1/Cubes(\''+cubeName+'\')/Dimensions'
            };
        
            var srequest = require('sync-request');

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
    
            return dimensionNames;
                
        }

        router.get('/pa/cube/:cubeName/dimensions', function(req, res) {
            let cubeName = req.params.cubeName;
            console.log('GET /api/pa/cube/' + cubeName + '/dimensions called');
            let workspace = getWorkspace(req);
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
            console.log('GET /api/pa/cube/' + cubeName + ' called');
            
			// Manage the readVersion configuration (for SD)
            let query;
            if ('readVersion' in config.mapping.input.cubes[cubeName] &&
                !config.mapping.input.cubes[cubeName].readVersion)
                query = makeQuery(workspace, cubeName, null, null);
            else
                query = makeQuery(workspace, cubeName, config.mapping.versionDimensionName, version);
            let content = {"MDX": query};                  

            console.log('Query: ' + query);

            let options = {
                type: "POST",
                url: getURL(workspace) + '/api/v1/ExecuteMDX?$expand=Cells',
                body: content,
                json: true,
                headers: getHeaders(workspace)               
            }

            console.log('URL: ' + options.url);

        
            var request = require('request');

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

                        
                    
                        //res.json(values);

                        // Create CSV
                        let csv = "";
                        let cubeDimensionNames = getCubeDimensionNames(workspace, cubeName);
                        let nDimensions = cubeDimensionNames.length;
                        let dimensions = [];
                        let propertyDimensionName = config.mapping.input.cubes[cubeName].propertyDimensionName;
                        let nPropertyDimension = -1;
                        let nProperties = 0;
                        let line = "";
                        for (let d in cubeDimensionNames) {		
                            let dimensionName = cubeDimensionNames[d];
                            if (dimensionName == config.mapping.versionDimensionName) {
                                nDimensions--;
                                continue;
                            }
                            if (dimensionName == propertyDimensionName) {
                                nPropertyDimension = d;
                                let dimensionValues = getDimension(workspace, dimensionName);
                                nProperties = dimensionValues.length;
                                for (v in dimensionValues) {
                                    if (line != "")
                                        line += ',';
                                    line += dimensionValues[v].name;
                                }
                            } else {
                                if (line != "")
                                    line += ',';
                                line += dimensionName;
                            }
                            dimensions.push(getDimension(workspace, dimensionName));
                        }
                        if (nPropertyDimension < 0)
                            line += ",value";
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
                                            if (line != "")
                                                line += ",";
                                            line += dimensions[i][indexes[i]].name;
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
                                                line += dimensions[i][indexes[i]].name;
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
            cubeName = encodeURIComponent(cubeName);
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
        
            var srequest = require('sync-request');

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

            let csv = req.body.csv;
            let lines = csv.split('\n');
            
            
            let first = true;
            let dimensionNames = [];
            let cols = null;
            let rows = [];
            for (l in lines) {
                let line = lines[l];
                if (first) {
                    cols = line.split(',');
                    for (c in cols) {
                        let col = cols[c];
                        if (col != "value")
                            dimensionNames.push(col);
                    }
                    first = false;
                } else {
                    let vals = line.split(',');
                    let row = {};
                    for (v in vals) 
                        row[cols[v]] = vals[v];
                    if (adddummy)
                        row['dummy'] = 'dummyvalue';
                    if (Object.keys(row).length == cols.length + (adddummy ? 1 : 0))
                        rows.push(row);
                }
            }

            for (d in dimensionNames) {
                let dimensionName = dimensionNames[d];
                if (!existsDimension(workspace, dimensionName)) {
                    let values = [];
                    for (r in rows)
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
            if (config.mapping.versionDimensionName != null) {
                dimensionNames.push(config.mapping.versionDimensionName);
                if (!getDimension(workspace, config.mapping.versionDimensionName, 0).includes(version)) {
                    // create version
                    addValueToDimension(workspace, config.mapping.versionDimensionName, version);
                }
            }

            if (!existsCube(workspace, cubeName))
                createCube(workspace, cubeName, dimensionNames);

            let  query = makeQuery(workspace, cubeName, config.mapping.versionDimensionName, version);
            let  content = {"MDX": query};                  

            console.log('Query: ' + query);

            let options = {
                type: "POST",
                url: getURL(workspace) + '/api/v1/ExecuteMDX?$expand=Cells',
                body: content,
                json: true,
                headers: getHeaders(workspace)     
            }

            console.log('URL: ' + options.url);

        
            var request = require('request');

            request.post(options, function(error, response, body){
                if (!error && response.statusCode == 201) {
                    let object = body;
				
                    if (object != null) {
                        let ID = object["ID"];
                        let nCells = object["Cells"].length;

                        let cubeDimensionNames = getCubeDimensionNames(workspace, cubeName);
                        let nDimensions= cubeDimensionNames.length;
                        if (config.mapping.versionDimensionName != null)
                            nDimensions--;
                        let dimensions = []
                        let sizes = []
                        for (let d in cubeDimensionNames) {
                            dimensions[d] = getDimension(workspace, cubeDimensionNames[d], 0);
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
                            let value = {
                                Ordinal: index,
                                Value: parseFloat(rows[r].value)
                            }
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
    },

    routeDSX: function (router, configdsx = undefined) {
        
        if (configdsx != undefined) {
            let config = getConfig();
            config.dsx = configdsx;
            if (!('type' in config.dsx))
                config.dsx.type = 'local';
            if (!('apiurl' in config.dsx))
                config.dsx.apiurl = config.dsx.url;
        }
            
        function lookupBearerToken(workspace) {
                
            let config = getConfig(workspace);

            if (!('type' in config.dsx))
                config.dsx.type = 'local';
            if (!('apiurl' in config.dsx))
                config.dsx.apiurl = config.dsx.url;

            if (config.dsx.type == 'local') {
                // Local
                let content = {
                    username: config.dsx.login,
                    password: config.dsx.password
                    
                };
                
                let options = {
                    type: "POST",
                    url: config.dsx.apiurl + '/v1/preauth/signin',
                    json: content,
                            
                }

                console.log('URL: ' + options.url);
                console.log(JSON.stringify(content));
            
                var srequest = require('sync-request');

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
        
                config.dsx.bearerToken =   bearerCode;
                config.dsx.bearerTokenTime = Date.now();
            } else {
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
                    body: 'grant_type=urn:ibm:params:oauth:grant-type:apikey&response_type=cloud_iam&apikey='+config.dsx.apikey
                  };

                var srequest = require('sync-request');

                let res = srequest('POST', options.url, options);
                let object = JSON.parse(res.getBody())

                //console.log(object);

                config.dsx.bearerToken =   object.access_token;
                config.dsx.bearerTokenTime = Date.now();
            }
    
      }

        function getBearerToken(workspace) {
            let config = getConfig(workspace);

            if ( !('bearerTokenTime' in config.dsx) ||
                (config.dsx.bearerToken == null) ||
                (config.dsx.bearerTokenTime + 1000*60 < Date.now()) )
                lookupBearerToken(workspace);

            return config.dsx.bearerToken;
        }
    
        router.get('/dsx/projects', function(req, res) {
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);

            console.log('GET /api/dsx/projects');

            if (config.dsx.type == 'local') {
                // Local
                let options = {
                    type: "GET",
                    url: config.dsx.apiurl + '/v3/projects',
                    headers: {
                        "Authorization": "Bearer " + getBearerToken(workspace)
                    },
                    secureProtocol : 'SSLv23_method'
                }

                var request = require('request');

                request.get(options, function (error, response, body){
                    if (!error ) {
                        res.json(body)                      
                    } else   
                        console.log("GET DSX projects error:" +error+ " response:" + JSON.stringify(response))
                    });		

                } else {
                    // Cloud
                    let options = {
                        type: "GET",
                        url: config.dsx.apiurl + '/v2/projects?limit=50',
                        headers: {
                            "Authorization": "Bearer " + getBearerToken(workspace)
                        },
                        secureProtocol : 'SSLv23_method'
                    }
    
                    var request = require('request');
    
                    request.get(options, function (error, response, body){
                        if (!error ) {
                            let object = JSON.parse(body)
                            projects = object.resources;
                            for (let p in projects) {
                                projects[p].name = projects[p].entity.name;
                                projects[p].guid = projects[p].metadata.guid;
                            }
                            res.json(projects)                      
                        } else   
                            console.log("GET DSX projects error:" +error+ " response:" + JSON.stringify(response))
                        });		
                }
        });

        router.put('/dsx/project/:projectName', function(req, res) {
            let projectName = req.params.projectName;
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            console.log('PUT /api/dsx/project/' + projectName + ' called');

            let project = { 
                name: projectName, 
                description: "PA-"+ projectName
            }
            let options = {
                type: "PUT",
                url: config.dsx.apiurl + '/v3/project',
                body: project,
                json: true,
                headers: {
                    "Authorization": "Bearer " + getBearerToken(workspace)
                },
                secureProtocol : 'SSLv23_method'
            }

            var request = require('request');

            request.put(options, function (error, response, body){
                if (!error ) {
                    res.json(body)                      
                } else   
                    console.log("PUT DSX project error:" +error+ " response:" + JSON.stringify(response))
                });				
        });

        multer = require('multer');
        upload = multer({
            limits: { 
              fieldSize: 5 * 1024 * 1024 ,
              fileSize: 5 * 1024 * 1024 
            }
          })
        router.post('/dsx/project/:projectName/dataset/:datasetName', upload.fields([]), (req, res) => {
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            if (config.dsx.type == 'local') {
                let projectName = req.params.projectName;
                let datasetName = req.params.datasetName;
                console.log('POST /api/dsx/project/' + projectName+ '/dataset/' + datasetName + ' called');

                
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
                        url: config.dsx.apiurl + '/v3/project/' + projectName + '/asset',
                        body: content,
                        headers: {
                            "Content-Type": "multipart/form-data; boundary=" + boundary,
                            "Authorization": "Bearer " + getBearerToken(workspace),
                            "Cookie": "__preloginurl__=/; ibm-private-cloud-session=" + getBearerToken(workspace),
                        },
                        secureProtocol : 'SSLv23_method',
                        
                    }

                var request = require('request');

                request.post(options, function (error, response, body){
                    if (!error ) {
                        res.json(body)                      
                    } else   
                        console.log("PUT DSX dataset error:" +error+ " response:" + JSON.stringify(response))
                    });			

            } else {
                // Cloud
                let projectName = req.params.projectName;
                let datasetName = req.params.datasetName;
                let fileName = datasetName+".csv";

                let options = {
                    type: "PUT",
                    url: config.dsx.cosurl + '/' + config.dsx.cosbucket + '/' + datasetName,
                    body: req.body[fileName],
                    headers: {
                        Authorization: 'Bearer ' + getBearerToken(workspace)
                    }                
                }

                var srequest = require('sync-request');

                let sres = srequest('PUT', options.url, options);

                //assert sres.statusCode == 200
                //console.log(res.getBody());
                
                let assetcfg = {
                    assetType: "data_asset", 
                    name: fileName, 
                    origin_country: "us", 
                    mime: "text/csv"
                }
                options = {
                    type: "POST",
                    url: config.dsx.apiurl + '/api/catalogs/' + config.dsx.projectId + '/data-asset',
                    json: assetcfg,
                    headers: {
                        Authorization: 'Bearer ' + getBearerToken(workspace),
                        'Content-Type': 'application/json'
                    }                
                }

                sres = srequest('POST', options.url, options);

                res.json(sres.getBody())                 
                // projectid
                // https://dataplatform.cloud.ibm.com/api/catalogs/608dcbe5-9271-48cb-8802-d5bcabac1dca/data-asset
                // Request Method: POST

                // content type json
                // {assetType: "data_asset", name: "test.csv", origin_country: "us", mime: "text/csv"}
            }				
        });

        router.get('/dsx/domodels', function(req, res) {
            console.log('GET /api/dsx/domodels');
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let projectName = req.query.projectName;
            let projectId = req.query.projectId;
            if (projectId == undefined)
                projectId = projectName;

            let options = {
                type: "GET",
                url: config.dsx.apiurl + '/v2/decisions?projectId=' + projectId,
                headers: {
                    "Authorization": "Bearer " + getBearerToken(workspace)
                },
                secureProtocol : 'SSLv23_method'
            }

            var request = require('request');

            request.get(options, function (error, response, body){
                if (!error ) {
                    res.json(body)                      
                } else   
                    console.log("GET DSX projects error:" +error+ " response:" + JSON.stringify(response))
                });		
        });

        router.get('/dsx/domodel', function(req, res) {
            console.log('GET /api/dsx/domodel');
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let projectName = req.query.projectName;
            let projectId = req.query.projectId;
            if (projectId == undefined)
                projectId = projectName;  
            let modelName = req.query.modelName;

            let options = {
                type: "GET",
                url: config.dsx.apiurl + '/v2/containers?projectId=' + projectId + '&parentId=' + modelName,
                headers: {
                    "Authorization": "Bearer " + getBearerToken(workspace)
                },
                secureProtocol : 'SSLv23_method'
            }

            var request = require('request');

            request.get(options, function (error, response, body){
                if (!error ) {
                    res.json(body)                      
                } else   
                    console.log("GET DSX projects error:" +error+ " response:" + JSON.stringify(response))
                });		
        });

        router.get('/dsx/domodel/tables', function(req, res) {
            console.log('GET /api/dsx/domodel/tables');
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
                url: config.dsx.apiurl + '/v2/containers/' + scenarioName + '/tables?projectId=' + projectId + '&parentId=' + modelName,
                headers: {
                    "Authorization": "Bearer " + getBearerToken(workspace)
                },
                secureProtocol : 'SSLv23_method'
            }

            var request = require('request');

            request.get(options, function (error, response, body){
                if (!error ) {
                    res.json(body)                      
                } else   
                    console.log("GET DSX projects error:" +error+ " response:" + JSON.stringify(response))
                });		
        });

         router.get('/dsx/domodel/table', function(req, res) {
            console.log('GET /api/dsx/domodel/table');
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
                url: config.dsx.apiurl + '/v2/containers/' + scenarioName + '/tables/' + tableName + '/data?projectId=' + projectId + '&parentId=' + modelName,
                headers: {
                    "Authorization": "Bearer " + getBearerToken(workspace)
                },
                secureProtocol : 'SSLv23_method'
            }

            var request = require('request');

            request.get(options, function (error, response, body){
                if (!error ) {
                    res.json(body)                      
                } else   
                    console.log("GET DSX projects error:" +error+ " response:" + JSON.stringify(response))
                });		
        });

        router.get('/dsx/domodel/table', function(req, res) {
            console.log('GET /api/dsx/domodel/table');
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
                url: config.dsx.apiurl + '/v2/containers/' + scenarioName + '/tables/' + tableName + '/data?projectId=' + projectId  + '&parentId=' + modelName,
                headers: {
                    "Authorization": "Bearer " + getBearerToken(workspace)
                },
                secureProtocol : 'SSLv23_method'
            }

            var request = require('request');

            request.get(options, function (error, response, body){
                if (!error ) {
                    res.json(body)                      
                } else   
                    console.log("GET DSX projects error:" +error+ " response:" + JSON.stringify(response))
                });		
        });


        router.get('/dsx/domodel/assets', function(req, res) {
            console.log('GET /api/dsx/domodel/assets');
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
                url: config.dsx.apiurl + '/v2/containers/' + scenarioName + '/assets?projectId=' + projectId + '&parentId=' + modelName,
                headers: {
                    "Authorization": "Bearer " + getBearerToken(workspace)
                },
                secureProtocol : 'SSLv23_method'
            }

            var request = require('request');

            request.get(options, function (error, response, body){
                if (!error ) {
                    res.json(body)                      
                } else   
                    console.log("GET DSX projects error:" +error+ " response:" + JSON.stringify(response))
                });		
        });
            
        router.get('/dsx/domodel/data', function(req, res) {
            console.log('GET /api/dsx/domodel/data');
            let workspace = getWorkspace(req);
            let config = getConfig(workspace);
            let projectName = req.query.projectName;
            let projectId = req.query.projectId;
            if (projectId == undefined)
                projectId = projectName;              
            let modelName = req.query.modelName;
            let scenarioName = req.query.scenarioName;
            let assetName = req.query.assetName;


            let url = config.dsx.apiurl + '/v2/containers/' + scenarioName;
            if (assetName != undefined)
                url = url + '/assets/' + assetName + '/data/';
            url = url + '?projectId=' + projectId + '&parentId=' + modelName;


            let options = {
                type: "GET",
                url: url,
                headers: {
                    "Authorization": "Bearer " + getBearerToken(workspace)
                },
                secureProtocol : 'SSLv23_method'
            }

            var request = require('request');

            request.get(options, function (error, response, body){
                if (!error ) {
                    res.json(body)                      
                } else   
                    console.log("GET DSX projects error:" +error+ " response:" + JSON.stringify(response))
                });		
        });
    }
}