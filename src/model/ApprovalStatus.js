export class ApprovalStatus {
    static APPROVED = new ApprovalStatus("APPROVED")
    static CHANGES_REQUESTED = new ApprovalStatus("CHANGES_REQUESTED")
    static NEEDS_REVIEW = new ApprovalStatus("NEEDS_REVIEW")

    constructor(name) {
        this.name = name
    }
}