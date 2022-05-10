import {Label} from "./model/Label";
import {ApprovalStatus} from "./model/ApprovalStatus";
import {QAStatus} from "./model/QAStatus.js";

const core = require('@actions/core');
const github = require('@actions/github');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

let JIRA_PR_APPROVED_WEBHOOK = "https://automation.atlassian.com/pro/hooks/99c04c3891fa359e13d70428baf503c520256ab9"
let JIRA_READY_FOR_REVIEW = "https://automation.atlassian.com/pro/hooks/555fd72f115ea01673e11f4049e4de8ac5739033"
let JIRA_IN_QA_WEBHOOK = "https://automation.atlassian.com/pro/hooks/60f0d41091bad9582f78e278603bc32d38f6aa33"
let JIRA_QA_PASSED_WEBHOOK = "https://automation.atlassian.com/pro/hooks/9f1d97ccfea93079cdea6f1c1bb262b768670b6b"
let JIRA_PR_MERGED_WEBHOOK = "https://automation.atlassian.com/pro/hooks/0ffdc93dd4d0e340de0b17c9f6c6df50e3820013"

export async function run() {
    try {
        const token = core.getInput("repo-token", { required: true });

        const prNumber = getPrNumber();
        if (!prNumber) {
            console.log("Could not get pull request number from context, exiting");
            return;
        }

        const client = github.getOctokit(token);
        const pullRequestState = await getPullRequestState(client, prNumber)
        const newLabels = getNewLabels(pullRequestState).map(label => label.name)

        console.log(`Updating labels to [${newLabels}]`)

        updateLabels(client, prNumber, newLabels, pullRequestState.labels).then(r => {})

        if (pullRequestState.reviewStatus === ApprovalStatus.APPROVED) {
            sendMessage(JIRA_IN_QA_WEBHOOK)
        }
        
        if (pullRequestState.qaStatus === QAStatus.IN_QA) {
            sendMessage(JIRA_IN_QA_WEBHOOK)
        }
        
        if (pullRequestState.qaStatus === QAStatus.QA_PASSED) {
            sendMessage(JIRA_QA_PASSED_WEBHOOK)
        }

        if (pullRequestState.merged) {
            sendMessage(JIRA_PR_MERGED_WEBHOOK)
        }

    } catch (error) {
        core.setFailed(error.message);
    }
}

function getPrNumber() {
    const pullRequest = github.context.payload.pull_request;
    if (!pullRequest) { return undefined; }
    return pullRequest.number;
}

async function getApprovalStatus(client, prNumber) {
    const { data: reviews } = await client.rest.pulls.listReviews({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: prNumber,
        }
    )

    let approvals = reviews.filter( review => review.state === ApprovalStatus.APPROVED.name )
    let changeRequests = reviews.filter( review => review.state === ApprovalStatus.CHANGES_REQUESTED.name )

    let activeChangeRequests = changeRequests.filter(review => {
        let author = review.user.id
        let submittedAt = review.submitted_at

        return approvals
            .filter(review => { return review.user.id === author })
            .filter(review => { return review.submitted_at > submittedAt })
            .length === 0
    })

    let approved = approvals.length > 0
    let changesRequested = activeChangeRequests.length > 0

    if (approved && !changesRequested) {
        return ApprovalStatus.APPROVED
    } else if (changesRequested) {
        return ApprovalStatus.CHANGES_REQUESTED
    } else {
        return ApprovalStatus.NEEDS_REVIEW
    }
}

async function getPullRequestState(client, prNumber) {
    const approvalStatus = await getApprovalStatus(client, prNumber)
    const { data: pullRequest } = await client.rest.pulls.get({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: prNumber,
    });

    const currentLabels = pullRequest.labels.map(label => label.name)

    return {
        open: pullRequest.state === "open",
        draft: pullRequest.draft,
        merged: pullRequest.merged,
        labels: currentLabels,
        reviewStatus: approvalStatus,
        qaStatus: QAStatus.fromLabels(currentLabels)
    }
}

function getNewLabels(pullRequestState) {
    const str = JSON.stringify(pullRequestState, null, 2)
    console.log(`pull request state: ${str}`)

    switch (true) {
        case !pullRequestState.open && !pullRequestState.merged:
            return []
        case pullRequestState.draft:
            return [Label.WORK_IN_PROGRESS]
        case pullRequestState.reviewStatus === ApprovalStatus.CHANGES_REQUESTED:
            return [Label.CHANGES_REQUESTED]
        case pullRequestState.reviewStatus === ApprovalStatus.NEEDS_REVIEW:
            return [Label.READY_FOR_REVIEW]
        case pullRequestState.reviewStatus === ApprovalStatus.APPROVED:
            return [Label.REVIEW_PASSED, pullRequestState.qaStatus.label()]
        default:
            return []
    }
}

async function updateLabels(client, prNumber, newLabels, currentLabels) {
    console.log(`Current labels: ${currentLabels}`)
    let labelsToAdd = newLabels.filter(label => !currentLabels.includes(label))
    let labelsToRemove = Label.allCases().filter(label =>  {
        return currentLabels.includes(label.name) && !(newLabels.includes(label.name))
    })


    if (labelsToAdd.includes(Label.READY_FOR_REVIEW.name)) {
        sendMessage(JIRA_READY_FOR_REVIEW)
    }

    if (labelsToAdd.includes(Label.READY_FOR_QA.name)) {
        sendMessage(JIRA_PR_APPROVED_WEBHOOK)
    }

    await Promise.all(
        [addLabels(client, prNumber, labelsToAdd), removeLabels(client, prNumber, labelsToRemove)]
    )
}

async function addLabels(client, prNumber, labels) {
    if (labels.length <= 0) { return }

    console.log(`Adding labels:  ${labels}`)

    await client.rest.issues.addLabels({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: prNumber,
        labels: labels,
    });
}

async function removeLabels(client, prNumber, labels) {
    if (labels.length <= 0) { return }

    console.log(`Removing labels: ${labels.map(label => label.name)}`)

    labels.map((label) =>
        client.rest.issues.removeLabel({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            issue_number: prNumber,
            name: label.name,
        })
    )
}

function sendMessage(webhook, requestType = "POST") {
      const pullRequest = github.context.payload.pull_request
      if (!pullRequest) { return undefined; }

      let request = new XMLHttpRequest();
      request.open(requestType, webhook);

      request.setRequestHeader('Content-type', 'application/json');

      let body = {
        "pr_content": pullRequest.body,
        "pr_title": pullRequest.title,
        "branch_name": pullRequest.head.ref
      }

      console.log(`Sending message ${body}`)
      return request.send(JSON.stringify(body));
}
