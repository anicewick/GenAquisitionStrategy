// Model selector functionality
async function loadModels() {
    try {
        console.log('Loading available models...');
        const response = await fetch('/api/models');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Models loaded:', data.models);
        return data.models;
    } catch (error) {
        console.error('Error loading models:', error);
        showToast('error', 'Failed to load models. Please try again.');
        return null;
    }
}

async function getCurrentModel() {
    try {
        console.log('Getting current model...');
        const response = await fetch('/api/models/current');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Current model:', data);
        return data;
    } catch (error) {
        console.error('Error getting current model:', error);
        showToast('error', 'Failed to get current model.');
        return null;
    }
}

async function selectModel(provider, model) {
    try {
        console.log(`Selecting model: ${provider}/${model}`);
        const response = await fetch('/api/models/select', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ provider, model }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
            showToast('success', 'Model updated successfully');
            console.log('Model selection successful:', result);
        }
        return result;
    } catch (error) {
        console.error('Error selecting model:', error);
        showToast('error', 'Failed to update model. Please try again.');
        return null;
    }
}

function showToast(type, message) {
    const toast = document.getElementById('toast');
    const toastBody = toast.querySelector('.toast-body');
    const toastHeader = toast.querySelector('.toast-header strong');
    
    toastHeader.textContent = type === 'success' ? 'Success' : 'Error';
    toastBody.textContent = message;
    
    toast.classList.remove('bg-success', 'bg-danger', 'text-white');
    if (type === 'error') {
        toast.classList.add('bg-danger', 'text-white');
    } else {
        toast.classList.add('bg-success', 'text-white');
    }
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

async function updateModelOptions(models, currentModel, providerSelect, modelSelect) {
    if (!models || !providerSelect || !modelSelect) {
        console.error('Missing required parameters for updateModelOptions');
        return;
    }
    
    console.log('Updating model options...');
    
    // Clear existing options
    providerSelect.innerHTML = '<option value="" disabled>Select Provider</option>';
    modelSelect.innerHTML = '<option value="" disabled>Select Model</option>';
    
    // Add provider options
    Object.entries(models).forEach(([key, provider]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = provider.name;
        if (currentModel && key === currentModel.provider) {
            option.selected = true;
        }
        providerSelect.appendChild(option);
    });
    
    // Add model options for current provider
    if (currentModel && currentModel.provider && models[currentModel.provider]) {
        const versions = models[currentModel.provider].versions;
        Object.entries(versions).forEach(([key, model]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = model.name;
            if (key === currentModel.model) {
                option.selected = true;
            }
            modelSelect.appendChild(option);
        });
    }
    
    console.log('Model options updated');
}

async function initializeModelSelector() {
    console.log('Initializing model selector...');
    
    const providerSelect = document.getElementById('provider-select');
    const modelSelect = document.getElementById('model-select');
    
    if (!providerSelect || !modelSelect) {
        console.error('Model selector elements not found');
        return;
    }
    
    try {
        const models = await loadModels();
        const currentModel = await getCurrentModel();
        
        if (!models || !currentModel) {
            console.error('Failed to load models or current model');
            return;
        }
        
        console.log('Loaded models:', models);
        console.log('Current model:', currentModel);
        
        await updateModelOptions(models, currentModel, providerSelect, modelSelect);
        
        // Set up event listeners
        providerSelect.addEventListener('change', async (e) => {
            const provider = e.target.value;
            if (!provider || !models[provider]) return;
            
            console.log('Provider changed:', provider);
            
            // Update model options
            modelSelect.innerHTML = '<option value="" disabled>Select Model</option>';
            const versions = models[provider].versions;
            Object.entries(versions).forEach(([key, model]) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = model.name;
                modelSelect.appendChild(option);
            });
            
            // Select first model and update
            if (modelSelect.options.length > 1) {
                modelSelect.selectedIndex = 1;
                await selectModel(provider, modelSelect.value);
            }
        });
        
        modelSelect.addEventListener('change', async (e) => {
            const model = e.target.value;
            const provider = providerSelect.value;
            if (!model || !provider) return;
            
            console.log('Model changed:', model);
            await selectModel(provider, model);
        });
        
    } catch (error) {
        console.error('Error initializing model selector:', error);
        showToast('error', 'Failed to initialize model selector');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeModelSelector);
