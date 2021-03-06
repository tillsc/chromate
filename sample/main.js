
var Chrome = require('../index').Chrome;
var Tab = require('../index').Tab;
var targetUrl = 'file://' + require('path').resolve('./sample/target.html');

// process.on('uncaughtException', err => console.log(333, err))

Chrome.start({canary: true})
  .then(run)
  .catch(err => {
    console.log('Error starting chrome', err);
    process.exit(0)
  });


function run(chrome) {
  console.log(`started pid ${chrome.pid} on port ${Chrome.settings.port}`);

  Chrome.list().then(res => console.log(`Got ${res.length} processes`));

  var options = {
    verbose: true,
    failonerror: false,
    timeout: 2000   // set this lower to see timeout behavior
  };

  new Tab(options)
    .on('ready', tab => {
      console.log('ready', tab.client.target.id);

      // add script to target
      tab.client.Page.addScriptToEvaluateOnLoad({
        scriptSource: 'console.log("in target", location.href)'
      });
    })
    .on('abort', (a) => exit(chrome))
    .on('Network.requestWillBeSent', param => console.log('network request custom handler', param.request.method))
    .once('Runtime.consoleAPICalled', param => console.log('Runtime.consoleAPICalled called', param))
    .on('load', (param, tab) => console.log('load', param))
    .on('exception', (param, tab) => exit(chrome))
    .on('console', (param, tab) => console.log('console', param.type, param.text))
    .on('foo', (param, tab) => console.log('foo', param))
    .on('done', (param, tab) => {
      console.log('done', param);
      tab.close().then(() => exit(chrome));
    })
    .on('disconnect', (param, tab) => console.log('disconnect', param)) // not firing!
    .open(targetUrl)
    .then(tab => {
      return tab.evaluate('__coverage__')
        .then(result => console.log('Got coverage', result));
    })
    .catch(err => {
      console.log('Got error:', err);
      exit(chrome);
    });
}

function exit(chrome) {
  console.log('Exiting chrome', chrome.pid);
  Chrome.kill(chrome);
  process.exit(0);
}
