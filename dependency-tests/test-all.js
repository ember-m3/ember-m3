const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const generateExpectedOutput = require('./expected');
const diff = require('diff');
const { clearLines, exec } = require('./utils');
const pkg = require('../package.json');

// get current M3 versions for deps to test output against
const M3DataDeps = Object.keys(pkg.dependencies).filter(
  k => k.indexOf('ember-data') !== -1 || k === 'ember-inflector'
);
const versions = {};
M3DataDeps.forEach(name => {
  versions[name] = require(`${name}/package.json`).version;
});
versions.data = versions['@ember-data/store'];
versions.inflector = versions['ember-inflector'];
versions.m3 = pkg.version;

const Expected = generateExpectedOutput(versions);

let clean = false; // runs rm -rf node_modules package-lock.json on the test app when true prior to install for the test
let successCount = 0; // total tests passed
let failCount = 0; // total tests failed

// filter out DEBUG log info that isn't relevant to us and clean up the remaining log for parsing
function cleanDebugOutput(output) {
  let lines = output.split('\n').filter(s => s.indexOf('ember-m3') !== -1);
  lines = lines.map(l => {
    let a = l.split(' ');
    a.shift(); // remove timestamp
    a.shift(); // remove ember-m3 DEBUG label
    return a.join(' ');
  });
  return lines.join('\n');
}

function colorizeDiff(diff) {
  let colorized = diff
    .map(part => {
      let color = part.added ? 'green' : part.removed ? 'red' : 'grey';
      let symbol = part.added ? '+' : part.removed ? '-' : ' ';
      return chalk[color](`${symbol}\t${part.value.split('\n').join(`\n${symbol}\t`)}`);
    })
    .join('\n');

  return colorized;
}

/*
  Run the build for a test app and compares the parsed log output
  to what we expect for the given test.
*/
async function run(dir, test) {
  console.log(`\nTest: ${chalk.green(dir)} > ${chalk.green(test)}\n`);
  let testAppPath = path.join(__dirname, 'tests', dir, test);
  let expected = Expected[dir][test];

  // whether we expect this test to throw an error during build
  let expectsError = typeof expected === 'object' && expected.throws === true;

  // run install for the test app
  await exec(
    `cd ${testAppPath} &&${clean ? ` rm -rf node_modules package-lock.json && ` : ''} npm install`
  );

  // make sure ember-m3 is properly installed too
  await exec(`yarn install`);

  // run build command for the test app
  let output;
  try {
    let buildOutput = await exec(
      `cd ${testAppPath} && DEBUG=ember-m3 node ./node_modules/.bin/ember build`
    );

    if (expectsError) {
      throw new Error(`Expected build to error but it did not.`);
    }

    output = cleanDebugOutput(buildOutput.stderr);
  } catch (e) {
    if (expectsError) {
      output = e.message;
    } else {
      throw e;
    }
  }

  let errorSeen = expectsError && output.indexOf(expected.message) !== -1;
  let diffed = diff.diffLines(expectsError ? expected.message : expected, output);
  let colorized = colorizeDiff(diffed);

  if (diffed.length === 1 || errorSeen) {
    if (errorSeen) {
      await clearLines(6); // remove command logging
      process.stdout.write(`✅ Test Passed! ${chalk.green(dir)} > ${chalk.green(test)}\n`);
      process.stdout.write(`\n${chalk.grey(expected.message.split('\n').join(`\n \t`))}`);
      successCount++;
      return;
    }

    if (!diffed[0].added && !diffed[0].removed) {
      await clearLines(7); // remove command logging
      process.stdout.write(`✅ Test Passed! ${chalk.green(dir)} > ${chalk.green(test)}\n`);
      process.stdout.write(`\n${colorized}`);
      successCount++;
      return;
    }
  }

  failCount++;

  await clearLines(7); // remove command logging
  process.stderr.write(`💥 Test Failed! ${chalk.red(dir)} > ${chalk.red(test)}\n`);
  process.stderr.write(`\n${colorized}\n`);
}

async function main() {
  let dirs = fs.readdirSync(path.join(__dirname, 'tests'));

  for (let i = 0; i < dirs.length; i++) {
    let dir = dirs[i];
    let tests = fs.readdirSync(path.join(__dirname, 'tests', dir));

    for (let j = 0; j < tests.length; j++) {
      let test = tests[j];
      try {
        await run(dir, test);
      } catch (e) {
        console.log({ error: e });
      }
    }
  }
  if (failCount > 0) {
    console.log(
      chalk.red(
        `\n${successCount} of ${successCount + failCount} Tests Passed. ${failCount} Failed.`
      )
    );
    process.exit(1); // eslint-disable-line no-process-exit
  }
  console.log(`\n${successCount} of ${successCount} Tests Passed.`);
}

main();
