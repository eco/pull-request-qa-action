import {Label} from "./Label";

export class QAStatus {
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