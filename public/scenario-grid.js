class ScenarioGrid {

    constructor(gridDivName, scenarioManager) {
        this.gridDivName = gridDivName;
        this.scenarioManager = scenarioManager;
        this.widgets = [];
      }

      
    addWidget(widget) {
        this.widgets.push(widget);
        
        let item = document.createElement('div');
        item.className = "grid-stack-item";
        item.setAttribute('data-gs-x', widget.x);
        item.setAttribute('data-gs-y', widget.y);
        item.setAttribute('data-gs-width', widget.width);
        item.setAttribute('data-gs-height', widget.height);
        item.setAttribute('data-gs-auto-position', 1);                

        var content = document.createElement('div');
        content.className = "grid-stack-item-content"
        let titleDiv = document.createElement('div');
        titleDiv.className = "grid-title";
        let title = (widget.title == undefined) ? "" : widget.title;
        titleDiv.innerHTML = title; 
        content.appendChild(titleDiv);

        content.innerHTML = content.innerHTML + widget.innerHTML; 
        item.appendChild(content);

        var grid = $('#'+this.gridDivName).data('gridstack');
        grid.addWidget(item);
    }

    redraw() {
        let widgets = this.widgets;
        for (let w in widgets) {
            if ('cb' in widgets[w])
                (widgets[w].cb)();
        }
    }
}


$(function () {    

    var options = {
        // verticalMargin: 5
    };
    $('.grid-stack').gridstack(options).on('gsresizestop', function(event, elem) {
        // var newHeight = $(elem).attr('data-gs-height');
        console.log('STOP resize' );
        let scenario = scenariomgr.getSelectedScenario();
        showInputsAndOutputs(scenario);       
    });
});