const drillStatus = document.getElementById('drillStatus');
const targetCards = document.querySelectorAll('.target-card');

const updateDrillStatus = () => {
    const hasRedTarget = document.querySelector('.target-card.is-red');
    drillStatus.classList.toggle('bg-danger', hasRedTarget !== null);
    drillStatus.classList.toggle('bg-primary', hasRedTarget === null);
    drillStatus.textContent = hasRedTarget !== null
        ? 'Pistol Drill in Progress'
        : 'There are no active drills';
};

targetCards.forEach((targetCard) => {
    targetCard.addEventListener('click', () => {
        const isRed = targetCard.classList.toggle('is-red');
        targetCard.setAttribute('aria-pressed', isRed);
        targetCard.setAttribute('aria-label', isRed ? 'Return target to green' : 'Mark target red');
        updateDrillStatus();
    });
});
