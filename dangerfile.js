import { fail, message, warn, danger, markdown } from 'danger';
const dangerJest = require('danger-plugin-jest').default;
const { readFile } = require('fs').promises;
const md5 = require('md5');
const path = require('path');
const glob = require('glob');
const { promisify } = require('util')
const pglob = promisify(glob);
const AWS = require('aws-sdk/global');
const S3 = require('aws-sdk/clients/s3');

const lintPath = path.join(__dirname, 'lint-results.json');
function lint() {
  return readFile(lintPath).then(file => {
    const lintReport = JSON.parse(file)
    for (const { messages, filePath } of lintReport) {
      const relPath = path.relative(__dirname, filePath)
      for (const message of messages) {
        const text = `${message.message} \`${message.ruleId}\``
        if (message.severity === 2) {
          fail(text, relPath, message.line);
        } else if (message.severity === 1) {
          warn(text, relPath, message.line);
        }
      }
    }
  });
}

function coverage() {
  return readFile(path.join(__dirname, 'coverage', 'coverage-summary.json')).then(file => {
    const { total } = JSON.parse(file)
    const formatCoverage = (kind, { covered, total, pct }) => `${covered} / ${total} ${kind} (${pct}%)`
    message(`Code coverage: ${
      Object.entries(total).map(([kind, cov]) => formatCoverage(kind, cov)).join(', ')
    }`)
  })
}

const updateScreensActionLink = `https://github.com/VKCOM/VKUI/actions?query=workflow%3A"Update+screenshots"`;
const UPLOAD_BUCKET = 'vkui-screenshots';
const awsHost = `${UPLOAD_BUCKET}.hb.bizmrg.com`;
const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  endpoint: 'hb.bizmrg.com',
  accessKeyId: 'qDoGa6Z8FFV46kWEPKZPv7',
  secretAccessKey: '6YuVC54JV3KizQU9RyAyyGGs5vpygktZnfczdk3eEpFG',
});
async function uploadFailedScreenshots() {
  const diffDir = '__diff_output__'
  const { github } = danger;
  const pathPrefix = github ? String(github.pr.number) : 'local';
  await removeDiffs(`${pathPrefix}/`);
  const failedScreens = await pglob(path.join(__dirname, '**', diffDir, '*.png'));
  for (const failedScreen of failedScreens) {
    const screenName = path.parse(failedScreen).name;
    const fileContents = await readFile(failedScreen);
    const key = `${pathPrefix}/${screenName}-${md5(fileContents)}.png`;
    try {
      await s3.putObject({
        Body: fileContents,
        Bucket: UPLOAD_BUCKET,
        Key: key,
        ContentType: 'image/png',
        ACL: 'public-read',
      }).promise();
      markdown(`
        <details>
          <summary>Screenshot <code>${screenName}</code> failed</summary>
          <img src="https://${awsHost}/${key}">
        </details>
      `.replace(/(^|\n) +/g, ''));
    } catch (err) {
      console.log('Screenshot diff upload failed', err.message);
    }
  }

  if (failedScreens.length) {
    warn(`${failedScreens.length} changed screenshots found — review & update them via ["Update Screenshots" action](${updateScreensActionLink}) before merging.`);
  }
}

async function checkUpdatedScreenshots() {
  if (danger.git.modified_files.some(file => /__image_snapshots__/.test(file))) {
    warn('Modified screenshots found');
  }
}

async function removeDiffs(prefix) {
  const list = (await s3.listObjects({
    Bucket: UPLOAD_BUCKET,
    Prefix: prefix,
  }).promise()).Contents;
  if (list && list.length !== 0) {
    await s3.deleteObjects({
      Bucket: UPLOAD_BUCKET,
      Delete: {
        Objects: list.map(obj => ({ Key: obj.Key })),
      },
    }).promise();
  }
}

Promise.all([
  dangerJest(),
  lint(),
  coverage(),
  uploadFailedScreenshots(),
  checkUpdatedScreenshots(),
]);
