
    //<link href="./dist/js/vs/editor/editor.main.css" rel="stylesheet" />

    // <script>var require = { paths: { 'vs': './dist/vs' } };</script>
    // <script type="text/javascript" src="./dist/vs/loader.js"></script>
    // <script type="text/javascript" src="./dist/vs/editor/editor.main.nls.js"></script>
    // <script type="text/javascript" src="./dist/vs/editor/editor.main.js"></script>

function showAsConfigEditor(divId, config) {
    var div = document.getElementById(divId);
    // div.style.height = '500px';
    // div.style.width = '1000px';

    // window.editor is accessible. 
    div.editor = null;

    require(['vs/editor/editor.main'], function () {

        model = monaco.editor.createModel(JSON.stringify(config, null, 2), 'json');
        
        editor = monaco.editor.create(div, {
            //theme: 'vs-dark',
            model: model
        });

        editor.layout();
    });
}

function showAsLoadConfig(buttonId) {
    document.getElementById(buttonId).onclick = function () {
        axios({
                method:'get',
                url:'./api/config?workspace='+workspace,
                responseType:'json'
            })
        .then(function (response) {
            let config = response.data;
            editor.setValue(JSON.stringify(config, null, 2), 'json')
        });
    }
}

function showAsSaveConfig(buttonId, config, dosave) {
    document.getElementById(buttonId).onclick = function () {

        if (monaco.editor.getModelMarkers().length == 0) {
            let newconfig = JSON.parse(editor.getValue());
            for (e in newconfig)
                config[e] = newconfig[e];
            let url = './api/config?workspace='+workspace;
            if (dosave)
                url += '&dosave=true';
            axios.put(url, newconfig)
            .then(function (response) {
                console.log('Config saved.');
            });
        } else { 
            alert ('Fix errors before saving.')
        }
        

    }
}

function showAsConfig(divId, config) {
    let configDiv = document.getElementById(divId);
    let height = configDiv.clientHeight-30;
    let html = '';
    html += '<div>';
    html += '<button type="button" class="btn btn-sm btn-outline-secondary" id="CONFIG_PUSH">PUSH</button>';
    html += '<button type="button" class="btn btn-sm btn-outline-secondary" id="CONFIG_SAVE">SAVE</button><br>';
    html += '</div>';
    html += '<div class="row" style="height:5px">  </div>';
    html += '<div id="configEditorDiv" style="height:'+height+'px"></div>';
    configDiv.innerHTML = html;
    showAsConfigEditor('configEditorDiv', config);
    showAsSaveConfig('CONFIG_PUSH', config);
    showAsSaveConfig('CONFIG_SAVE', config, true);
}