import os
from dotenv import load_dotenv
import google.generativeai as genai

def test_gemini_api():
    try:
        # Load environment variables
        load_dotenv()
        
        # Get API key
        api_key = os.getenv('GEMINI_API_KEY')
        print(f"Testing Gemini API")
        print(f"API Key (first 8 chars): {api_key[:8]}...")
        
        # Configure the Gemini API
        genai.configure(api_key=api_key)
        
        # List available models
        models = genai.list_models()
        print("\nAvailable Models:")
        for model in models:
            print(f"- {model.name}")
        
        # Test with Gemini Pro
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content("Hello! Are you working?")
        
        print("\nAPI Response:")
        print(response.text)
        return True
        
    except Exception as e:
        print("\nError occurred:")
        print(f"Error type: {type(e)}")
        print(f"Error message: {str(e)}")
        print(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No additional details'}")
        return False

if __name__ == "__main__":
    test_gemini_api()
