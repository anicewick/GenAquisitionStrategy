// Helper function to debounce input events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Load prompts into the repository
async function loadPromptRepository() {
    console.log('Loading prompt repository...');
    try {
        console.log('Fetching prompts from /prompts endpoint...');
        const response = await fetch('/prompts');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Prompts data:', data);

        // Find the prompt select element
        const promptSelect = document.querySelector('#prompt-select');
        console.log('Found prompt select element:', promptSelect);

        if (!promptSelect) {
            console.error('Could not find element with id "prompt-select"');
            showError('Could not find prompt selection element');
            return;
        }

        // Clear existing options
        promptSelect.innerHTML = '<option value="">Select a prompt...</option>';
        console.log('Cleared existing options');

        // Add prompts to select, grouped by category
        if (data && data.prompts && Array.isArray(data.prompts)) {
            // Create category groups
            const categories = {};
            data.prompts.forEach(prompt => {
                if (!prompt.category || !prompt.id || !prompt.name) {
                    console.warn('Skipping invalid prompt:', prompt);
                    return;
                }
                const category = prompt.category || 'Uncategorized';
                if (!categories[category]) {
                    categories[category] = [];
                }
                categories[category].push(prompt);
            });

            // Sort categories
            const sortedCategories = Object.keys(categories).sort();
            console.log('Categories found:', sortedCategories);

            // Add prompts by category
            sortedCategories.forEach(category => {
                // Create optgroup for category
                const optgroup = document.createElement('optgroup');
                optgroup.label = category;
                
                // Sort prompts within category
                const sortedPrompts = categories[category].sort((a, b) => 
                    a.name.localeCompare(b.name)
                );

                // Add prompts in this category
                sortedPrompts.forEach(prompt => {
                    console.log(`Adding prompt: ${prompt.name} (${prompt.id}) to ${category}`);
                    const option = document.createElement('option');
                    option.value = prompt.id;
                    option.textContent = prompt.name;
                    optgroup.appendChild(option);
                });
                
                promptSelect.appendChild(optgroup);
            });
            
            console.log(`Added ${data.prompts.length} prompts in ${sortedCategories.length} categories`);
            
            // If there are no prompts, show an error
            if (sortedCategories.length === 0) {
                console.error('No prompts found in data');
                showError('No prompts available');
            }
        } else {
            console.error('Invalid prompts data format:', data);
            showError('Invalid prompts data received from server');
        }
    } catch (error) {
        console.error('Error loading prompts:', error);
        showError('Failed to load prompts: ' + error.message);
    }
}

