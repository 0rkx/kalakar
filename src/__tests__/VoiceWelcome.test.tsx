import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VoiceWelcome from '../components/VoiceWelcome';
import { Language } from '../types';

describe('VoiceWelcome component', () => {
    const mockOnContinue = jest.fn();
    const mockOnBack = jest.fn();
    const selectedLanguage: Language = { code: 'en', name: 'English' };

    beforeEach(() => {
        render(
            <VoiceWelcome
                selectedLanguage={selectedLanguage}
                onContinue={mockOnContinue}
                onBack={mockOnBack}
            />
        );
    });

    it('renders the welcome message', () => {
        expect(screen.getByText('Welcome to Kalakar!')).toBeInTheDocument();
        expect(screen.getByText('Listen to the welcome message in English.')).toBeInTheDocument();
    });

    it('calls onContinue when the continue button is clicked', () => {
        fireEvent.click(screen.getByText('Continue'));
        expect(mockOnContinue).toHaveBeenCalledTimes(1);
    });

    it('calls onBack when the back button is clicked', () => {
        fireEvent.click(screen.getByText('Back'));
        expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
});
