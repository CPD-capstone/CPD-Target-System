const drillStatus = document.getElementById('drillStatus');
const targetFilters = document.querySelectorAll('.target-filter');
const targetViewButtons = document.querySelectorAll('.target-view-button');
const targetGrid = document.getElementById('targetGrid');
const targetStatusStorageKey = 'cpd-target-status';
const targetViewStorageKey = 'cpd-target-view';
const drillLibraryStorageKey = 'cpd-drill-library';
const activeDemoDrillStorageKey = 'cpd-active-demo-drill';
const pausedDemoDrillStorageKey = 'cpd-paused-demo-drill';
const defaultDrillLimit = 5;
let targetAssignmentDrills = {};
let activeDemoDrillId = localStorage.getItem(activeDemoDrillStorageKey) || '';
let activeDemoDrillPaused = localStorage.getItem(pausedDemoDrillStorageKey) === 'true';

const filterDefaultDrillEntries = (drills) => Object.fromEntries(
    Object.entries(drills || {}).filter(([drillId]) => {
        const match = String(drillId).match(/^database-drill-(\d+)$/);
        return !match || Number(match[1]) < defaultDrillLimit;
    })
);

const getSavedDrillLibrary = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(drillLibraryStorageKey) || '{}');
        return stored && typeof stored === 'object' && !Array.isArray(stored)
            ? filterDefaultDrillEntries(stored)
            : {};
    } catch (error) {
        return {};
    }
};

const getTargetDrillLibrary = (databaseDrills = []) => {
    const defaults = (Array.isArray(databaseDrills) ? databaseDrills : [])
        .slice(0, defaultDrillLimit)
        .filter((drill) => drill && typeof drill.drillName === 'string' && drill.drillName.trim())
        .map((drill, index) => [`database-drill-${index}`, {
            name: drill.drillName.trim(),
            sequence: Array.isArray(drill.sequence) ? drill.sequence : []
        }]);
    return { ...Object.fromEntries(defaults), ...getSavedDrillLibrary() };
};

// AI-assisted target availability workflow; include this change in the PR's AI-use disclosure.
const getSavedTargetStatus = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(targetStatusStorageKey) || '{}');
        return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    } catch (error) {
        return {};
    }
};

const saveTargetStatus = (status) => {
    localStorage.setItem(targetStatusStorageKey, JSON.stringify(status));
};

const syncDrillTargetsToTargetStatus = (drillId, targetNumbers) => {
    const assignedTargets = new Set(targetNumbers.map(String));
    const status = getSavedTargetStatus();

    Object.entries(status).forEach(([targetNumber, targetState]) => {
        const savedState = targetState && typeof targetState === 'object' && !Array.isArray(targetState)
            ? targetState
            : {};
        const activeDrillIds = new Set(
            (Array.isArray(savedState.activeDrillIds) ? savedState.activeDrillIds : []).map(String)
        );
        if (assignedTargets.has(targetNumber)) {
            activeDrillIds.add(String(drillId));
        } else {
            activeDrillIds.delete(String(drillId));
        }
        status[targetNumber] = { ...savedState, activeDrillIds: Array.from(activeDrillIds) };
    });

    assignedTargets.forEach((targetNumber) => {
        const targetState = status[targetNumber] && typeof status[targetNumber] === 'object' && !Array.isArray(status[targetNumber])
            ? status[targetNumber]
            : {};
        const activeDrillIds = new Set(
            (Array.isArray(targetState.activeDrillIds) ? targetState.activeDrillIds : []).map(String)
        );
        activeDrillIds.add(String(drillId));
        status[targetNumber] = { ...targetState, activeDrillIds: Array.from(activeDrillIds) };
    });

    saveTargetStatus(status);
};

const getDefectiveTargetNumbers = () => Object.entries(getSavedTargetStatus())
    .filter(([, state]) => state?.defective)
    .map(([targetNumber]) => Number(targetNumber))
    .filter((targetNumber) => Number.isInteger(targetNumber));
