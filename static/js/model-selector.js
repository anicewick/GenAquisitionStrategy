// Model selector functionality
console.log('[MODEL-SELECTOR] Script loading...');

class ModelSelector {
    constructor() {
        // Singleton pattern
        if (ModelSelector.instance) {
            console.log('[MODEL-SELECTOR] Instance already exists, returning existing instance');
            return ModelSelector.instance;
        }
        
        console.log('[MODEL-SELECTOR] Constructor called');
        this.initialized = false;
        this.currentModel = null;
        this.models = [];
        this.modelSelect = null;
        this.initializeWhenReady();
        
        ModelSelector.instance = this;
    }

    initializeWhenReady() {
        console.log('[MODEL-SELECTOR] Waiting for DOM...');
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    async initialize() {
        console.log('[MODEL-SELECTOR] Initializing...');
        try {
            // Wait a bit to ensure DOM is fully loaded
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Find elements
            this.modelSelect = document.getElementById('modelSelect');
            
            if (!this.modelSelect) {
                console.error('[MODEL-SELECTOR] Model select element not found, retrying...');
                throw new Error('Required elements not found');
            }

            console.log('[MODEL-SELECTOR] Found elements:', {
                model: this.modelSelect
            });

            // First load current model
            await this.loadCurrentModel();
            
            // Then load available models
            await this.loadModels();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('[MODEL-SELECTOR] Initialization complete');
            
        } catch (error) {
            console.error('[MODEL-SELECTOR] Initialization failed:', error);
            // Retry initialization after a delay if not initialized
            if (!this.initialized) {
                setTimeout(() => this.initialize(), 1000);
            }
        }
    }

    setupEventListeners() {
        this.modelSelect.addEventListener('change', () => {
            const [provider, model] = this.modelSelect.value.split('|');
            console.log('[MODEL-SELECTOR] Model changed:', { provider, model });
            if (provider && model) {
                this.selectModel(provider, model);
            }
        });
    }

    async loadCurrentModel() {
        try {
            console.log('[MODEL-SELECTOR] Getting current model...');
            const response = await fetch('/api/models/current');
            if (!response.ok) {
                throw new Error('Failed to fetch current model');
            }
            
            const data = await response.json();
            console.log('[MODEL-SELECTOR] Received current model data:', data);
            
            this.currentModel = data;
            
        } catch (error) {
            console.error('[MODEL-SELECTOR] Failed to load current model:', error);
            throw error;
        }
    }

    async loadModels() {
        try {
            console.log('[MODEL-SELECTOR] Loading models...');
            const response = await fetch('/api/models');
            if (!response.ok) {
                console.error('[MODEL-SELECTOR] Failed to fetch models:', response.status, response.statusText);
                throw new Error('Failed to fetch models');
            }
            
            const data = await response.json();
            console.log('[MODEL-SELECTOR] Raw models data:', JSON.stringify(data, null, 2));
            
            this.models = data;
            console.log('[MODEL-SELECTOR] Parsed models:', this.models);
            
            // Update UI with loaded data
            this.updateModelOptions();
            
        } catch (error) {
            console.error('[MODEL-SELECTOR] Failed to load models:', error);
            throw error;
        }
    }

    updateModelOptions() {
        console.log('[MODEL-SELECTOR] Updating model options with:', this.models);
        console.log('[MODEL-SELECTOR] Current model:', this.currentModel);
        
        if (!this.models || this.models.length === 0) {
            console.error('[MODEL-SELECTOR] No models available');
            return;
        }
        
        // Create combined options
        const options = `
            <option value="" disabled>Select Model</option>
            ${this.models.map(model => {
                const value = `${model.provider}|${model.name}`;
                const selected = (model.provider === this.currentModel?.provider && 
                                model.name === this.currentModel?.version) ? 'selected' : '';
                return `<option value="${value}" ${selected}>${model.provider} - ${model.name}</option>`;
            }).join('')}
        `;
        
        console.log('[MODEL-SELECTOR] Setting model options HTML:', options);
        this.modelSelect.innerHTML = options;
    }

    async selectModel(provider, model) {
        try {
            console.log('[MODEL-SELECTOR] Selecting model:', { provider, model });
            const response = await fetch('/api/models/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, model })
            });
            
            if (!response.ok) {
                throw new Error('Failed to select model');
            }
            
            const result = await response.json();
            console.log('[MODEL-SELECTOR] Model selection result:', result);
            
            // Update current model
            this.currentModel = { provider, version: model };
            
            // Notify LLM interface
            if (window.llmInterface) {
                window.llmInterface.onModelChange(provider, model);
            }
            
        } catch (error) {
            console.error('[MODEL-SELECTOR] Failed to select model:', error);
        }
    }
}

// Export the class for use in other files
window.ModelSelector = ModelSelector;