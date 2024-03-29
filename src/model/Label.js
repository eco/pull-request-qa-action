export class Label {
    static READY_FOR_REVIEW = new Label("Ready for review")
    static REVIEW_PASSED = new Label("Review passed")
    static CHANGES_REQUESTED = new Label("Changes requested")
    static WORK_IN_PROGRESS = new Label("Work in progress")
    static READY_FOR_QA = new Label("Ready for QA")
    static IN_QA = new Label("In QA")
    static QA_PASSED = new Label("QA passed")
    static QA_FAILED = new Label("QA failed")
    static NEEDS_DESIGN_REVIEW = new Label("Needs Design Review")

    constructor(name) {
        this.name = name
    }

    static allCases() {
        return [
            this.READY_FOR_REVIEW,
            this.REVIEW_PASSED,
            this.READY_FOR_QA,
            this.WORK_IN_PROGRESS,
            this.IN_QA,
            this.QA_PASSED,
            this.QA_FAILED,
            this.NEEDS_DESIGN_REVIEW
        ]
    }

}
