import os
from anthropic import Anthropic
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_anthropic_api():
    try:
        # Get API key from environment
        api_key = os.getenv('ANTHROPIC_API_KEY')
        model = os.getenv('MODEL_NAME', 'claude-2')
        
        print(f"Testing Anthropic API with model: {model}")
        print(f"API Key (first 8 chars): {api_key[:8]}...")
        
        # Initialize client
        client = Anthropic(api_key=api_key)
        
        # Simple test message
        message = client.messages.create(
            model=model,
            max_tokens=100,
            temperature=0.7,
            messages=[
                {"role": "user", "content": "Say hello and confirm you're working!"}
            ]
        )
        
        print("\nAPI Response:")
        print(message.content)
        return True
        
    except Exception as e:
        print("\nError occurred:")
        print(f"Error type: {type(e)}")
        print(f"Error message: {str(e)}")
        print(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No additional details'}")
        return False

if __name__ == "__main__":
    test_anthropic_api()
