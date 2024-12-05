document.addEventListener('DOMContentLoaded', function() {
    // Form submission handling
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Processing...';
            
            try {
                const formData = new FormData(form);
                const response = await fetch(form.action, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                displayResults(result);
                showMessage('Success!', 'success');
            } catch (error) {
                console.error('Error:', error);
                showMessage('An error occurred. Please try again.', 'error');
            } finally {
                // Reset button state
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }
    
    // Display results in the results section
    function displayResults(data) {
        const resultsDiv = document.getElementById('results');
        if (!resultsDiv) return;
        
        resultsDiv.innerHTML = '';
        
        if (Array.isArray(data)) {
            data.forEach(item => {
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                resultItem.textContent = item;
                resultsDiv.appendChild(resultItem);
            });
        } else {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.textContent = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
            resultsDiv.appendChild(resultItem);
        }
    }
    
    // Show message (success/error)
    function showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = type;
        messageDiv.textContent = message;
        
        // Remove any existing messages
        const existingMessages = document.querySelectorAll('.success, .error');
        existingMessages.forEach(msg => msg.remove());
        
        // Insert new message at the top of the form
        form.insertBefore(messageDiv, form.firstChild);
        
        // Remove message after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
    
    // File input handling
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const fileName = e.target.files[0]?.name;
            const fileLabel = document.querySelector('label[for="' + fileInput.id + '"]');
            if (fileLabel) {
                fileLabel.textContent = fileName || 'Choose file';
            }
        });
    }
});
