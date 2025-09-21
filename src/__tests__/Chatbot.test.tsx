import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Chatbot from '../components/Chatbot';
import * as api from '../services/api';

jest.mock('../services/api');

const mockApi = api as jest.Mocked<typeof api>;

describe('Chatbot component', () => {
    const userId = 'test-user';

    beforeEach(() => {
        mockApi.chatWithArtisanAssistant.mockClear();
    });

    it('renders the initial state', () => {
        render(<Chatbot userId={userId} />);
        expect(screen.getByText('Kalakar AI Assistant')).toBeInTheDocument();
    });

    it('sends a message and displays the response', async () => {
        const botReply = 'Hello! How can I help you today?';
        mockApi.chatWithArtisanAssistant.mockResolvedValue({ success: true, reply: botReply });

        render(<Chatbot userId={userId} />);

        const input = screen.getByPlaceholderText('Ask a question...');
        const sendButton = screen.getByText('Send');

        fireEvent.change(input, { target: { value: 'Hello' } });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(screen.getByText('Hello')).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(screen.getByText(botReply)).toBeInTheDocument();
        });
    });
});
