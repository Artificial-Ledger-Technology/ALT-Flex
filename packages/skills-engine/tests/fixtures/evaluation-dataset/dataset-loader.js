"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDataset = loadDataset;
const fs_1 = require("fs");
const path_1 = require("path");
const url_1 = require("url");
const core_1 = require("@aegis/core");
/**
 * Maps ground truth label strings to SafetyLabel enum values.
 */
function mapLabel(label) {
    switch (label) {
        case 'SAFE':
            return core_1.SafetyLabel.SAFE;
        case 'SUSPICIOUS':
            return core_1.SafetyLabel.SUSPICIOUS;
        case 'MALICIOUS':
            return core_1.SafetyLabel.MALICIOUS;
        default:
            throw new Error(`Unknown ground truth label: ${label}`);
    }
}
/**
 * Loads the complete evaluation dataset from disk.
 *
 * Reads the manifest.json, then loads each referenced sample file
 * and attaches its content to the returned EvaluationSample objects.
 *
 * @param datasetDir — Absolute path to the evaluation-dataset directory.
 *                     Defaults to the directory containing this file.
 * @returns The fully loaded EvaluationDataset.
 */
function loadDataset(datasetDir) {
    const baseDir = datasetDir ?? (0, path_1.dirname)((0, url_1.fileURLToPath)(import.meta.url));
    const manifestPath = (0, path_1.join)(baseDir, 'manifest.json');
    const manifestRaw = (0, fs_1.readFileSync)(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestRaw);
    const samples = manifest.samples.map((entry) => {
        const samplePath = (0, path_1.join)(baseDir, entry.filePath);
        const content = (0, fs_1.readFileSync)(samplePath, 'utf-8');
        return {
            id: entry.id,
            filePath: entry.filePath,
            groundTruthLabel: mapLabel(entry.groundTruthLabel),
            category: entry.category,
            description: entry.description,
            rationale: entry.rationale,
            expectedRuleMatches: entry.expectedRuleMatches,
            labelerConfidence: entry.labelerConfidence,
            format: entry.format,
            content,
        };
    });
    return {
        version: manifest.version,
        generatedAt: manifest.generatedAt,
        labeler: manifest.labeler,
        totalSamples: manifest.totalSamples,
        distribution: manifest.distribution,
        samples,
    };
}
//# sourceMappingURL=dataset-loader.js.map