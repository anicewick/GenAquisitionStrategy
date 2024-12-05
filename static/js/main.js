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
            const chatInput = document.querySelector('#chat-input');
            if (chatInput) {
                chatInput.value = data.prompt || '';
            }
        } catch (error) {
            showError('Failed to load selected prompt');
            console.error('Error handling prompt selection:', error);
        }
    });
}

// Chat initialization function
function initializeChat() {
    console.log('Initializing chat functionality...');
    
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');
    const includeSectionsCheckbox = document.getElementById('include-sections');
    const clearChatButton = document.getElementById('clearChat');

    if (!chatInput || !sendButton || !chatMessages || !includeSectionsCheckbox) {
        console.error('Required chat elements not found:', {
            chatInput: !!chatInput,
            sendButton: !!sendButton,
            chatMessages: !!chatMessages,
            includeSectionsCheckbox: !!includeSectionsCheckbox,
            clearChatButton: !!clearChatButton
        });
        return;
    }

    console.log('Chat elements found, setting up event listeners');

    // Parse message content and extract sections
    function parseMessageContent(message) {
        let content = '';
        let sections = [];

        if (typeof message === 'object') {
            content = message.response || '';
            if (message.suggestedSection) {
                sections.push(message.suggestedSection);
            }
        } else {
            content = String(message);
            // Look for section markers in the content
            const sectionMatches = content.match(/Section:\s*([^\n]+)/g);
            if (sectionMatches) {
                sections = sectionMatches.map(match => {
                    const section = match.replace(/Section:\s*/, '').trim();
                    return section;
                });
            }
        }

        return { content, sections };
    }

    function createMessageElement(message, isUser = false, isLoading = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isUser ? 'user-message' : 'assistant-message'}`;
        
        if (isLoading) {
            messageDiv.classList.add('loading-message');
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        messageDiv.appendChild(contentDiv);

        if (isLoading) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading-animation';
            
            const spinner = document.createElement('div');
            spinner.className = 'spinner-border';
            spinner.setAttribute('role', 'status');
            loadingDiv.appendChild(spinner);
            
            const textSpan = document.createElement('span');
            textSpan.textContent = 'Processing your request...';
            loadingDiv.appendChild(textSpan);
            
            contentDiv.appendChild(loadingDiv);
        } else if (!isUser) {
            try {
                // Initialize markdown-it
                const md = new markdownit();
                
                // Extract the response text from message object if needed
                const messageText = typeof message === 'object' ? message.response : message;
                
                // Render the message text
                contentDiv.innerHTML = md.render(String(messageText));
            } catch (error) {
                console.warn('Markdown parsing failed:', error);
                contentDiv.textContent = typeof message === 'object' ? message.response : String(message);
            }

            // Add the content div first
            messageDiv.appendChild(contentDiv);

            // Create action buttons container
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions mt-3';

            // Create button group
            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'btn-group d-flex justify-content-end';

            // Try to extract target section from the message
            let targetSection = '';
            if (typeof message === 'object' && message.suggestedSection) {
                targetSection = message.suggestedSection;
            } else if (typeof message === 'string') {
                const sectionMatch = message.match(/Section:\s*([^\n]+)/);
                if (sectionMatch) {
                    targetSection = sectionMatch[1].trim();
                }
            }

            // Add scratch pad button
            const scratchPadButton = document.createElement('button');
            scratchPadButton.className = 'btn btn-sm btn-outline-secondary';
            scratchPadButton.innerHTML = '<i class="bi bi-pencil-square"></i> Load to Scratch Pad';
            scratchPadButton.onclick = () => loadResponseIntoSection(message, 'Scratch Pad');
            buttonGroup.appendChild(scratchPadButton);

            // Add section loading button if we have a target section
            if (targetSection) {
                const loadButton = document.createElement('button');
                loadButton.className = 'btn btn-sm btn-primary ms-2';
                loadButton.innerHTML = `<i class="bi bi-file-earmark-arrow-up"></i> Load into ${targetSection}`;
                loadButton.onclick = () => loadResponseIntoSection(message, targetSection);
                buttonGroup.appendChild(loadButton);
            }

            // Add append mode checkbox
            const checkboxWrapper = document.createElement('div');
            checkboxWrapper.className = 'checkbox-wrapper mt-2';
            
            const appendCheckbox = document.createElement('input');
            appendCheckbox.type = 'checkbox';
            appendCheckbox.id = `append-mode-${Date.now()}`; // Unique ID for each message
            appendCheckbox.checked = true;
            
            const appendLabel = document.createElement('label');
            appendLabel.htmlFor = appendCheckbox.id;
            appendLabel.textContent = 'Append to section (uncheck to overwrite)';
            
            checkboxWrapper.appendChild(appendCheckbox);
            checkboxWrapper.appendChild(appendLabel);

            // Add button group to actions div
            actionsDiv.appendChild(buttonGroup);
            // Add checkbox wrapper after buttons
            actionsDiv.appendChild(checkboxWrapper);

            // Add actions div to message
            messageDiv.appendChild(actionsDiv);
        } else {
            contentDiv.textContent = message;
            messageDiv.appendChild(contentDiv);
        }
        
        return messageDiv;
    }

    function appendMessage(message, isUser = false, isLoading = false) {
        const messageDiv = createMessageElement(message, isUser, isLoading);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv;
    }

    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) {
            showError('Please enter a message');
            return;
        }

        try {
            console.log('Sending message:', message);
            appendMessage(message, true);

            // Add loading message
            const loadingMessage = appendMessage('', false, true);

            // Get current document content
            const currentContent = {};
            const sections = document.querySelectorAll('#acquisitionSections .accordion-item');
            console.log('Found sections:', sections.length);
            
            sections.forEach(section => {
                const button = section.querySelector('.accordion-button');
                const textarea = section.querySelector('.accordion-body .section-content');
                
                if (button && textarea) {
                    const sectionName = button.textContent.trim();
                    const textareaValue = textarea.value ? textarea.value.trim() : '';
                    
                    console.log(`Section "${sectionName}":`, {
                        hasContent: !!textareaValue,
                        contentLength: textareaValue.length,
                        preview: textareaValue.substring(0, 100) + (textareaValue.length > 100 ? '...' : '')
                    });
                    
                    if (textareaValue) {
                        currentContent[sectionName] = textareaValue;
                    }
                }
            });

            // Get list of uploaded documents
            const uploadedDocs = {};
            const fileListItems = document.querySelectorAll('#fileList .list-group-item span');
            fileListItems.forEach(item => {
                uploadedDocs[item.textContent] = true;
            });
            console.log('Uploaded documents:', Object.keys(uploadedDocs));

            // Get currently selected prompt and its target section
            const promptSelect = document.querySelector('#prompt-select');
            const selectedPromptId = promptSelect ? promptSelect.value : '';
            let targetSection = '';
            
            if (selectedPromptId) {
                // Find the selected prompt in prompts.json
                const promptsResponse = await fetch('/prompts');
                const promptsData = await promptsResponse.json();
                const selectedPrompt = promptsData.prompts.find(p => p.id === selectedPromptId);
                if (selectedPrompt && selectedPrompt.targetSection) {
                    targetSection = selectedPrompt.targetSection;
                }
            }
            console.log('Selected prompt ID:', selectedPromptId, 'Target section:', targetSection);

            const requestBody = {
                message: message,
                includeSections: includeSectionsCheckbox.checked,
                currentContent: currentContent,
                includeDocuments: true,
                uploadedDocuments: Object.keys(uploadedDocs),
                promptId: selectedPromptId,
                targetSection: targetSection
            };

            console.log('Sending request:', {
                includeSections: includeSectionsCheckbox.checked,
                includeDocuments: true,
                uploadedDocs: Object.keys(uploadedDocs),
                contentSections: Object.keys(currentContent),
                totalSections: Object.keys(currentContent).length,
                promptId: selectedPromptId
            });

            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            // Remove loading message
            loadingMessage.remove();

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Full response data:', data);

            if (data.error) {
                console.error('Error from server:', data.error);
                showError(data.error);
                return;
            }

            // Create a message object that includes both response text and metadata
            const messageObject = {
                response: data.response,
                suggestedSection: data.targetSection || data.suggestedSection,
                canPropagate: true
            };
            
            appendMessage(messageObject, false);

            // Clear input
            chatInput.value = '';

        } catch (error) {
            console.error('Error:', error);
            showError(error.message);
            
            // Ensure loading message is removed in case of error
            const loadingMessages = document.querySelectorAll('.loading-message');
            loadingMessages.forEach(msg => msg.remove());
        }
    }

    // Add event listeners
    sendButton.addEventListener('click', sendMessage);
    
    chatInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    // Add clear chat event listener
    if (clearChatButton) {
        clearChatButton.addEventListener('click', clearChat);
    } else {
        console.error('Clear chat button not found');
    }

    console.log('Chat initialization complete');
}

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
        
        // Find the append mode checkbox in the message's actions
        let messageElement = null;
        if (typeof message === 'object') {
            // Find the message by looking through all chat messages and checking button text
            const messages = document.querySelectorAll('.chat-message');
            for (const msg of messages) {
                const button = msg.querySelector(`button[onclick*="${sectionName}"]`);
                if (button) {
                    messageElement = msg;
                    break;
                }
            }
        } else {
            // If no specific message object, use the last chat message
            messageElement = document.querySelector('.chat-message:last-child');
        }
            
        const appendMode = messageElement ? 
            messageElement.querySelector('input[type="checkbox"]').checked : 
            true; // Default to append if checkbox not found
        
        // Update the content
        if (appendMode && textarea.value.trim()) {
            // If appending and there's existing content, add two newlines before the new content
            textarea.value = textarea.value.trim() + '\n\n' + responseText;
        } else {
            // If overwriting or no existing content, just set the value
            textarea.value = responseText;
        }
        
        // Ensure textarea is enabled and focused
        textarea.disabled = false;
        textarea.readOnly = false;
        
        // Trigger input event to adjust height
        const inputEvent = new Event('input');
        textarea.dispatchEvent(inputEvent);
        
        // Show success message
        const mode = appendMode ? 'appended to' : 'loaded into';
        showSuccess(`Content ${mode} ${sectionName}`);
        
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
document.querySelectorAll('.collapse-toggle').forEach(button => {
    button.addEventListener('click', function() {
        const panel = this.closest('.panel');
        const icon = this.querySelector('.bi');
        const isVertical = button.classList.contains('vertical-collapse');
        
        if (panel) {
            if (isVertical) {
                panel.classList.toggle('collapsed-vertical');
                // Update icon for vertical collapse
                if (panel.classList.contains('collapsed-vertical')) {
                    icon.classList.remove('bi-arrows-collapse');
                    icon.classList.add('bi-arrows-expand');
                } else {
                    icon.classList.remove('bi-arrows-expand');
                    icon.classList.add('bi-arrows-collapse');
                }
            } else {
                panel.classList.toggle('collapsed');
                // Update icon for horizontal collapse
                if (panel.classList.contains('collapsed')) {
                    icon.classList.remove('bi-arrows-collapse');
                    icon.classList.add('bi-arrows-expand');
                } else {
                    icon.classList.remove('bi-arrows-expand');
                    icon.classList.add('bi-arrows-collapse');
                }
            }
            
            // Save panel states
            const panelStates = {};
            document.querySelectorAll('.panel').forEach(p => {
                panelStates[p.id] = {
                    collapsed: p.classList.contains('collapsed'),
                    collapsedVertical: p.classList.contains('collapsed-vertical')
                };
            });
            localStorage.setItem('panelStates', JSON.stringify(panelStates));
            
            // Trigger resize event for any components that need to adjust
            window.dispatchEvent(new Event('resize'));
        }
    });
});

// Load saved panel states on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedStates = localStorage.getItem('panelStates');
    if (savedStates) {
        const states = JSON.parse(savedStates);
        Object.entries(states).forEach(([id, state]) => {
            const panel = document.getElementById(id);
            const horizontalButton = panel?.querySelector('.collapse-toggle:not(.vertical-collapse)');
            const verticalButton = panel?.querySelector('.collapse-toggle.vertical-collapse');
            
            if (panel) {
                if (state.collapsed && horizontalButton) {
                    panel.classList.add('collapsed');
                    const icon = horizontalButton.querySelector('.bi');
                    if (icon) {
                        icon.classList.remove('bi-arrows-collapse');
                        icon.classList.add('bi-arrows-expand');
                    }
                }
                if (state.collapsedVertical && verticalButton) {
                    panel.classList.add('collapsed-vertical');
                    const icon = verticalButton.querySelector('.bi');
                    if (icon) {
                        icon.classList.remove('bi-arrows-collapse');
                        icon.classList.add('bi-arrows-expand');
                    }
                }
            }
        });
    }
});

// Initialize panel collapse functionality
function initializePanelCollapse() {
    const accordionItems = document.querySelectorAll('.accordion-item');
    
    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');
        const content = item.querySelector('.accordion-collapse');
        const textarea = item.querySelector('.section-content');
        
        if (header && content) {
            // When a section is opened
            content.addEventListener('show.bs.collapse', () => {
                // Scroll the section into view with padding
                setTimeout(() => {
                    const headerRect = header.getBoundingClientRect();
                    const scrollContainer = header.closest('.document-sections');
                    
                    if (scrollContainer) {
                        // Calculate if we need to scroll
                        const containerRect = scrollContainer.getBoundingClientRect();
                        const headerTop = headerRect.top - containerRect.top;
                        const visibleHeight = containerRect.height;
                        
                        // If the header is not fully visible
                        if (headerTop < 0 || headerTop > visibleHeight - 100) {
                            header.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            // Add extra scroll to show some content
                            setTimeout(() => {
                                scrollContainer.scrollBy({ 
                                    top: -50, // Scroll up a bit to show context
                                    behavior: 'smooth' 
                                });
                            }, 100);
                        }
                    }
                }, 0);
            });

            // When text is added to a section
            if (textarea) {
                textarea.addEventListener('input', () => {
                    // Check if the textarea is near the bottom of the viewport
                    const textareaRect = textarea.getBoundingClientRect();
                    const scrollContainer = textarea.closest('.document-sections');
                    
                    if (scrollContainer) {
                        const containerRect = scrollContainer.getBoundingClientRect();
                        const bottomDistance = containerRect.bottom - textareaRect.bottom;
                        
                        // If less than 100px from bottom, scroll to show more
                        if (bottomDistance < 100) {
                            scrollContainer.scrollBy({ 
                                top: 100, // Scroll down to show more space
                                behavior: 'smooth' 
                            });
                        }
                    }
                });

                // Adjust height based on content
                textarea.addEventListener('input', function() {
                    this.style.height = 'auto';
                    this.style.height = Math.min(Math.max(this.scrollHeight, 150), 600) + 'px';
                });
            }
        }
    });
}

// Load help content from JSON
async function loadHelpContent() {
    try {
        const response = await fetch('/static/help.json');
        if (!response.ok) {
            throw new Error('Failed to load help content');
        }
        
        const helpData = await response.json();
        const helpAccordion = document.getElementById('helpAccordion');
        
        helpData.sections.forEach((section, index) => {
            const sectionHtml = `
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button ${index > 0 ? 'collapsed' : ''}" 
                                type="button" 
                                data-bs-toggle="collapse" 
                                data-bs-target="#helpSection${index}"
                                aria-expanded="${index === 0}"
                                aria-controls="helpSection${index}">
                            ${section.title}
                        </button>
                    </h2>
                    <div id="helpSection${index}" 
                         class="accordion-collapse collapse ${index === 0 ? 'show' : ''}"
                         data-bs-parent="#helpAccordion">
                        <div class="accordion-body">
                            ${section.content.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                </div>
            `;
            helpAccordion.insertAdjacentHTML('beforeend', sectionHtml);
        });
        
    } catch (error) {
        console.error('Error loading help content:', error);
        showError('Failed to load help content');
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

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing application...');
    
    // Update date immediately and set interval
    updateCurrentDate();
    setInterval(updateCurrentDate, 60000); // Update every minute
    
    // Initialize Bootstrap components
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    const tabElements = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabElements.forEach(tabEl => {
        new bootstrap.Tab(tabEl);
    });
    
    // Initialize all the components
    initializeChat();
    initializeFileUpload();
    initializeDocumentManagement();
    initializeVersionControl();
    initializePanelCollapse();
    loadHelpContent();
    
    // Initialize textareas
    function initializeTextareas() {
        console.log('Initializing textareas...');
        
        // Get all textareas with class section-content
        const textareas = document.querySelectorAll('.section-content');
        
        textareas.forEach(textarea => {
            // Enable the textarea
            textarea.disabled = false;
            textarea.readOnly = false;
            
            // Auto-resize functionality
            textarea.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
            
            // Initial height adjustment
            textarea.dispatchEvent(new Event('input'));
        });
        
        console.log(`Initialized ${textareas.length} textareas`);
    }

    // Event Listeners
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.classList && node.classList.contains('section-content')) {
                        node.disabled = false;
                        node.readOnly = false;
                    }
                });
            }
        });
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Initialize existing textareas
    initializeTextareas();
    
    // Initialize Clear Chat button
    const clearChatButton = document.getElementById('clearChat');
    if (clearChatButton) {
        clearChatButton.addEventListener('click', clearChat);
    }
    
    // Add new session button handler
    const newSessionButton = document.getElementById('newSessionButton');
    if (newSessionButton) {
        newSessionButton.addEventListener('click', startNewSession);
    }

    // Load prompts immediately
    loadPromptRepository();
    
    // Add event listener for prompt selection
    const promptSelect = document.getElementById('prompt-select');
    if (promptSelect) {
        console.log('Adding change event listener to prompt select');
        handlePromptSelection();
        
        // Reload prompts when chat tab is shown
        const chatTab = document.querySelector('[data-bs-toggle="tab"][data-bs-target="#chatbot"]');
        if (chatTab) {
            chatTab.addEventListener('shown.bs.tab', loadPromptRepository);
        }
    }
    
    // Initialize append mode checkbox
    const appendModeCheckbox = document.getElementById('append-mode');
    if (appendModeCheckbox) {
        console.log('Append mode checkbox initialized');
    } else {
        console.warn('Append mode checkbox not found in DOM');
    }
    
    console.log('Application initialization complete');
});

// Function to start a new session
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
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
        console.log('Chat messages cleared');
        showSuccess('Chat history cleared');
    } else {
        console.error('Chat messages container not found');
        showError('Could not clear chat history');
    }
}