// Handle prompt selection
function handlePromptSelection() {
    const promptSelect = document.querySelector('#prompt-select');
    if (!promptSelect) {
        console.error('Could not find prompt select element');
        return;
    }

    promptSelect.addEventListener('change', async function() {
        try {
            const selectedPromptId = this.value;
            if (!selectedPromptId) {
                console.log('No prompt selected');
                return;
            }

            console.log('Selected prompt ID:', selectedPromptId);
            const response = await fetch(`/prompt/${selectedPromptId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Full prompt data:', data);

            if (data.error) {
                throw new Error(data.error);
            }

            // Update the chat input with the selected prompt
            const chatInput = document.querySelector('#message');  
            if (chatInput) {
                chatInput.value = data.prompt || '';
                // Trigger input event to adjust textarea height
                chatInput.dispatchEvent(new Event('input'));
            } else {
                console.error('Could not find chat input element with id "message"');
            }
        } catch (error) {
            showError('Failed to load selected prompt');
            console.error('Error handling prompt selection:', error);
        }
    });
}

// Initialize chat functionality
function initializeChat() {
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('message');
    const sendButton = document.getElementById('sendButton');
    const includeSectionsCheckbox = document.getElementById('includeSections');

    if (!chatMessages || !chatForm || !chatInput || !sendButton) {
        console.error('Required chat elements not found');
        return;
    }

    function appendMessage(role, content, targetSection = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        if (typeof content === 'string') {
            if (content.includes('loading')) {
                messageDiv.innerHTML = content;
            } else {
                const md = new markdownit();
                messageDiv.innerHTML = md.render(content);
                
                // Add "Load into Section" button for assistant messages
                if (role === 'assistant') {
                    const loadButton = document.createElement('button');
                    loadButton.className = 'btn btn-sm btn-outline-primary mt-2';
                    loadButton.innerHTML = '<i class="bi bi-arrow-right-square"></i> Load into Section';
                    
                    // Create a select element for sections
                    const sectionSelect = document.createElement('select');
                    sectionSelect.className = 'form-select form-select-sm d-inline-block ms-2';
                    sectionSelect.style.width = 'auto';
                    
                    // Add available sections
                    const sections = ['system', 'user', 'assistant'];
                    sections.forEach(section => {
                        const option = document.createElement('option');
                        option.value = section;
                        option.textContent = section.charAt(0).toUpperCase() + section.slice(1);
                        sectionSelect.appendChild(option);
                    });
                    
                    loadButton.onclick = () => {
                        const selectedSection = sectionSelect.value;
                        if (selectedSection) {
                            // Get the text content without the HTML formatting
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = content;
                            const textContent = tempDiv.textContent;
                            loadResponseIntoSection(textContent, selectedSection);
                        }
                    };
                    
                    const buttonContainer = document.createElement('div');
                    buttonContainer.className = 'mt-2';
                    buttonContainer.appendChild(loadButton);
                    buttonContainer.appendChild(sectionSelect);
                    messageDiv.appendChild(buttonContainer);
                }
            }
        } else {
            messageDiv.textContent = content;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv;
    }

    async function handleChatSubmit(event) {
        event.preventDefault();
        
        const messageInput = document.getElementById('message');
        const message = messageInput.value.trim();
        const provider = document.getElementById('llmProvider').value;
        const promptId = document.getElementById('prompt-select')?.value;
        
        if (!message) return;
        
        // Add user message to chat
        appendMessage('user', message);
        messageInput.value = '';
        
        try {
            // Show loading indicator
            const loadingMessage = appendMessage('assistant', '<div class="loading">Thinking...</div>');
            
            // Send message to selected LLM provider
            const response = await window.llmInterface.sendMessageToLLM(message, provider, promptId);
            
            // Remove loading indicator
            loadingMessage.remove();
            
            // Check for error in response
            if (response.error) {
                throw new Error(response.error);
            }
            
            // Check if response has the expected structure
            if (!response.response) {
                throw new Error('Invalid response format from server');
            }
            
            // Display the AI's response with target section if available
            appendMessage('assistant', response.response, response.targetSection);
            
        } catch (error) {
            console.error('Chat error:', error);
            showError(`Failed to get response: ${error.message}`);
        }
    }

    chatForm.addEventListener('submit', handleChatSubmit);
    sendButton.addEventListener('click', handleChatSubmit);
    
    chatInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleChatSubmit(event);
        }
    });
}

// Make clearChat function globally available
window.clearChat = function() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
};

// File upload initialization function
function initializeFileUpload() {
    // File upload handling
    const uploadForm = document.getElementById('uploadForm');
    const fileList = document.getElementById('fileList');
    const documentUpload = document.getElementById('documentUpload');

    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData();
        const file = documentUpload.files[0];
        
        if (!file) {
            alert('Please select a file first');
            return;
        }

        formData.append('file', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            if (response.ok) {
                addFileToList(file.name);
                documentUpload.value = '';
            } else {
                alert(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Upload failed');
        }
    });

    function addFileToList(fileName) {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        
        // Create text span
        const textSpan = document.createElement('span');
        textSpan.textContent = fileName;
        li.appendChild(textSpan);
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.onclick = async () => {
            try {
                const response = await fetch(`/delete_document/${encodeURIComponent(fileName)}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    li.remove();
                    showSuccess('File removed successfully');
                } else {
                    const data = await response.json();
                    showError(data.error || 'Failed to remove file');
                }
            } catch (error) {
                console.error('Error:', error);
                showError('Failed to remove file');
            }
        };
        li.appendChild(deleteBtn);
        
        fileList.appendChild(li);
    }
}

