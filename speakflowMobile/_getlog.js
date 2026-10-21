const https = require('https');
const zlib = require('zlib');
const url = process.argv[2];
https.get(url, (res) => {
  const gunzip = zlib.createGunzip();
  const chunks = [];
  res.pipe(gunzip);
  gunzip.on('data', d => chunks.push(d));
  gunzip.on('end', () => console.log(Buffer.concat(chunks).toString('utf8').slice(-8000)));
  gunzip.on('error', () => {
    const raw = [];
    res.on('data', d => raw.push(d));
    res.on('end', () => console.log(Buffer.concat(raw).toString('utf8').slice(-8000)));
  });
}).on('error', e => console.error(e));
