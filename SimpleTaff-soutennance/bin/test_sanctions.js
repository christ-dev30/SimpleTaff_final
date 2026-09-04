const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/disciplinaire/sanctions',
  method: 'GET'
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  res.on('end', () => {
    console.log("SANCTIONS DATA:", data);
  });
});

req.on('error', error => {
  console.error(error);
});

req.end();