// Document management initialization function
function initializeDocumentManagement() {
    // Section content handling
    const sectionTextareas = document.querySelectorAll('.section-content');
    
    sectionTextareas.forEach(textarea => {
        textarea.addEventListener('input', debounce(async function() {
            const section = this.dataset.section;
            const content = this.value;

            try {
                await fetch('/update_section', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        section,
                        content
                    })
                });
                updateRequiredDocuments();
            } catch (error) {
                console.error('Error saving section:', error);
            }
        }, 1000));
    });

    async function updateRequiredDocuments() {
        try {
            const response = await fetch('/get_required_documents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            
            const requiredDocsContainer = document.getElementById('requiredDocuments');
            requiredDocsContainer.innerHTML = '';

            data.documents.forEach(doc => {
                const docDiv = document.createElement('div');
                docDiv.className = 'document-item';
                docDiv.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <span>${doc.name}</span>
                        <span>${doc.applicability}%</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" 
                             style="width: ${doc.applicability}%" 
                             aria-valuenow="${doc.applicability}" 
                             aria-valuemin="0" 
                             aria-valuemax="100"></div>
                    </div>
                `;
                requiredDocsContainer.appendChild(docDiv);
            });
        } catch (error) {
            console.error('Error updating required documents:', error);
        }
    }

    function findRelevantSections(response) {
        const sections = Array.from(document.querySelectorAll('.section-content'))
            .map(textarea => textarea.dataset.section);
        
        // Convert response and sections to lowercase for case-insensitive matching
        const lowerResponse = response.toLowerCase();
        return sections.filter(section => {
            const keywords = section.toLowerCase().split(' ');
            return keywords.some(keyword => lowerResponse.includes(keyword));
        });
    }

    function addToSection(content, sectionName) {
        const sectionTextarea = document.querySelector(`textarea[data-section="${sectionName}"]`);
        if (sectionTextarea) {
            // Append to the section
            sectionTextarea.value = sectionTextarea.value ? 
                sectionTextarea.value + '\n\n' + content :
                content;
            // Open the section accordion
            const sectionId = sectionTextarea.closest('.accordion-collapse').id;
            const accordionCollapse = new bootstrap.Collapse(document.getElementById(sectionId));
            accordionCollapse.show();
        }
    }

    async function loadDocument() {
        try {
            const response = await fetch('/get_document');
            if (!response.ok) throw new Error('Failed to fetch document');
            
            const document = await response.json();
            
            // Update each section's content
            document.sections.forEach(section => {
                const textarea = document.querySelector(`.section-content[data-section="${section.title}"]`);
                if (textarea) {
                    textarea.value = section.content;
                    // Ensure textarea is enabled
                    textarea.disabled = false;
                    textarea.readOnly = false;
                    // Trigger input event for any height adjustments
                    const inputEvent = new Event('input');
                    textarea.dispatchEvent(inputEvent);
                }
            });
        } catch (error) {
            console.error('Error loading document:', error);
            showError('Failed to load document content');
        }
    }
}

// Version control initialization function
function initializeVersionControl() {
    console.log('Initializing version control...');
    const saveVersionBtn = document.getElementById('saveVersion');
    const loadVersionBtn = document.getElementById('loadVersion');
    const printDocumentBtn = document.getElementById('printDocument');
    const versionsList = document.getElementById('versionsList');
    const versionModal = document.getElementById('versionModal');

    if (!saveVersionBtn || !loadVersionBtn || !printDocumentBtn || !versionsList || !versionModal) {
        console.log('Some version control elements not found, may be in a different tab');
        return; // Return gracefully instead of throwing error
    }

    // Initialize Bootstrap modal
    const versionModalInstance = new bootstrap.Modal(versionModal);
    const versionNameInput = document.getElementById('versionName');
    const confirmSaveVersionBtn = document.getElementById('confirmSaveVersion');

    // Function to generate default filename with timestamp
    function generateDefaultFilename() {
        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/[:-]/g, '') // Remove colons and hyphens
            .replace(/\..+/, '')  // Remove milliseconds
            .replace('T', '-');   // Replace T with hyphen
        return `AS-${timestamp}`;
    }

    // Load document version
    async function loadVersionsList() {
        try {
            const response = await fetch('/list_versions');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            const versionsList = document.getElementById('versionsList');
            if (!versionsList) {
                throw new Error('Versions list element not found');
            }
            
            // Clear existing versions
            versionsList.innerHTML = '';
            
            if (!data.versions || data.versions.length === 0) {
                versionsList.innerHTML = '<div class="list-group-item">No saved versions found</div>';
                return;
            }
            
            // Add versions to the list
            data.versions.forEach(version => {
                const item = document.createElement('div');
                item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
                item.innerHTML = `
                    <span class="version-name" style="cursor: pointer">${version}</span>
                    <button class="btn btn-sm btn-danger delete-version" data-version="${version}">
                        <i class="bi bi-trash"></i>
                    </button>
                `;
                
                // Add click handler for loading version
                const versionName = item.querySelector('.version-name');
                versionName.addEventListener('click', () => {
                    loadSavedVersion(version);
                });
                
                // Add click handler for delete button
                const deleteBtn = item.querySelector('.delete-version');
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete version "${version}"?`)) {
                        await deleteVersion(version);
                        // Refresh the list after deletion
                        loadVersionsList();
                    }
                });
                
                versionsList.appendChild(item);
            });
        } catch (error) {
            console.error('Error loading versions list:', error);
            showError(`Failed to load versions list: ${error.message}`);
        }
    }

    // Delete version
    async function deleteVersion(version) {
        try {
            const response = await fetch(`/delete_version/${version}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            showSuccess(`Version "${version}" deleted successfully`);
        } catch (error) {
            console.error('Error deleting version:', error);
            showError(`Failed to delete version: ${error.message}`);
            throw error; // Re-throw to handle in calling function
        }
    }

    // Version control and printing
    if (saveVersionBtn) {
        saveVersionBtn.addEventListener('click', async function() {
            try {
                const sections = [];
                const textareas = document.querySelectorAll('#acquisitionSections .accordion-item');
                
                textareas.forEach(section => {
                    const button = section.querySelector('.accordion-button');
                    const textarea = section.querySelector('.accordion-body .section-content');
                    
                    if (button && textarea) {
                        sections.push({
                            title: button.textContent.trim(),
                            content: textarea.value
                        });
                    }
                });

                // Get default filename
                const defaultFilename = generateDefaultFilename();
                
                // Prompt for filename with default value
                const filename = window.prompt('Enter filename for this version:', defaultFilename);
                
                if (!filename) {
                    return; // User cancelled
                }

                const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
                
                const response = await fetch('/save_version', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        version: finalFilename,
                        sections: sections
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                showSuccess(`Document version saved as ${finalFilename}`);
                
                // Refresh the versions list if the modal is open
                const versionsList = document.getElementById('versionsList');
                if (versionsList && versionsList.offsetParent !== null) {
                    loadVersionsList();
                }
            } catch (error) {
                console.error('Error saving version:', error);
                showError(`Failed to save version: ${error.message}`);
            }
        });
    }
    
    if (loadVersionBtn) {
        loadVersionBtn.addEventListener('click', function() {
            const modal = new bootstrap.Modal(versionModal);
            // Load versions list after modal is shown
            versionModal.addEventListener('shown.bs.modal', function loadHandler() {
                loadVersionsList();
                // Remove the event listener after first use
                versionModal.removeEventListener('shown.bs.modal', loadHandler);
            });
            modal.show();
        });
    }

    if (printDocumentBtn) {
        printDocumentBtn.addEventListener('click', async function() {
            try {
                // Get all section content
                const sections = {};
                document.querySelectorAll('.section-content').forEach(textarea => {
                    sections[textarea.dataset.section] = textarea.value;
                });

                // Send request to generate PDF
                const response = await fetch('/print_document', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ sections })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to generate PDF');
                }

                // Get the PDF blob
                const blob = await response.blob();
                
                // Create a URL for the blob
                const url = window.URL.createObjectURL(blob);
                
                // Create a temporary link and trigger download
                const a = document.createElement('a');
                a.href = url;
                a.download = 'acquisition_strategy.pdf';
                document.body.appendChild(a);
                a.click();
                
                // Clean up
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

            } catch (error) {
                console.error('Error generating PDF:', error);
                alert('Error generating PDF: ' + error.message);
            }
        });
    }

    async function loadSavedVersion(version) {
        try {
            const response = await fetch(`/load_version/${version}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Loaded version data:', data);
            
            if (!data.sections || !Array.isArray(data.sections)) {
                throw new Error('Invalid version data: missing sections array');
            }

            // Get all section textareas
            const textareas = document.querySelectorAll('#acquisitionSections .accordion-item');
            const textareaMap = new Map();
            
            textareas.forEach(section => {
                const button = section.querySelector('.accordion-button');
                const textarea = section.querySelector('.accordion-body .section-content');
                if (button && textarea) {
                    const sectionName = button.textContent.trim();
                    textareaMap.set(sectionName, textarea);
                }
            });

            // Update each section's content
            data.sections.forEach(section => {
                if (!section.title) {
                    console.warn('Section missing title:', section);
                    return;
                }
                
                const textarea = textareaMap.get(section.title);
                if (textarea) {
                    console.log(`Updating section "${section.title}"`);
                    textarea.value = section.content || '';
                    textarea.disabled = false;
                    textarea.readOnly = false;
                    
                    // Trigger input event to adjust height
                    const inputEvent = new Event('input');
                    textarea.dispatchEvent(inputEvent);
                } else {
                    console.warn(`Textarea not found for section: ${section.title}`);
                }
            });

            showSuccess('Document version loaded successfully');
            
            // Close the modal if it's open
            const modal = bootstrap.Modal.getInstance(document.getElementById('versionModal'));
            if (modal) {
                modal.hide();
            }
        } catch (error) {
            console.error('Error loading version:', error);
            showError(`Failed to load version: ${error.message}`);
        }
    }

    function getAllSectionContent() {
        const sections = {};
        document.querySelectorAll('.section-content').forEach(textarea => {
            sections[textarea.dataset.section] = textarea.value;
        });
        return {
            sections,
            timestamp: new Date().toISOString()
        };
    }

    function loadVersionContent(content) {
        content.sections.forEach(section => {
            const textarea = document.querySelector(`.section-content[data-section="${section.title}"]`);
            if (textarea) {
                textarea.value = section.content;
                // Ensure textarea is enabled
                textarea.disabled = false;
                textarea.readOnly = false;
                // Trigger input event for any height adjustments
                const inputEvent = new Event('input');
                textarea.dispatchEvent(inputEvent);
            }
        });
    }
}

