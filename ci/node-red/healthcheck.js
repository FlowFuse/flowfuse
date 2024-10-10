var http = require('http');
var https = require('https');
var request;

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

var options = {
    host: "localhost",
    port: 2880,
    timeout: 4000
};

request = http.request(options, (res) => {
    //console.log(`STATUS: ${res.statusCode}`);
    if ((res.statusCode >= 200) && (res.statusCode < 500)) { process.exit(0); }
    else { process.exit(1); }
});

request.on('error', function (err) {
    //console.log('ERROR',err);
    process.exit(1);
});

request.end(); 
