// AI-assisted (Codex): the release gate requires a passing browser run in each configured project.
module.exports = class BrowserResults {
    onBegin(config, suite) {
        this.projects = config.projects;
        this.suite = suite;
    }

    async onEnd(result) {
        if (result.status !== 'passed') return;
        const missing = new Set(this.projects.map(project => project.name));
        const incomplete = [];
        for (const test of this.suite.allTests()) {
            missing.delete(test.parent.project().name);
            if (test.outcome() !== 'expected' || test.results.at(-1)?.status !== 'passed') {
                incomplete.push(test.titlePath().filter(Boolean).join(' > '));
            }
        }
        for (const name of missing) console.error(`No browser tests ran for release project ${name}`);
        for (const title of incomplete) console.error(`Release test did not pass: ${title}`);
        if (missing.size || incomplete.length) return { status: 'failed' };
    }
};