// Initialize textareas function
function initializeTextareas() {
    console.log('Initializing textareas...');
    
    // Get all textareas with class section-content
    const textareas = document.querySelectorAll('.section-content');
    console.log(`Found ${textareas.length} textareas`);
    
    textareas.forEach(textarea => {
        // Set initial height
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
        
        // Add input event listener for auto-resize
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
        
        // Add keydown event listener for tab handling
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;
                
                // Insert tab at cursor position
                this.value = this.value.substring(0, start) + '\t' + this.value.substring(end);
                
                // Move cursor after tab
                this.selectionStart = this.selectionEnd = start + 1;
            }
        });
    });
    
    console.log('Textareas initialized successfully');
}

// Global function to load response into section
function loadResponseIntoSection(message, sectionName) {
    console.log('Loading response into section:', sectionName, message);
    
    // Extract the actual response text from message object if needed
    let responseText = typeof message === 'object' ? message.response : message;
    
    // Find the section
    const sections = document.querySelectorAll('#acquisitionSections .accordion-item');
    let targetSection = null;
    
    sections.forEach(section => {
        const button = section.querySelector('.accordion-button');
        if (button && button.textContent.trim() === sectionName) {
            targetSection = section;
        }
    });
    
    if (!targetSection) {
        console.error('Target section not found:', sectionName);
        showError(`Section "${sectionName}" not found`);
        return;
    }
    
    try {
        // Get the textarea
        const textarea = targetSection.querySelector('.accordion-body .section-content');
        if (!textarea) {
            throw new Error('Textarea not found in section');
        }
        
        // Update the content
        textarea.value = responseText;
        
        // Ensure textarea is enabled and focused
        textarea.disabled = false;
        textarea.readOnly = false;
        
        // Trigger input event to adjust height
        const inputEvent = new Event('input');
        textarea.dispatchEvent(inputEvent);
        
        // Show success message
        showSuccess(`Content loaded into ${sectionName}`);
        
        // Expand the section
        const collapse = new bootstrap.Collapse(targetSection.querySelector('.accordion-collapse'));
        collapse.show();

        // Focus the textarea and move cursor to end
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            
            // Scroll the section into view
            const header = targetSection.querySelector('.accordion-header');
            if (header) {
                header.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Scroll up slightly to show context
                setTimeout(() => {
                    const scrollContainer = header.closest('.document-sections');
                    if (scrollContainer) {
                        scrollContainer.scrollBy({ 
                            top: -50,
                            behavior: 'smooth' 
                        });
                    }
                }, 100);
            }
        }, 300);
        
    } catch (error) {
        console.error('Error loading response:', error);
        showError(`Failed to load content into ${sectionName}: ${error.message}`);
    }
}

