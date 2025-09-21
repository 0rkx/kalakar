import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TutorialsScreen from '../components/TutorialsScreen';

describe('TutorialsScreen component', () => {
    const mockOnBack = jest.fn();

    beforeEach(() => {
        render(<TutorialsScreen onBack={mockOnBack} />);
    });

    it('renders the tutorial titles', () => {
        expect(screen.getByText('How to list your product on Amazon')).toBeInTheDocument();
        expect(screen.getByText('How to create a listing on Etsy')).toBeInTheDocument();
        expect(screen.getByText('How to create a catalog on WhatsApp Business')).toBeInTheDocument();
    });

    it('expands a tutorial when clicked', () => {
        fireEvent.click(screen.getByText('How to list your product on Amazon'));
        expect(screen.getByText('1. Go to your Amazon Seller Central account.')).toBeInTheDocument();
    });

    it('calls onBack when the back button is clicked', () => {
        fireEvent.click(screen.getByText('arrow_back'));
        expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
});
