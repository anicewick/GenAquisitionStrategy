# DoD Acquisition Strategy Generator

A web application to help generate and manage Department of Defense (DoD) acquisition strategy documents. This application provides an interactive interface for document creation, management, and analysis using AI-powered assistance.

## Features

1. Document Upload and ChatBot Interface
   - Upload acquisition-related documents
   - AI-powered chatbot for document analysis and guidance
   - Interactive document exploration

2. Acquisition Strategy Document Editor
   - Section-by-section document creation
   - Auto-saving functionality
   - Structured format following DoD guidelines

3. Supporting Document Analysis
   - Real-time analysis of required supporting documents
   - Applicability percentage indicators
   - Progress tracking

## Deployment Guide

### Prerequisites
- Python 3.12 or higher
- pip (Python package installer)
- Anthropic API key (for Claude AI integration)

### Installation Steps

1. Copy the application files to your server:
   ```bash
   # Option 1: Clone from version control (if available)
   git clone [repository-url]
   
   # Option 2: Copy the files manually
   # Ensure you copy all files and directories EXCEPT:
   # - venv/
   # - .env
   # - __pycache__/
   # - uploads/*
   # - versions/*
   # - documents_store.pkl
   ```

2. Create and activate a virtual environment:
   ```bash
   # Create virtual environment
   python -m venv venv
   
   # Activate on Windows
   venv\Scripts\activate
   
   # Activate on Unix/MacOS
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file with your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

5. Create required directories (if they don't exist):
   ```bash
   mkdir -p uploads versions
   ```

6. Run the application:
   ```bash
   # Development server
   python app.py
   
   # Production server (using gunicorn on Unix/Linux)
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   
   # Production server (using waitress on Windows)
   waitress-serve --port=5000 app:app
   ```

### Production Deployment Notes

1. Security Considerations:
   - Always use HTTPS in production
   - Set up proper authentication
   - Keep the `.env` file secure and never commit it to version control
   - Regularly update dependencies for security patches

2. Environment Configuration:
   - Set `FLASK_ENV=production` in production
   - Configure proper logging
   - Set appropriate file upload limits
   - Configure server timeout settings

3. Maintenance:
   - Regularly backup the `documents_store.pkl` file
   - Monitor disk usage in `uploads/` and `versions/` directories
   - Set up proper logging and monitoring
   - Implement regular security updates

4. System Requirements:
   - Minimum 2GB RAM
   - At least 1GB free disk space
   - Network access for API calls to Anthropic
   - Python 3.12 or higher

## Troubleshooting

1. API Connection Issues:
   - Verify Anthropic API key in `.env`
   - Check network connectivity
   - Ensure firewall allows outbound connections

2. File Upload Issues:
   - Check directory permissions
   - Verify upload directory exists
   - Check file size limits

3. Application Errors:
   - Check application logs
   - Verify all dependencies are installed
   - Ensure Python version compatibility

## Support

For issues or questions, please contact:
[Your contact information or support process]
