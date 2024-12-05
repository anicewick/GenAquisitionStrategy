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
    currentProvider: null,
    currentModel: null,
    
    initializeLLMInterface: function() {
        console.log('Initializing LLM interface...');
        this.loadCurrentModel();
    },

    loadCurrentModel: async function() {
        try {
            const response = await fetch('/api/models/current');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.onModelChange(data.provider, data.version);
        } catch (error) {
            console.error('Error loading current model:', error);
        }
    },

    onModelChange: function(provider, model) {
        console.log('Model changed:', provider, model);
        this.currentProvider = provider;
        this.currentModel = model;
        
        sessionStorage.setItem('selectedProvider', provider);
        sessionStorage.setItem('selectedModel', model);
        
        if (window.clearChat) {
            window.clearChat();
        }

        this.updateModelInfo();
    },

    updateModelInfo: function() {
        const config = llmConfigs[this.currentProvider];
        if (config) {
            const modelInfo = `
                Provider: ${config.name}
                Model: ${this.currentModel}
                Context: ${config.contextWindow}
                Capabilities: ${config.capabilities.join(', ')}
            `;
            console.log('Model info updated:', modelInfo);
        }
    },

    sendMessageToLLM: async function(message, promptId = null) {
        try {
            if (!this.currentProvider || !this.currentModel) {
                throw new Error('No model selected');
            }

            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    provider: this.currentProvider,
                    model: this.currentModel,
                    prompt_id: promptId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }
};

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing LLM Interface...');
    window.llmInterface.initializeLLMInterface();
});