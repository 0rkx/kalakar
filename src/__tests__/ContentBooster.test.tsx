import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContentBooster from '../components/ContentBooster';
import * as api from '../services/api';

jest.mock('../services/api');

const mockApi = api as jest.Mocked<typeof api>;

describe('ContentBooster component', () => {
    const mockOnBack = jest.fn();
    const userId = 'test-user';

    beforeEach(() => {
        mockApi.generateSocialContent.mockClear();
    });

    it('renders the initial state with a generate button', () => {
        render(<ContentBooster userId={userId} onBack={mockOnBack} />);
        expect(screen.getByText('Generate Content')).toBeInTheDocument();
    });

    it('calls the api and displays content when the generate button is clicked', async () => {
        const mockSocialContent = {
            socialPosts: ['Post 1'],
            shortAds: ['Ad 1'],
            storySnippets: ['Snippet 1'],
        };
        mockApi.generateSocialContent.mockResolvedValue({ success: true, socialContent: mockSocialContent });

        render(<ContentBooster userId={userId} onBack={mockOnBack} />);
        fireEvent.click(screen.getByText('Generate Content'));

        expect(screen.getByText('Generating...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Post 1')).toBeInTheDocument();
            expect(screen.getByText('Ad 1')).toBeInTheDocument();
            expect(screen.getByText('Snippet 1')).toBeInTheDocument();
        });
    });
});
