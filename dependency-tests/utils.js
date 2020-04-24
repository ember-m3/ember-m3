const execa = require('execa');
const chalk = require('chalk');

// promisify clearing a line
function clearLine() {
  return new Promise(resolve => {
    process.stdout.clearLine(0, resolve);
  });
}

// moving a cursor up Y lines and to X 0 is complicated
async function resetCursor(dy = 0) {
  await new Promise(resolve => {
    process.stdout.moveCursor(0, dy, resolve);
  });
  return new Promise(resolve => {
    process.stdout.cursorTo(0, undefined, resolve);
  });
}

// allows clearing {count} lines of console output
async function clearLines(count) {
  while (count-- > 1) {
    await clearLine();
    await resetCursor(-1);
  }
  await clearLine();
  await resetCursor(0);
}

async function exec(cmd) {
  process.stdout.write(`\n⚜️\t🟡  [EXECUTING ...]\t` + chalk.yellow(cmd));
  let output;
  try {
    output = execa.sync(cmd, { shell: true });
    await clearLines(1);
    process.stdout.write(`⚜️\t🟢  ` + chalk.cyan(cmd));
  } catch (e) {
    await clearLines(1);
    process.stdout.write(`⚜️\t🔴  ` + chalk.red(cmd));
    throw e;
  }
  return output;
}

module.exports = {
  exec,
  clearLines,
};
