// AI-assisted: disposable records used only by browser workflows, independent of the site being upgraded.
module.exports = {
    schemaVersion: 1,
    qualifications: ['Pistol', 'Rifle', 'SWAT'],
    Officers: [{ Name: 'Browser fixture', BadgeNum: 801, pistolQualScores: [], rifleQualScores: [], swatQualScores: [] }],
    drills: [],
    targets: Array.from({ length: 20 }, (_, index) => ({ id: index + 1, working: true }))
};
