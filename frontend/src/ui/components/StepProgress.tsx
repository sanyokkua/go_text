import React from 'react';
import styles from './StepProgress.module.css';

interface StepProgressProps {
	currentGroupIndex: number | null;
	totalGroups: number | null;
	family: string | null;
}

const StepProgress: React.FC<StepProgressProps> = ({
	currentGroupIndex,
	totalGroups,
	family,
}) => {
	const label = family ? `Generating — ${family}` : 'Generating…';

	const stepLabel =
		currentGroupIndex !== null && totalGroups !== null
			? `Step ${currentGroupIndex + 1} of ${totalGroups}`
			: '';

	return (
		<div
			className={styles.container}
			role="status"
			aria-live="polite"
			aria-label={label}
		>
			<span className={styles.spinner} aria-hidden="true" />
			<div className={styles.text}>
				<span className={styles.label}>{label}</span>
				{stepLabel && <span className={styles.step}>{stepLabel}</span>}
			</div>
		</div>
	);
};

StepProgress.displayName = 'StepProgress';

export default StepProgress;
