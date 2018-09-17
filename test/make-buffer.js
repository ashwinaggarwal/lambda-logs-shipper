import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

const buffer = Buffer.from(
  JSON.stringify({
    messageType: 'DATA_MESSAGE',
    owner: 'xxxxxxxx',
    logGroup: '/aws/lambda/serverlessLocalTester',
    logStream: '2018/09/16/[$LATEST]xxxxxxxxd4ff5f98',
    subscriptionFilters: ['logs-shipper'],
    logEvents: [
      {
        id: '3xx27xxxxxxxxx197x619x9xxx1x083x3xxxxxx2xxx08',
        timestamp: 1537180695000,
        message:
          'info: testdata {"field1":"field1","field2":"field2","field3":"field3"}\n'
      }
    ]
  }),
  'utf-8'
);

const data = gzip(buffer);

console.log(data.toString('base64'));

//H4sIAAAAAAAAE0WQT4uDMBDFv0oJe3RJouufeBPW7aV70luVJa2xDUQjJm2ziN99x27FQODx5s1vmJlQJ4zhF1H+DgKl6DMrs5/vvCiyfY48pB+9GMF2rweW0pf9qG8DuJg/DFa8OzUcGzHexagAdtBnrkphLHQ+44UdBe8g7xOaYMIwjfDx7ZCVeVHWK7n5aNuwZQm0mNvJnEc5WKn7L6mAY1B6XEjm3VzlMAC4fpLzu+jtUpyQbGBA4Jwfr0RHWewiyhxbtCNJ4IL/gg+fLJOshO0t72AZGgYxTUjEQkKIt14FmLJvdbqzkGu45bupQq0UqqEVSjfpvaS/uf7mBpsLcq56NNfzH1Az/kx6AQAA
