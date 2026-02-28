const generateAutoResponse = (userMessage) => {
    const message = userMessage.toLowerCase();

    if (message.includes('balance') || message.includes('check my balance')) {
        return "I can help you check your account balance. For security reasons, please log into your account dashboard to view your current balance. If you're having trouble accessing your account, I can guide you through the login process.";
    }

    if (message.includes('transfer') || message.includes('send money')) {
        return "To transfer money, you can use our Transfer Money feature in your dashboard. You'll need the recipient's account number or phone number. The transfer limit is $10,000 per day. Would you like me to guide you through the process?";
    }

    if (message.includes('card') || message.includes('pin') || message.includes('not working')) {
        return "I understand you're having card issues. For immediate assistance with lost, stolen, or malfunctioning cards, please call our 24/7 card services at 1-800-BANK-SECURE. I can also help you temporarily freeze your card through your account settings.";
    }

    if (message.includes('loan') || message.includes('credit')) {
        return "I'd be happy to help with loan information. We offer personal loans, auto loans, and home mortgages with competitive rates. You can view current rates and apply online through your dashboard. What type of loan are you interested in?";
    }

    if (message.includes('security') || message.includes('fraud') || message.includes('suspicious')) {
        return "Security is our top priority. If you suspect fraudulent activity, please call our fraud hotline immediately at 1-800-BANK-SECURE. I can also help you review recent transactions and set up account alerts.";
    }

    if (message.includes('branch') || message.includes('atm') || message.includes('location')) {
        return "You can find nearby branches and ATMs using our Branch Locator feature in your dashboard. Most branches are open Mon-Fri 9AM-5PM, Saturday 9AM-2PM. ATMs are available 24/7. Would you like me to help you find the nearest location?";
    }

    if (message.includes('hello') || message.includes('hi') || message.includes('help')) {
        return "Hello! I'm here to help you with your banking needs. I can assist with account inquiries, transfers, card issues, loan information, and more. What can I help you with today?";
    }

    if (message.includes('thank') || message.includes('thanks')) {
        return "You're welcome! I'm glad I could help. If you have any other questions or need further assistance, please don't hesitate to ask. Have a great day!";
    }

    return "Thank you for contacting BankPro support. I've received your message and will do my best to assist you. For complex issues or immediate assistance, you can also call our 24/7 support line at 1-800-BANK-HELP or visit your nearest branch.";
};

module.exports = {
    generateAutoResponse
};
