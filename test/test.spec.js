import { config } from 'dotenv';
import path from 'path';
import { exec } from 'child_process';
import test from 'ava';

config();

const execP = (cmd) => {
  return new Promise((resolve, reject) => {
    const childProcess = exec(cmd, {
      cwd: path.join(process.cwd(), 'dist')
    }, (err, stdout) => {
      if (err) {
        reject(err);
      }
      resolve(stdout);
    });
    childProcess.stdout.pipe(process.stdout);
    childProcess.stderr.pipe(process.stderr);
  });
};

test('shipper handler to process data', async (t) => {
  const result = await execP('serverless invoke local --function shipperHANDLER --path test/events/shipper-kinesis.json');
  console.log(result);
  // const resultJson = JSON.parse(result);
  t.snapshot('resultJson.statusCode');
});
