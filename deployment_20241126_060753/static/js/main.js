document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap components
    const tabElements = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabElements.forEach(tabEl => {
        new bootstrap.Tab(tabEl);
    });

    // Initialize modals
    const saveVersionModal = document.getElementById('saveVersionModal');
    const versionModal = document.getElementById('versionModal');

    let saveVersionModalInstance = null;
    let versionModalInstance = null;

    if (saveVersionModal) {
        saveVersionModalInstance = new bootstrap.Modal(saveVersionModal);
    }
    if (versionModal) {
        versionModalInstance = new bootstrap.Modal(versionModal);
    }

    // Add click handler for chat tab to ensure elements are accessible
    const chatTab = document.querySelector('a[href="#chatbot"]');
    chatTab.addEventListener('click', function() {
        setTimeout(() => {
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                chatInput.focus();
            }
        }, 100);
    });

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
        li.className = 'list-group-item';
        li.textContent = fileName;
        fileList.appendChild(li);
    }

    // Chat functionality
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendMessageBtn = document.getElementById('sendMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Ensure chat elements exist before setting up handlers
    if (!chatMessages || !chatInput || !sendMessageBtn) {
        console.error('Chat elements not found');
        return;
    }

    function addMessageToChat(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isUser ? 'user-message' : 'assistant-message'}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                ${message}
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showLoading() {
        if (loadingIndicator) {
            loadingIndicator.classList.remove('d-none');
        }
        chatInput.disabled = true;
        sendMessageBtn.disabled = true;
    }

    function hideLoading() {
        if (loadingIndicator) {
            loadingIndicator.classList.add('d-none');
        }
        chatInput.disabled = false;
        sendMessageBtn.disabled = false;
        chatInput.focus();
    }

    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        console.log('Sending message:', message); // Debug log

        // Add user message to chat
        addMessageToChat(message, true);
        chatInput.value = '';

        // Show loading indicator
        showLoading();

        try {
            console.log('Making fetch request...'); // Debug log
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            console.log('Received response:', response.status); // Debug log

            const data = await response.json();
            console.log('Response data:', data); // Debug log

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            // Add AI response to chat
            addMessageToChat(data.response);

            // Handle section suggestion if present
            if (data.suggestedSection && data.canPropagate) {
                const sectionTextarea = document.querySelector(`textarea[data-section="${data.suggestedSection}"]`);
                if (sectionTextarea) {
                    const currentContent = sectionTextarea.value;
                    sectionTextarea.value = currentContent + (currentContent ? '\n\n' : '') + data.response;
                }
            }

        } catch (error) {
            console.error('Error:', error);
            addMessageToChat('Error: ' + error.message);
        } finally {
            hideLoading();
        }
    }

    // Event Listeners
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey && !chatInput.disabled) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendMessageBtn.addEventListener('click', function() {
        if (!chatInput.disabled) {
            sendMessage();
        }
    });

    // Debug log for initialization
    console.log('Chat functionality initialized');

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

    // Version control and printing
    const saveVersionBtn = document.getElementById('saveVersion');
    const loadVersionBtn = document.getElementById('loadVersion');
    const printDocumentBtn = document.getElementById('printDocument');
    const versionsList = document.getElementById('versionsList');
    const confirmSaveVersionBtn = document.getElementById('confirmSaveVersion');
    const versionNameInput = document.getElementById('versionName');

    if (saveVersionBtn && saveVersionModalInstance) {
        saveVersionBtn.addEventListener('click', () => {
            saveVersionModalInstance.show();
        });
    }

    if (loadVersionBtn && versionModalInstance) {
        loadVersionBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/get_versions');
                const data = await response.json();
                
                if (versionsList) {
                    versionsList.innerHTML = '';
                    data.versions.forEach(version => {
                        const item = document.createElement('a');
                        item.className = 'list-group-item list-group-item-action';
                        item.href = '#';
                        const date = new Date(version.timestamp);
                        item.innerHTML = `
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">${version.name}</h6>
                                <small>${date.toLocaleString()}</small>
                            </div>
                        `;
                        item.addEventListener('click', async (e) => {
                            e.preventDefault();
                            const versionResponse = await fetch(`/get_version/${version.name}`);
                            const versionData = await versionResponse.json();
                            loadVersionContent(versionData.content);
                            versionModalInstance.hide();
                        });
                        versionsList.appendChild(item);
                    });
                }
                
                versionModalInstance.show();
            } catch (error) {
                console.error('Error loading versions:', error);
                alert('Error loading versions');
            }
        });
    }

    if (confirmSaveVersionBtn && saveVersionModalInstance) {
        confirmSaveVersionBtn.addEventListener('click', async () => {
            const versionName = versionNameInput ? versionNameInput.value.trim() : null;
            const content = getAllSectionContent();
            
            try {
                const response = await fetch('/save_version', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        content,
                        version_name: versionName
                    })
                });
                const data = await response.json();
                
                if (response.ok) {
                    alert('Version saved successfully');
                    saveVersionModalInstance.hide();
                    if (versionNameInput) {
                        versionNameInput.value = '';
                    }
                } else {
                    alert(data.error || 'Error saving version');
                }
            } catch (error) {
                console.error('Error saving version:', error);
                alert('Error saving version');
            }
        });
    }

    printDocumentBtn.addEventListener('click', async () => {
        const content = getAllSectionContent();
        
        try {
            const response = await fetch('/print_document', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'acquisition_strategy.pdf';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } else {
                alert('Error generating PDF');
            }
        } catch (error) {
            console.error('Error printing document:', error);
            alert('Error printing document');
        }
    });

    function getAllSectionContent() {
        const sections = [];
        document.querySelectorAll('.section-content').forEach(textarea => {
            sections.push({
                title: textarea.dataset.section,
                content: textarea.value
            });
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
            }
        });
    }

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

    // Initial update of required documents
    updateRequiredDocuments();
});
