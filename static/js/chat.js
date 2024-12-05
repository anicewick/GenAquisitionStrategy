document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const promptSelect = document.getElementById('promptSelect');
    const promptText = document.getElementById('promptText');
    const executePromptBtn = document.getElementById('executePromptBtn');
    const chatMessages = document.getElementById('chatMessages');
    const sendButton = document.getElementById('sendButton');
    const llmProvider = document.getElementById('llmProvider');

    let loadedPrompts = [];

    // Load prompts into select dropdown
    fetch('/prompts')
        .then(response => response.json())
        .then(data => {
            loadedPrompts = data.prompts;
            
            // Group prompts by category
            const promptsByCategory = loadedPrompts.reduce((acc, prompt) => {
                if (!acc[prompt.category]) {
                    acc[prompt.category] = [];
                }
                acc[prompt.category].push(prompt);
                return acc;
            }, {});

            // Clear and populate select
            promptSelect.innerHTML = '<option value="">Choose a prompt...</option>';

            // Add prompts grouped by category
            Object.entries(promptsByCategory).forEach(([category, prompts]) => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = category;

                prompts.forEach(prompt => {
                    const option = document.createElement('option');
                    option.value = prompt.id;
                    option.textContent = prompt.name;
                    optgroup.appendChild(option);
                });

                promptSelect.appendChild(optgroup);
            });
        })
        .catch(error => {
            console.error('Error loading prompts:', error);
            appendMessage('error', 'Failed to load prompts: ' + error.message);
        });

    // Handle prompt selection
    promptSelect.addEventListener('change', function() {
        const selectedPrompt = loadedPrompts.find(p => p.id === this.value);
        if (selectedPrompt) {
            promptText.value = selectedPrompt.prompt;
            executePromptBtn.disabled = false;
        } else {
            promptText.value = '';
            executePromptBtn.disabled = true;
        }
    });

    // Handle execute button click
    executePromptBtn.addEventListener('click', async function() {
        const selectedPrompt = loadedPrompts.find(p => p.id === promptSelect.value);
        if (!selectedPrompt) return;

        // Disable UI while processing
        executePromptBtn.disabled = true;
        executePromptBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Processing...';

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: promptText.value,
                    promptId: selectedPrompt.id,
                    includeSections: true,
                    includeDocuments: true
                })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            // Add AI response to chat
            appendMessage('assistant', data.response);

            // If there's a target section, suggest updating it
            if (data.targetSection) {
                appendMessage('system', `Would you like to update the "${data.targetSection}" section with this response?`);
            }

        } catch (error) {
            console.error('Execute error:', error);
            appendMessage('error', 'Error: ' + error.message);
        } finally {
            // Re-enable execute button
            executePromptBtn.disabled = false;
            executePromptBtn.innerHTML = '<i class="bi bi-play-fill"></i> Execute Prompt';
        }
    });

    // Handle chat form submission
    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const message = messageInput.value.trim();
        if (!message) return;

        // Disable input and button while processing
        messageInput.disabled = true;
        sendButton.disabled = true;

        try {
            // Append user message
            appendMessage('user', message);

            // Get selected LLM provider
            const provider = llmProvider.value;

            // Send message to backend
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    provider: provider
                })
            });

            const data = await response.json();

            if (data.error) {
                appendMessage('error', `Error: ${data.error}`);
            } else {
                appendMessage('assistant', data.response);
            }

        } catch (error) {
            console.error('Error:', error);
            appendMessage('error', `Error: ${error.message}`);
        } finally {
            // Re-enable input and button
            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.value = '';
            messageInput.focus();
        }
    });

    // Helper function to append messages to the chat
    function appendMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}-message`;
        
        const iconMap = {
            'user': 'bi-person-circle',
            'assistant': 'bi-robot',
            'system': 'bi-info-circle',
            'error': 'bi-exclamation-triangle-fill'
        };

        messageDiv.innerHTML = `
            <div class="message-header">
                <i class="bi ${iconMap[role]}"></i>
                <span>${
                    role === 'user' ? 'You' : 
                    role === 'assistant' ? 'AI Assistant' : 
                    role === 'system' ? 'System' : 'Error'
                }</span>
            </div>
            <div class="message-content">
                ${role === 'error' ? content : marked.parse(content)}
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});
