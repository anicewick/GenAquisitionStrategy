@echo off
echo Creating virtual environment...
python -m venv venv
call venv\Scripts\activate

echo Installing dependencies...
pip install -r requirements.txt

echo Creating .env file...
copy .env.example .env
echo Please update the .env file with your actual API keys and secrets.

echo Setup complete! You can now:
echo 1. Update the .env file with your actual keys
echo 2. Run the application with: python app.py
