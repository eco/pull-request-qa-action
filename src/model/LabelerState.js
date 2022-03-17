import {Label} from "./Label";

export class LabelerState {
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
                return [Label.READY_FOR_REVIEW]
            case LabelerState.REVIEW_PASSED:
                return [Label.REVIEW_PASSED, Label.READY_FOR_QA]
            case LabelerState.CHANGES_REQUESTED:
                return [Label.CHANGES_REQUESTED]
            case LabelerState.WORK_IN_PROGRESS:
                return [Label.WORK_IN_PROGRESS]
        }
    }

}