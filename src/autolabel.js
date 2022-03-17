import {LabelerState} from "./model/LabelerState";
import {Label} from "./model/Label";
import {ApprovalStatus} from "./model/ApprovalStatus";

const core = require('@actions/core');
const github = require('@actions/github');

export async function run() {
    try {
        const token = core.getInput("repo-token", { required: true });

        const prNumber = getPrNumber();
        if (!prNumber) {
            console.log("Could not get pull request number from context, exiting");
            return;
        }

        const client = github.getOctokit(token);
        const state = await getLabelerState(client, prNumber)

        await updateLabels(client, prNumber, state)
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

    let approved = reviews.filter( review => review.state === ApprovalStatus.APPROVED.name ).length > 0
    let changesRequested = reviews.filter( review => review.state === ApprovalStatus.CHANGES_REQUESTED.name ).length > 0

    if (approved && !changesRequested) {
        return ApprovalStatus.APPROVED
    } else if (changesRequested) {
        return ApprovalStatus.CHANGES_REQUESTED
    } else {
        return ApprovalStatus.NEEDS_REVIEW
    }
}

async function getPullRequestState(client, prNumber) {
    const { data: pullRequest } = await client.rest.pulls.get({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: prNumber,
    });

    return {
        open: pullRequest.state === "open",
        draft: pullRequest.draft,
        merged: pullRequest.merged
    }
}

async function getLabelerState(client, prNumber) {
    let pullRequestState = await getPullRequestState(client, prNumber)
    let approvalStatus = await getApprovalStatus(client, prNumber)

    if (pullRequestState.draft) {
        return LabelerState.WORK_IN_PROGRESS
    } else if (approvalStatus === ApprovalStatus.NEEDS_REVIEW) {
        return LabelerState.READY_FOR_REVIEW
    } else if (approvalStatus === ApprovalStatus.APPROVED) {
        return LabelerState.REVIEW_PASSED
    } else if (approvalStatus === ApprovalStatus.CHANGES_REQUESTED) {
        return LabelerState.CHANGES_REQUESTED
    }
}

async function updateLabels(client, prNumber, state) {
    let labelsToAdd = state.labels().map(label => label.name)
    let labelsToRemove = Label.allCases().filter(label => !(labelsToAdd.includes(label.name)))

    await Promise.all(
        [addLabels(client, prNumber, labelsToAdd), removeLabels(client, prNumber, labelsToRemove)]
    )
}

async function addLabels(client, prNumber, labels) {
    await client.rest.issues.addLabels({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: prNumber,
        labels: labels,
    });
}

async function removeLabels(client, prNumber, labels) {
    await Promise.all(
        labels.map((label) =>
            client.rest.issues.removeLabel({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                issue_number: prNumber,
                name: label,
            })
        )
    );
}
