
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

function showAsSaveConfig(buttonId, config) {
    document.getElementById(buttonId).onclick = function () {

        if (monaco.editor.getModelMarkers().length == 0) {
            let newconfig = JSON.parse(editor.getValue());
            for (e in newconfig)
                config[e] = newconfig[e];
            axios.put('./api/config?workspace='+workspace, newconfig)
            .then(function (response) {
                console.log('Config saved.');
            });
        } else { 
            alert ('Fix errors before saving.')
        }
        

    }
}