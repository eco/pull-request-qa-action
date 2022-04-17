/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 770:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 395:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__nccwpck_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
// ESM COMPAT FLAG
__nccwpck_require__.r(__webpack_exports__);

;// CONCATENATED MODULE: ./src/model/Label.js
class Label {
    static READY_FOR_REVIEW = new Label("Ready for review")
    static REVIEW_PASSED = new Label("Review passed")
    static CHANGES_REQUESTED = new Label("Changes requested")
    static WORK_IN_PROGRESS = new Label("Work in progress")
    static READY_FOR_QA = new Label("Ready for QA")
    static IN_QA = new Label("In QA")
    static QA_PASSED = new Label("QA passed")

    constructor(name) {
        this.name = name
    }

    static allCases() {
        return [
            this.READY_FOR_REVIEW,
            this.REVIEW_PASSED,
            this.CHANGES_REQUESTED,
            this.READY_FOR_QA,
            this.WORK_IN_PROGRESS,
            this.IN_QA,
            this.QA_PASSED
        ]
    }

}

;// CONCATENATED MODULE: ./src/model/ApprovalStatus.js
class ApprovalStatus {
    static APPROVED = new ApprovalStatus("APPROVED")
    static CHANGES_REQUESTED = new ApprovalStatus("CHANGES_REQUESTED")
    static NEEDS_REVIEW = new ApprovalStatus("NEEDS_REVIEW")

    constructor(name) {
        this.name = name
    }
}
;// CONCATENATED MODULE: ./src/model/QAStatus.js


class QAStatus {
    static NEEDS_QA = new QAStatus("NEEDS_QA")
    static IN_QA = new QAStatus("IN_QA")
    static QA_PASSED = new QAStatus("QA_PASSED")

    constructor(name) {
        this.name = name
    }

    label() {
        switch (this) {
            case QAStatus.NEEDS_QA:
                return Label.READY_FOR_QA
            case QAStatus.IN_QA:
                return Label.IN_QA
            case QAStatus.QA_PASSED:
                return Label.QA_PASSED
        }
    }

    static fromLabels(labels) {
        switch (true) {
            case labels.includes(Label.IN_QA.name):
                return QAStatus.IN_QA
            case labels.includes(Label.QA_PASSED.name):
                return QAStatus.QA_PASSED
            default:
                return QAStatus.NEEDS_QA
        }
    }


}
;// CONCATENATED MODULE: ./src/autolabel.js




const core = __nccwpck_require__(770);
const github = __nccwpck_require__(395);

let JIRA_PR_APPROVED_WEBHOOK = "https://automation.atlassian.com/pro/hooks/99c04c3891fa359e13d70428baf503c520256ab9"

async function run() {
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

;// CONCATENATED MODULE: ./src/index.js


run().then(r => {});
})();

module.exports = __webpack_exports__;
/******/ })()
;