// Panel collapse functionality
function initializePanelCollapses() {
    document.querySelectorAll('.collapse-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const panel = button.closest('.panel');
            panel.classList.toggle('collapsed');
            
            // Save panel state
            const panelId = panel.id;
            const isCollapsed = panel.classList.contains('collapsed');
            localStorage.setItem(`panel_${panelId}_collapsed`, isCollapsed);
        });
    });

    // Restore panel states
    document.querySelectorAll('.panel').forEach(panel => {
        const panelId = panel.id;
        const isCollapsed = localStorage.getItem(`panel_${panelId}_collapsed`) === 'true';
        if (isCollapsed) {
            panel.classList.add('collapsed');
        }
    });
}

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
        this.currentProvider = null;
        this.currentVersion = null;
        this.models = null;
        this.providerSelect = document.getElementById('modelProvider');
        this.versionSelect = document.getElementById('modelVersion');
        
        ModelSelector.instance = this;
    }

    async initialize() {
        console.log('[MODEL-SELECTOR] Initializing...');
        
        // Get the current model
        fetch('/api/models/current')
            .then(response => response.json())
            .then(currentModel => {
                console.log('[MODEL-SELECTOR] Current model:', currentModel);
                this.currentProvider = currentModel.provider;
                this.currentVersion = currentModel.version;
            })
            .catch(error => {
                console.error('[MODEL-SELECTOR] Error fetching current model:', error);
            });

        // Get available models
        fetch('/api/models')
            .then(response => response.json())
            .then(data => {
                console.log('[MODEL-SELECTOR] Available models:', data);
                // Extract the models object from the response
                this.models = data.models || {};

                // Populate provider select
                if (this.providerSelect) {
                    // Clear existing options
                    this.providerSelect.innerHTML = '';
                    
                    // Add options for each provider
                    Object.entries(this.models).forEach(([key, model]) => {
                        const option = document.createElement('option');
                        option.value = key;
                        option.textContent = model.name;
                        this.providerSelect.appendChild(option);
                    });

                    // Set current provider
                    if (this.currentProvider) {
                        this.providerSelect.value = this.currentProvider;
                    }

                    // Update versions when provider changes
                    this.providerSelect.addEventListener('change', () => {
                        this.updateVersions(this.providerSelect.value);
                    });

                    // Initial version population
                    if (this.currentProvider) {
                        this.updateVersions(this.currentProvider);
                    }
                }
            })
            .catch(error => {
                console.error('[MODEL-SELECTOR] Error during initialization:', error);
            });
    }

    updateVersions(provider) {
        if (!this.versionSelect || !this.models || !this.models[provider]) {
            console.warn('[MODEL-SELECTOR] Cannot update versions - missing required data');
            return;
        }
        
        // Clear existing options
        this.versionSelect.innerHTML = '';
        
        // Add options for each version
        const versions = this.models[provider].versions || {};
        Object.entries(versions).forEach(([key, version]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = version.name;
            this.versionSelect.appendChild(option);
        });

        // Set current version or default version
        if (provider === this.currentProvider && this.currentVersion) {
            this.versionSelect.value = this.currentVersion;
        } else if (this.models[provider].default_version) {
            this.versionSelect.value = this.models[provider].default_version;
        }

        // Trigger change event to update model info
        this.versionSelect.dispatchEvent(new Event('change'));
    }
}

