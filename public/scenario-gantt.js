function showGantt(divId, assignments_data, assignments_qty, gconfig) {
    document.getElementById(divId).innerHTML = "";

    filters = [];
    for (f in gconfig.filters) {
        let filter = gconfig.filters[f];
        filteroptions = [{ value: "none", text: "None" }];
        allvalues= [];
        for (r in assignments_data) {
            let resource = assignments_data[r];
            for (a in resource.activities) {
                let activity = resource.activities[a];
                if (!allvalues.includes(activity[filter]))
                    allvalues.push(activity[filter])
            }
        }
        for (v in allvalues) {
            let value = allvalues[v];
            filteroptions.push({value:value, text: value});
        }
        filters.push(
            {
                type: 'select',
                text: 'Filter on '+filter,
                options : filteroptions,
                onchange : function(command, ctx) {
                    var gantt = ctx.gantt;
                    if (gantt['filter'+filter]) {
                        gantt.removeFilter(gantt['filter'+filter]);
                    }
                    if (command && ("none" !== command)) {
                        gantt['filter'+filter] = gantt.addFilter(function(obj) {
                            return obj[filter] && obj[filter] == command;
                        }, true /* filter rows */, true /* filter activities */);
                    }
                }
            });
        }

    var config = {
            data : {
                    // Configures how to fetch resources for the Gantt
                    resources : {
                            data : assignments_data, // resources are provided in an array. Instead, we could configure a request to the server.
                            // Activities of the resources are provided along with the 'activities' property of resource objects.
                            // Alternatively, they could be listed from the 'data.activities' configuration.
                            activities : "activities",
                            name : "name", // The name of the resource is provided with the name property of the resource object.
                            id : 'id', // The id of the resource is provided with the id property of the resource object.
                            parent : 'parent'
                    },
                    // Configures how to fetch activities for the Gantt
                    // As activities are provided along with the resources, this section only describes how to create
                    // activity Gantt properties from the activity model objects.
                    activities : {
                            start : 'start', // The start of the activity is provided with the start property of the model object
                            end : 'end', // The end of the activity is provided with the end property of the model object
                            name : 'name' // The name of the activity is provided with the name property of the model object
                    }
            },
            // Configure a toolbar associated with the Gantt
            toolbar : [
                    'title',
                    'search',
                    'separator',
                    {
                            type: 'button',
                            text: 'Refresh',
                            fontIcon : 'fa fa-refresh fa-lg',
                            onclick: function (ctx) {
                            ctx.gantt.draw();
                            }
                    }].concat(filters).concat(
                        [
                    'mini',                                
                    'fitToContent',
                    'zoomIn',
                    'zoomOut',
                    'toggleLoadChart'
            ]),
            loadResourceChart : {
                    /*maxLoad :  function(res, act) { 
                                            return 10; 
                                            },*/
                    load :  function(res, act) { 
                                            return parseFloat(assignments_qty[res.id][act.id]); 
                                            },
                    height: '150px'
            }, 
            timeTable : {
                    renderer : [{
                            selector : function(object, ctx) {
                                return true;
                            },
                            background : {
                                    //palette : [ '#5aa8f8', '#4178bc', '#8cd211', '#c8f08f', '#ba8ff7', '#a6266e', '#ff7832' ],
                                    getValue : 'project'
                            },
                            color : 'automatic',
                            tooltipProperties : function(activity, ctx) {
                                    var props = [ 'Start', new Date(activity.start).format(), 'End', new Date(activity.end).format()];
                                    props.push('Module', activity.module);                                                
                                    return props;
                                }
                        }]
                    },
            title : 'Schedule' // Title for the Gantt to be displayed in the toolbar
    };
    gantt = new Gantt(divId /* the id of the DOM element to contain the Gantt chart */, config);        
}