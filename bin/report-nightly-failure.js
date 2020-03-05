// https://octokit.github.io/rest.js/v17#issues-list
const { Octokit } = require('@octokit/rest');
const m = require('moment');
const assert = require('assert');

function getIssueTitle(runId) {
  return `Nightly Run Failure: ${runId}`;
}

// TODO: report commit range
// TODO: even more betterer bisect commit range (possibly as a separate workflow)
async function createIssue({ github, runId }) {
  let title = getIssueTitle(runId);
  let date = m().format('D MMM YYYY');
  let url = `https://github.com/hjdivad/ember-m3/actions/runs/${runId}`;
  let body = `Nightly run failed on: ${date}\n${url}`;

  github.issues.create({
    owner: 'hjdivad',
    repo: 'ember-m3',
    title,
    body,
    labels: ['CI'],
  });
}

async function main({ env }) {
  const { GITHUB_TOKEN: token, RUN_ID: runId } = env;

  assert(!!token, `env GITHUB_TOKEN must be set`);
  assert(!!runId, `env RUN_ID must be set`);

  let github = new Octokit({
    auth: token,
    userAgent: 'hjdivad/ember-m3 nightly tests issue reporter',
  });
  global.g = github;

  let issueTitle = getIssueTitle(runId);
  // https://help.github.com/en/github/searching-for-information-on-github/searching-issues-and-pull-requests
  let issueSearch = await github.search.issuesAndPullRequests({
    q: `repo:hjdivad/ember-m3 is:issue label:CI in:title ${issueTitle}`,
  });

  if (issueSearch.data.total_count > 0) {
    let issueNumber = issueSearch.data.items[0].number;
    console.log(`Issue ${issueNumber} already exists for run ${runId}`);
    return;
  }

  createIssue({ github, runId });
}

module.exports = {
  _main: main,
};

if (require.main === module) {
  main({ env: process.env });
}