// Initialize global objects
window.llmInterface = window.llmInterface || {};

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM Content Loaded - Initializing application...');
    
    // Add a small delay to ensure everything is ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // First initialize model selector
    console.log('Initializing model selector...');
    console.log('Checking for model select element:', document.getElementById('modelSelect'));
    console.log('All select elements:', document.querySelectorAll('select'));
    
    window.modelSelector = new ModelSelector();
    await window.modelSelector.initialize();
    
    // Initialize LLM interface
    console.log('Initializing LLM interface...');
    window.llmInterface.initializeLLMInterface();
    
    // Initialize UI components
    console.log('Initializing UI components...');
    updateCurrentDate();
    setInterval(updateCurrentDate, 1000);
    
    // Initialize all components
    console.log('Initializing application components...');
    initializeChat();
    initializeFileUpload();
    initializeDocumentManagement();
    initializeVersionControl();
    initializeTextareas();
    initializePanelCollapses();
    loadPromptRepository();
    
    // Add event listeners
    const clearChatButton = document.getElementById('clearChat');
    if (clearChatButton) {
        clearChatButton.addEventListener('click', clearChat);
    }
    
    const newSessionButton = document.getElementById('newSessionButton');
    if (newSessionButton) {
        newSessionButton.addEventListener('click', startNewSession);
    }
    
    const promptSelect = document.getElementById('prompt-select');
    if (promptSelect) {
        handlePromptSelection();
    }
    
    console.log('Application initialization complete.');
});

