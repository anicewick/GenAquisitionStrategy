import os
import json
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

import anthropic
import openai
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential

class LLMProvider(ABC):
    @abstractmethod
    async def generate_response(self, prompt: str, system_prompt: str, **kwargs) -> str:
        pass

    @abstractmethod
    def validate_api_key(self) -> bool:
        pass

class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "claude-3-sonnet-20240229"):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.model = model

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2))
    async def generate_response(self, prompt: str, system_prompt: str, **kwargs) -> str:
        message = await self.client.messages.create(
            model=self.model,
            max_tokens=kwargs.get('max_tokens', 4096),
            system=system_prompt,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text

    def validate_api_key(self) -> bool:
        try:
            self.client.messages.create(
                model=self.model,
                max_tokens=10,
                messages=[{"role": "user", "content": "test"}]
            )
            return True
        except:
            return False

class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gpt-4"):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model = model

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2))
    async def generate_response(self, prompt: str, system_prompt: str, **kwargs) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            max_tokens=kwargs.get('max_tokens', 4096)
        )
        return response.choices[0].message.content

    def validate_api_key(self) -> bool:
        try:
            self.client.models.list()
            return True
        except:
            return False

class GoogleProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gemini-pro"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2))
    async def generate_response(self, prompt: str, system_prompt: str, **kwargs) -> str:
        response = await self.model.generate_content_async(
            f"{system_prompt}\n\n{prompt}",
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=kwargs.get('max_tokens', 4096)
            )
        )
        return response.text

    def validate_api_key(self) -> bool:
        try:
            genai.list_models()
            return True
        except:
            return False

class LLMFactory:
    PROVIDER_MAP = {
        "claude": "anthropic",
        "gpt": "openai",
        "gemini": "google"
    }
    
    @staticmethod
    def get_provider(provider_name: str, api_key: str, model: str) -> LLMProvider:
        # Map config provider names to actual provider implementations
        actual_provider = LLMFactory.PROVIDER_MAP.get(provider_name, provider_name)
        
        providers = {
            "anthropic": AnthropicProvider,
            "openai": OpenAIProvider,
            "google": GoogleProvider
        }
        
        provider_class = providers.get(actual_provider)
        if not provider_class:
            raise ValueError(f"Unknown provider: {provider_name}")
            
        return provider_class(api_key, model)

def load_model_config() -> Dict[str, Any]:
    """Load and validate the model configuration"""
    try:
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config', 'models.json')
        with open(config_path, 'r') as f:
            config = json.load(f)
            
        # Validate the config structure
        if not isinstance(config, dict) or 'models' not in config:
            raise ValueError("Invalid config structure: missing 'models' key")
            
        return config
    except Exception as e:
        print(f"Error loading model config: {str(e)}")
        raise
