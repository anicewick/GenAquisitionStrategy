document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const uploadedFilesList = document.getElementById('uploadedFiles');

    // Handle file selection
    fileInput.addEventListener('change', function() {
        // Clear the uploaded files list
        uploadedFilesList.innerHTML = '';
        
        // Display selected files
        Array.from(this.files).forEach(file => {
            const listItem = document.createElement('div');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            listItem.innerHTML = `
                <span>
                    <i class="bi bi-file-earmark-text"></i>
                    ${file.name}
                </span>
                <span class="badge bg-primary rounded-pill">${formatFileSize(file.size)}</span>
            `;
            uploadedFilesList.appendChild(listItem);
        });
    });

    // Handle file upload
    uploadButton.addEventListener('click', async function() {
        if (!fileInput.files.length) {
            showToast('Please select files to upload', 'warning');
            return;
        }

        const formData = new FormData();
        Array.from(fileInput.files).forEach(file => {
            formData.append('file', file);
        });

        try {
            uploadButton.disabled = true;
            uploadButton.innerHTML = '<i class="bi bi-cloud-upload"></i> Uploading...';

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            showToast('Files uploaded successfully!', 'success');
            
            // Clear the file input
            fileInput.value = '';
            uploadedFilesList.innerHTML = '';

        } catch (error) {
            console.error('Upload failed:', error);
            showToast('Upload failed: ' + error.message, 'error');
        } finally {
            uploadButton.disabled = false;
            uploadButton.innerHTML = '<i class="bi bi-cloud-upload"></i> Upload';
        }
    });

    // Helper function to format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Helper function to show toast notifications
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        const toastContainer = document.getElementById('toast-container');
        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
});