// Initialize Clear Chat button
window.clearChat = function() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
};

// Add new session button handler
async function startNewSession() {
    try {
        console.log('Starting new session...');
        
        // Clear chat messages
        clearChat();
        
        // Clear file list
        const fileList = document.getElementById('fileList');
        if (fileList) {
            fileList.innerHTML = '';
        }
        
        // Reset prompt selection
        const promptSelect = document.querySelector('#prompt-select');
        if (promptSelect) {
            promptSelect.value = '';
        }
        
        // Call backend to clear session
        const response = await fetch('/clear_session', {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to clear session');
        }
        
        showSuccess('Started new session');
        console.log('New session started successfully');
        
    } catch (error) {
        console.error('Error starting new session:', error);
        showError('Failed to start new session: ' + error.message);
    }
}

// Clear chat functionality
function clearChat() {
    console.log('Clearing chat messages...');
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
        console.log('Chat messages cleared');
        showSuccess('Chat history cleared');
    } else {
        console.error('Chat messages container not found');
        showError('Could not clear chat history');
    }
}

// Show success message
function showSuccess(message) {
    const toast = new bootstrap.Toast(document.getElementById('successToast'));
    document.getElementById('toastMessage').textContent = message;
    toast.show();
}

// Show error message
function showError(message) {
    const toast = new bootstrap.Toast(document.getElementById('errorToast'));
    document.getElementById('errorMessage').textContent = message;
    toast.show();
}

// Update current date in title bar
function updateCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const currentDate = new Date().toLocaleDateString('en-US', options);
        dateElement.textContent = currentDate;
    }
}
