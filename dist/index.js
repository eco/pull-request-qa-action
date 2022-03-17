/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 105:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 82:
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
class Label_Label {
    static READY_FOR_REVIEW = new Label_Label("Ready for Review")
    static REVIEW_PASSED = new Label_Label("Review passed")
    static CHANGES_REQUESTED = new Label_Label("Changes Requested")
    static WORK_IN_PROGRESS = new Label_Label("Work in Progress")
    static READY_FOR_QA = new Label_Label("Ready for QA")
    static IN_QA = new Label_Label("In QA")
    static QA_PASSED = new Label_Label("QA Passed")

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

;// CONCATENATED MODULE: ./src/model/LabelerState.js


class LabelerState {
    static READY_FOR_REVIEW = new LabelerState("READY_FOR_REVIEW")
    static REVIEW_PASSED = new LabelerState("REVIEW_PASSED")
    static CHANGES_REQUESTED = new LabelerState("CHANGES_REQUESTED")
    static WORK_IN_PROGRESS = new LabelerState("WORK_IN_PROGRESS")

    constructor(name) {
        this.name = name
    }

    labels() {
        switch (this) {
            case LabelerState.READY_FOR_REVIEW:
                return [Label_Label.READY_FOR_REVIEW]
            case LabelerState.REVIEW_PASSED:
                return [Label_Label.REVIEW_PASSED, Label_Label.READY_FOR_QA]
            case LabelerState.CHANGES_REQUESTED:
                return [Label_Label.CHANGES_REQUESTED]
            case LabelerState.WORK_IN_PROGRESS:
                return [Label_Label.WORK_IN_PROGRESS]
        }
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
;// CONCATENATED MODULE: ./src/autolabel.js




const core = __nccwpck_require__(105);
const github = __nccwpck_require__(82);

async function run() {
    try {
        const token = core.getInput("repo-token", { required: true });
        const event = core.getInput("event", { required: true });

        const prNumber = getPrNumber();
        if (!prNumber) {
            console.log("Could not get pull request number from context, exiting");
            return;
        }

        const client = github.getOctokit(token);
        const state = await getLabelerState(client, prNumber)

        // Get the JSON webhook payload for the event that triggered the workflow
        const payload = JSON.stringify(github.context.payload, undefined, 2)
        console.log(`The event payload: ${payload}`);
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
    const reviews = await client.rest.pulls.listReviews({
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

async function getMergeState(client, prNumber) {
    const { data: pullRequest } = await client.rest.pulls.get({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: prNumber,
    });

    return pullRequest.state === "closed"
}

async function getLabelerState(client, prNumber) {
    let approvalStatus = await getApprovalStatus(client, prNumber)
    let isMerged = await getMergeState(client, prNumber)


    const { data: pullRequest } = await client.rest.pulls.get({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: prNumber,
    });


}

function updateLabels(client, prNumber, state) {
    let labelsToAdd = state.labels
    let labelsToRemove = Label.allCases().filter(label => !labelsToAdd.contains(label))
    addLabels(client, prNumber, labelsToAdd)
    removeLabels(client, prNumber, labelsToRemove)
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

;// CONCATENATED MODULE: ./src/index.js


run();
})();

module.exports = __webpack_exports__;
/******/ })()
;