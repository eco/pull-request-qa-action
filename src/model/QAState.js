import {Label} from "./Label";

export class QAStatus {
    static READY_FOR_QA = new QAStatus("READY_FOR_QA")
    static IN_QA = new QAStatus("IN_QA")
    static QA_PASSED = new QAStatus("QA_PASSED")

    constructor(name) {
        this.name = name
    }

    label() {
        switch (this) {
            case QAStatus.READY_FOR_QA:
                return [Label.READY_FOR_QA]
            case QAStatus.IN_QA:
                return [Label.IN_QA]
            case QAStatus.QA_PASSED:
                return [Label.QA_PASSED]
        }
    }

    static fromLabels(labels) {
        switch (true) {
            case labels.includes(QAStatus.IN_QA.name):
                return QAStatus.IN_QA
            case labels.includes(QAStatus.QA_PASSED.name):
                return QAStatus.QA_PASSED
        }

        return QAStatus.READY_FOR_QA
    }


}