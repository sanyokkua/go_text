import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import RootErrorBoundary from './RootErrorBoundary';

const ThrowingChild: React.FC = () => {
	throw new Error('Test render error');
}; // eslint-disable-line react/no-unstable-nested-components

describe('RootErrorBoundary', () => {
	it('renders children when there is no error', () => {
		render(
			<RootErrorBoundary>
				<span>Normal content</span>
			</RootErrorBoundary>,
		);
		expect(screen.getByText('Normal content')).toBeInTheDocument();
	});

	it('shows fallback UI when a child throws', () => {
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		render(
			<RootErrorBoundary>
				<ThrowingChild />
			</RootErrorBoundary>,
		);
		expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
		consoleSpy.mockRestore();
	});

	it('calls LogError when a child throws', async () => {
		const { LogError } = await import('../../wailsjs/runtime');
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		render(
			<RootErrorBoundary>
				<ThrowingChild />
			</RootErrorBoundary>,
		);
		expect(LogError).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});
