// Gemini API Service for BankPro Support Chatbot
const GEMINI_API_KEY = 'AIzaSyDUMMY_KEY_FOR_DEMO'; // Replace with actual API key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export const sendMessageToGemini = async (message, userContext = {}) => {
    try {
        const systemPrompt = `You are BankPro Assistant, a helpful banking customer support chatbot. You help customers with:

BANKING SERVICES:
- Account balance inquiries
- Money transfers and payments
- Card management (debit/credit cards, PIN issues)
- Transaction history and statements
- Bill payments and recurring payments
- Loan and credit information
- Security and fraud concerns
- Branch locations and hours

RESPONSE GUIDELINES:
- Be friendly, professional, and helpful
- Provide accurate banking information
- For security-sensitive topics, advise contacting support
- Keep responses concise but informative
- Use simple language
- If you don't know something, direct to human support
- Always prioritize customer security and privacy

CONTACT INFORMATION:
- Phone: 1-800-BANK-HELP (24/7)
- Email: support@bankpro.com
- Emergency: 1-800-BANK-SECURE
- Business Hours: Mon-Fri 9AM-9PM EST

Current user context: ${JSON.stringify(userContext)}

User message: ${message}`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: systemPrompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                },
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('Invalid response format from Gemini API');
        }

    } catch (error) {
        console.error('Gemini API Error:', error);

        // Fallback responses for common scenarios
        const fallbackResponses = {
            balance: "To check your account balance, please log in to your account dashboard or contact our support team at 1-800-BANK-HELP.",
            transfer: "You can transfer money securely using our Transfer Money feature in the app. For assistance, call 1-800-BANK-HELP.",
            card: "For card-related issues, please contact our 24/7 support line at 1-800-BANK-HELP.",
            security: "Security is our top priority. If you suspect any unauthorized activity, please contact us immediately at 1-800-BANK-SECURE.",
            default: "I'm here to help! For specific banking assistance, please contact our customer support team at 1-800-BANK-HELP or email support@bankpro.com."
        };

        const message = message.toLowerCase();
        if (message.includes('balance')) return fallbackResponses.balance;
        if (message.includes('transfer') || message.includes('send')) return fallbackResponses.transfer;
        if (message.includes('card') || message.includes('pin')) return fallbackResponses.card;
        if (message.includes('security') || message.includes('fraud')) return fallbackResponses.security;

        return fallbackResponses.default;
    }
};
