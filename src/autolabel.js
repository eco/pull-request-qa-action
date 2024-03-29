import { Label } from "./model/Label";
import { ApprovalStatus } from "./model/ApprovalStatus";
import { QAStatus } from "./model/QAStatus.js";

const core = require('@actions/core');
const github = require('@actions/github');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

let JIRA_PR_APPROVED_WEBHOOK = core.getInput('WH_PR_APPROVED')
let JIRA_READY_FOR_REVIEW = core.getInput('WH_READY_FOR_REVIEW')
let JIRA_IN_QA_WEBHOOK = core.getInput('WH_IN_QA')
let JIRA_QA_PASSED_WEBHOOK = core.getInput('WH_QA_PASSED')
let JIRA_PR_MERGED_WEBHOOK = core.getInput('WH_PR_MERGED')
let JIRA_DESIGN_REVIEW_WEBHOOK = core.getInput('WH_DESIGN_REVIEW')

// Get required approvals input argument
const requiredApprovals = parseInt(core.getInput('REQUIRED_APPROVALS')) || 1;

// Get manual QA label input argument
const manualQARequest = core.getInput('MANUAL_QA_REQUEST') === 'true';


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
        
        if (github.context.eventName != 'labeled') {
            updateLabels(client, prNumber, newLabels, pullRequestState.labels).then(r => { })
        }
        updateJiraTicket(newLabels, pullRequestState)

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
    })
    console.log(reviews)

    let approvals = reviews.filter(review => review.state === ApprovalStatus.APPROVED.name)
    console.log(`Approvals count: ${approvals.length}`)


    let approved = approvals.length >= requiredApprovals

    if (approved) {
        return ApprovalStatus.APPROVED
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
    console.log(`manual QA required: ${manualQARequest}`)

    const hasNeedsDesignReview = pullRequestState.labels.includes(Label.NEEDS_DESIGN_REVIEW.name);
    const currentQAStatus = QAStatus.fromLabels(pullRequestState.labels);

    switch (true) {
        case !pullRequestState.open && !pullRequestState.merged:
            return []
        case pullRequestState.draft:
            return [Label.WORK_IN_PROGRESS]
        case pullRequestState.reviewStatus === ApprovalStatus.NEEDS_REVIEW:
            return hasNeedsDesignReview ? [Label.READY_FOR_REVIEW, Label.NEEDS_DESIGN_REVIEW.name] : [Label.READY_FOR_REVIEW];
        case pullRequestState.reviewStatus === ApprovalStatus.APPROVED:
            if (manualQARequest) {
                // If manual QA is enabled, only apply the "Review Passed" label
                return [Label.REVIEW_PASSED];
            } else {
                // If manual QA is disabled, automatically set the "Ready for QA" label
                return [Label.REVIEW_PASSED, currentQAStatus.label()];
            }
        default:
            return hasNeedsDesignReview ? [Label.NEEDS_DESIGN_REVIEW.name] : [];
    }
}

async function updateLabels(client, prNumber, newLabels, currentLabels) {
    console.log(`Current labels: ${currentLabels}`)
    let labelsToAdd = newLabels.filter(label => !currentLabels.includes(label))
    let labelsToRemove = Label.allCases().filter(label => {
        return currentLabels.includes(label.name) && !(newLabels.includes(label.name))
    })
    console.log(`Labels to add: ${labelsToAdd.map(label => label.name)}`)
    console.log(`Labels to remove: ${labelsToRemove.map(label => label.name)}`)

    return [addLabels(client, prNumber, labelsToAdd), removeLabels(client, prNumber, labelsToRemove)]
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

    await Promise.all(
        labels.map((label) =>
            client.rest.issues.removeLabel({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                issue_number: prNumber,
                name: label.name,
            })
        )
    )
}

function updateJiraTicket(newLabels, pullRequestState) {
    const netNewLabels = newLabels.filter(label => !pullRequestState.labels.includes(label))
    console.log(`Net new labels: ${netNewLabels.map(label => label.name)}`)

    switch (true) {
        case pullRequestState.merged:
            console.log("Transitioning ticket to Merged status");
            sendMessage(JIRA_PR_MERGED_WEBHOOK)
            return
        case pullRequestState.qaStatus === QAStatus.QA_PASSED && !pullRequestState.merged:
            console.log("Transitioning ticket to QA Passed status");
            sendMessage(JIRA_QA_PASSED_WEBHOOK)
            return
        case pullRequestState.qaStatus === QAStatus.IN_QA:
            console.log("Transitioning ticket to In QA status");
            sendMessage(JIRA_IN_QA_WEBHOOK)
            return
        case netNewLabels.includes(Label.READY_FOR_QA.name):
            console.log("Transitioning ticket to Ready for QA status");
            sendMessage(JIRA_PR_APPROVED_WEBHOOK)
            return
        case netNewLabels.includes(Label.NEEDS_DESIGN_REVIEW.name):
            console.log("Transitioning ticket to Needs Design Review status");
            sendMessage(JIRA_DESIGN_REVIEW_WEBHOOK)
            return
        case netNewLabels.includes(Label.READY_FOR_REVIEW.name):
            console.log("Transitioning ticket to Review status");
            sendMessage(JIRA_READY_FOR_REVIEW)
            return
        default:
            return
    }
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
        "branch_name": pullRequest.head.ref,
        "pr_url": pullRequest.html_url,
        "pr_author": pullRequest.user.login
    }

    return request.send(JSON.stringify(body));
}
