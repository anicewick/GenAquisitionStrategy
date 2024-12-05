// LLM Provider configurations
const llmConfigs = {
    claude: {
        name: 'Claude (Anthropic)',
        model: 'claude-3-sonnet-20240229',
        contextWindow: '200k tokens',
        capabilities: ['Chat', 'Document Analysis', 'Code Generation']
    },
    openai: {
        name: 'GPT-4 (OpenAI)',
        model: 'gpt-4-turbo-preview',
        contextWindow: '128k tokens',
        capabilities: ['Chat', 'Document Analysis', 'Code Generation']
    },
    meta: {
        name: 'Llama-2 (Meta)',
        model: 'llama-2-70b-chat',
        contextWindow: '4k tokens',
        capabilities: ['Chat', 'Document Analysis']
    },
    google: {
        name: 'Gemini (Google)',
        model: 'gemini-pro',
        contextWindow: '32k tokens',
        capabilities: ['Chat', 'Document Analysis']
    }
};

// Create global LLM interface object
window.llmInterface = {
    configs: llmConfigs,
    
    // Initialize LLM interface
    initializeLLMInterface: function() {
        const providerSelect = document.getElementById('llmProvider');
        const modelInfo = document.getElementById('modelInfo');

        if (!providerSelect || !modelInfo) {
            console.error('Required elements not found for LLM interface');
            return;
        }

        // Update model info when provider changes
        function updateModelInfo(provider) {
            const config = llmConfigs[provider];
            if (config) {
                modelInfo.innerHTML = `
                    <span title="Model: ${config.model}&#10;Context: ${config.contextWindow}&#10;Capabilities: ${config.capabilities.join(', ')}">
                        <i class="bi bi-info-circle"></i>
                    </span>
                `;
            }
        }

        // Handle provider change
        providerSelect.addEventListener('change', (e) => {
            const selectedProvider = e.target.value;
            updateModelInfo(selectedProvider);
            
            // Store the selected provider in session storage
            sessionStorage.setItem('selectedProvider', selectedProvider);
            
            // Clear the chat to start fresh with new provider
            if (window.clearChat) {
                window.clearChat();
            }
        });

        // Set initial provider from session storage or default to claude
        const savedProvider = sessionStorage.getItem('selectedProvider') || 'claude';
        providerSelect.value = savedProvider;
        updateModelInfo(savedProvider);
    },

    // Send message to LLM
    sendMessageToLLM: async function(message, provider, promptId = null) {
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    provider: provider,
                    prompt_id: promptId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },

    // Get provider configuration
    getProviderConfig: function(provider) {
        return llmConfigs[provider];
    }
};

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing LLM Interface...');
    window.llmInterface.initializeLLMInterface();
});
