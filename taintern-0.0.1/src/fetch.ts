import https from 'https';

const url = 'https://docs.google.com/spreadsheets/d/12IyFwPQyfkxcqIL3PcmTUZ541Qeb761ZpXRPHlLbTRs/export?format=csv&gid=0';

https.get(url, (res) => {
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
    https.get(res.headers.location, (res2) => {
      let data = '';
      res2.on('data', (chunk) => data += chunk);
      res2.on('end', () => console.log(data.substring(0, 1000)));
    });
  } else {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log(data.substring(0, 1000)));
  }
});
