var config = null;
    
module.exports = {
        
    routeConfig: function (router, _config) {

        config = _config;

        router.get('/config', function(req, res) {

            let scenario = req.params.scenario;
            console.log('GET /api/pa/config called');
            res.json(config);
        });

        router.put('/config', function(req, res) {
            
            // TODO  BASICALLY CAN ONLY CHANGE MAPPING FOR NOW

            config.mapping = req.body.mapping;

            res.json({"changeConfig":"ok"});
        });
    },

    routePA: function (router, paconfig) {
        
        function getPAToken() {

            let options = {
                type: "POST",
                url: paconfig.authurl,
                body: "grant_type=client_credentials&scope=v0userContext",
                headers: {
                    authorization: 'Basic ' + new Buffer(paconfig.username + ':' + paconfig.password, 'ascii').toString('base64'),
                    accountId:paconfig.accountId,
                    tenantId:paconfig.tenantId,
                    userId:paconfig.userId,
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
                paconfig = config.pa;

                // options = {
                //     headers: {
                //         "Authorization": "Bearer " + access_token,
                //         accountId:paconfig.accountId,
                //         tenantId:paconfig.tenantId,
                //         userId:paconfig.userId,
                //         },
                //     // url: config.pa.url + '/api/v1/Cubes'
                //     //url: "https://ibmtraining.planning-analytics.ibmcloud.com/api/v0/tm1/Servers"
                //     url: paconfig.url + '/api/v1/Cubes'
                // };    
    
                // console.log(options);

                // var srequest = require('sync-request');
    
                // res = srequest('GET', options.url, options);
                // object = JSON.parse(res.getBody())
                // console.log(object);
    
            } catch (err) {
                console.log(err);
            }
        }

        router.get('/pa/token', function(req, res) {
            getPAToken();
            res.json({"PA Token":"ok"});
        });

        function getDimensions() {
            let options = {
                headers: {
                    Authorization: "Bearer " + paconfig.access_token,
                    accountId:paconfig.accountId,
                    tenantId:paconfig.tenantId,
                    userId:paconfig.userId
                },
                url: paconfig.url + '/api/v1/Dimensions'
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

            res.json(getDimensions());
        });

        
        function existsDimension(dimensionName) {            
            return getDimensions().includes(dimensionName);                    
        }
    
        function getDimension(dimensionName, onlyLevel = undefined) {
            dimensionName = encodeURIComponent(dimensionName);

            let options = {
                headers: {
                    Authorization: "Bearer " + paconfig.access_token,
                    accountId:paconfig.accountId,
                    tenantId:paconfig.tenantId,
                    userId:paconfig.userId
                },
                url: paconfig.url + "/api/v1/Dimensions('"+dimensionName+"')/Hierarchies('"+dimensionName+"')/Elements?$expand=Parents"
            };

            var srequest = require('sync-request');

            let res = srequest('GET', options.url, options);
            let object = JSON.parse(res.getBody())


            let nElements = object.value.length;				
            
            let dimension = [];

            for (let i=0; i<nElements; i++) {
                let name = object.value[i].Name;
                let level = object.value[i].Level;
                //console.log("Value: "+name+" Level: "+level);

                if (onlyLevel != undefined) {
                    if (onlyLevel!=level)
                        continue;
                    dimension.push(name);
                } else {
                    let parents = []
                    for (o in  object.value[i].Parents) {
                        let parent = object.value[i].Parents[o].Name;
                        parents.push(parent);
                        //console.log("Value: "+name+" Parent: "+parents);
                    }
                    dimension.push({name:name, level:level, parents:parents})   
                }
            }                

            return dimension;					
                      
        }

        router.get('/pa/dimension/:dimensionName', function(req, res) {
            let dimensionName = req.params.dimensionName;
            let onlyLevel  = req.query.onlyLevel;
            res.json(getDimension(dimensionName, onlyLevel));
            
        });

        
        function addValueToDimension(dimensionName, value, level = 0, element_type = undefined) {
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
                url: paconfig.url + "/api/v1/Dimensions('"+dimensionName+"')/Hierarchies('"+hierarchyName+"')/Elements",
                json: content,
                headers: {
                    Authorization: "Bearer " + paconfig.access_token,
                    accountId:paconfig.accountId,
                    tenantId:paconfig.tenantId,
                    userId:paconfig.userId
                }                
            }


            var srequest = require('sync-request');

            let res = srequest('POST', options.url, options);
            let object = JSON.parse(res.getBody())
        }

        function createDimension(dimensionName, values = undefined, dimension_type = undefined)  {

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
                url: paconfig.url + '/api/v1/Dimensions',
                json: content,
                headers: {
                    Authorization: "Bearer " + paconfig.access_token,
                    accountId:paconfig.accountId,
                    tenantId:paconfig.tenantId,
                    userId:paconfig.userId
                }                
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
                url: paconfig.url + "/api/v1/Dimensions('"+hierarchyName+"')/Hierarchies",
                json: content,
                headers: {
                    Authorization: "Bearer " + paconfig.access_token,
                    accountId:paconfig.accountId,
                    tenantId:paconfig.tenantId,
                    userId:paconfig.userId
                }                
            }
            

            res = srequest('POST', options.url, options);
            object = JSON.parse(res.getBody())

            // Add values
            if (values != undefined) {
                for (v in values) {
                    let value = values[v];
                    addValueToDimension(dimensionName, value);
                }
            }
        }


    
        function getCubes() {
            
            let options = {
                headers: {
                    Authorization: "Bearer " + paconfig.access_token,
                    accountId:paconfig.accountId,
                    tenantId:paconfig.tenantId,
                    userId:paconfig.userId
                    },
                url: paconfig.url + '/api/v1/Cubes'
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
                        
            res.json(getCubes());					
                            
        });

        function existsCube(cubeName) {            
            return getCubes().includes(cubeName);                    
        }

        function _getCubeDimensionNames(cubeName) {
            cubeName = encodeURIComponent(cubeName);

            let options = {
                headers: {
                    Authorization: "Bearer " + paconfig.access_token,
                    accountId:paconfig.accountId,
                    tenantId:paconfig.tenantId,
                    userId:paconfig.userId
                },
                url: paconfig.url + '/api/v1/Cubes(\''+cubeName+'\')/Dimensions'
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

        function getCubeDimensionNames(cubeName) {
            cubeName = encodeURIComponent(cubeName);

            let options = {
                headers: {
                    Authorization: "Bearer " + paconfig.access_token,
                    accountId:paconfig.accountId,
                    tenantId:paconfig.tenantId,
                    userId:paconfig.userId
                },
                url: paconfig.url + '/api/v1/Cubes(\''+cubeName+'\')/Dimensions'
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

            res.json(getCubeDimensionNames(cubeName));
        });

        function rootElements(name) {
            //		[" + name + "].AllMembers
                    return "{TM1FILTERBYLEVEL( {TM1SUBSETALL( ["+name+"] )}, 0 )}";
                }

        function makeQuery(cubeName, versionDimensionName, version)  {
            let cubeDimensionNames = getCubeDimensionNames(cubeName);
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
            console.log('GET /api/pa/cube/' + cubeName + ' called');
            
            let  query = makeQuery(cubeName, config.mapping.versionDimensionName, version);
            let  content = {"MDX": query};                  

            console.log('Query: ' + query);

            let options = {
                type: "POST",
                url: paconfig.url + '/api/v1/ExecuteMDX?$expand=Cells',
                body: content,
                json: true,
                headers: {
                    Authorization: "Bearer " + paconfig.access_token,
                    accountId:paconfig.accountId,
                    tenantId:paconfig.tenantId,
                    userId:paconfig.userId
                }                
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
                            url: paconfig.url + "/api/v1/Cellsets('"+ID+"')",
                            headers: {
                                Authorization: "Bearer " + paconfig.access_token,
                                accountId:paconfig.accountId,
                                tenantId:paconfig.tenantId,
                                userId:paconfig.userId
                            }                            
                        }
                        request.delete(doptions, function(derror, dresponse, dbody){
                            console.log("Deleted query " + ID + " for cube " + cubeName);
                        });

                        
                    
                        //res.json(values);

                        // Create CSV
                        let csv = "";
                        let cubeDimensionNames = getCubeDimensionNames(cubeName);
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
                                let dimensionValues = getDimension(dimensionName);
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
                            dimensions.push(getDimension(dimensionName));
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
        
        function createCube(cubeName, cubeDimensionNames) {
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
                url: paconfig.url + '/api/v1/Cubes',
                json: content,
                headers: {
                    Authorization: "Bearer " + paconfig.access_token,
                    accountId:paconfig.accountId,
                    tenantId:paconfig.tenantId,
                    userId:paconfig.userId
                }                
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
                        row['dummy'] = 'dummy';
                    if (Object.keys(row).length == cols.length + (adddummy ? 1 : 0))
                        rows.push(row);
                }
            }

            for (d in dimensionNames) {
                let dimensionName = dimensionNames[d];
                if (!existsDimension(dimensionName)) {
                    let values = [];
                    for (r in rows)
                        values.push(rows[r][dimensionName]);
                    createDimension(dimensionName, values)
                }

            }

            if (adddummy) {
                if (!existsDimension("dummy")) {
                    createDimension("dummy", ["dummy"]);
                }
                dimensionNames.push("dummy");
            }
            if (config.mapping.versionDimensionName != null) {
                dimensionNames.push(config.mapping.versionDimensionName);
                if (!getDimension(config.mapping.versionDimensionName, 0).includes(version)) {
                    // create version
                    addValueToDimension(config.mapping.versionDimensionName, version);
                }
            }

            if (!existsCube(cubeName))
                createCube(cubeName, dimensionNames);

            let  query = makeQuery(cubeName, config.mapping.versionDimensionName, version);
            let  content = {"MDX": query};                  

            console.log('Query: ' + query);

            let options = {
                type: "POST",
                url: paconfig.url + '/api/v1/ExecuteMDX?$expand=Cells',
                body: content,
                json: true,
                headers: {
                    Authorization: "Bearer " + paconfig.access_token,
                    accountId:paconfig.accountId,
                    tenantId:paconfig.tenantId,
                    userId:paconfig.userId
                }                
            }

            console.log('URL: ' + options.url);

        
            var request = require('request');

            request.post(options, function(error, response, body){
                if (!error && response.statusCode == 201) {
                    let object = body;
				
                    if (object != null) {
                        let ID = object["ID"];
                        let nCells = object["Cells"].length;

                        let cubeDimensionNames = getCubeDimensionNames(cubeName);
                        let nDimensions= cubeDimensionNames.length;
                        if (config.mapping.versionDimensionName != null)
                            nDimensions--;
                        let dimensions = []
                        let sizes = []
                        for (let d in cubeDimensionNames) {
                            dimensions[d] = getDimension(cubeDimensionNames[d], 0);
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



                        // let values = [];
                        // let i = 0;
                        // for (r in rows) {
                        //     let value = {
                        //         Ordinal: i,
                        //         Value: parseFloat(rows[r].value)
                        //     }
                        //     values.push(value);
                        //     i++;
                        // }
			
			

                        poptions = {
                            type: "PATCH",
                            url: paconfig.url + "/api/v1/Cellsets('"+ID+"')/Cells",
                            body: values,
                            json: true,
                            headers: {
                                Authorization: "Bearer " + paconfig.access_token,
                                accountId:paconfig.accountId,
                                tenantId:paconfig.tenantId,
                                userId:paconfig.userId
                            }                            
                        }
                        request.patch(poptions, function(perror, presponse, pbody){
                            console.log("Patched query " + ID + " for cube " + cubeName);                     

                            doptions = {
                                type: "DELETE",
                                url: paconfig.url + "/api/v1/Cellsets('"+ID+"')",
                                headers: {
                                    Authorization: "Bearer " + paconfig.access_token,
                                    accountId:paconfig.accountId,
                                    tenantId:paconfig.tenantId,
                                    userId:paconfig.userId
                                }                            
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

    routeDSX: function (router, dsxconfig) {
        
        var url = dsxconfig.url;
        var login = dsxconfig.login;
        var password = dsxconfig.password;
        var bearerToken = null;

        function lookupBearerToken() {
                

            let content = {
                username: login,
                password: password
                
            };
            
            let options = {
                type: "POST",
                url: url + '/v1/preauth/signin',
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
    
            bearerToken =   bearerCode;
    
            return bearerToken
    
      }

        function getBearerToken() {
            if (bearerToken == null)
                bearerToken = lookupBearerToken();

            return bearerToken;
        }
    
        router.get('/dsx/projects', function(req, res) {
            console.log('GET /api/dsx/projects');

            let options = {
                type: "GET",
                url: url + '/v3/projects',
                headers: {
                    "Authorization": "Bearer " + getBearerToken()
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

        router.put('/dsx/project/:projectName', function(req, res) {
            let projectName = req.params.projectName;
            console.log('PUT /api/dsx/project/' + projectName + ' called');

            let project = { 
                name: projectName, 
                description: "PA-"+ projectName
            }
            let options = {
                type: "PUT",
                url: url + '/v3/project',
                body: project,
                json: true,
                headers: {
                    "Authorization": "Bearer " + getBearerToken()
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
        upload = multer();      
        router.post('/dsx/project/:projectName/dataset/:datasetName', upload.fields([]), (req, res) => {
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
           
            console.log(content);

            let options = {
                    type: "POST",
                    url: url + '/v3/project/' + projectName + '/asset',
                    body: content,
                    headers: {
                        "Content-Type": "multipart/form-data; boundary=" + boundary,
                        "Authorization": "Bearer " + getBearerToken(),
                        "Cookie": "__preloginurl__=/; ibm-private-cloud-session=" + getBearerToken(),
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
        });
			
    }
               
}