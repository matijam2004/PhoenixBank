import os
import json
import logging
from openai import OpenAI
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

class CheckProcessorLLM:
    def __init__(self):
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables. Please check your .env file.")
        
        self.client = OpenAI(api_key=api_key)
    
    def process_check_text(self, ocr_text: str) -> dict:
        prompt = f"""
        You are a financial data extraction expert. I will give you raw OCR text from a check image, and you need to extract specific information in a structured JSON format.

        The OCR text may contain noise, formatting issues, or irrelevant information. Your job is to identify and extract only the relevant check information.

        Please extract the following information from this check OCR text:

        1. **payee_name**: The name of the person or entity that the check is payable to (usually after "Pay to the order of" or similar)
        2. **date**: The date written on the check (in MM/DD/YYYY format if possible)
        3. **amount**: The numerical amount in dollars (both written and numerical if available, prefer numerical)
        4. **memo**: Any memo or reason for payment (optional field, may be empty)

        Return ONLY a valid JSON object with these exact field names. If any information is not found or unclear, use null for that field.

        OCR Text to process:
        {ocr_text}

        Return only the JSON object, no additional text or explanation:
        """

        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a financial data extraction expert. Extract check information and return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Low temperature for consistent, accurate extraction
                max_tokens=500
            )
            
            json_text = response.choices[0].message.content.strip()
            try:
                extracted_data = json.loads(json_text)
                result = {
                    "payee_name": extracted_data.get("payee_name"),
                    "date": extracted_data.get("date"),
                    "amount": extracted_data.get("amount"),
                    "memo": extracted_data.get("memo", ""),
                    "raw_text": ocr_text,
                    "extraction_success": True
                }
                
                return result
                
            except json.JSONDecodeError as e:
                return {
                    "payee_name": None,
                    "date": None,
                    "amount": None,
                    "memo": "",
                    "raw_text": ocr_text,
                    "extraction_success": False,
                    "error": f"Failed to parse LLM response as JSON: {str(e)}",
                    "llm_response": json_text
                }
                
        except Exception as e:
            return {
                "payee_name": None,
                "date": None,
                "amount": None,
                "memo": "",
                "raw_text": ocr_text,
                "extraction_success": False,
                "error": f"LLM processing failed: {str(e)}"
            }

if __name__ == "__main__":
    llm_service = CheckProcessorLLM()
    sample_ocr = """
    PAY TO THE ORDER OF
    John Smith
    $1,250.00
    One thousand two hundred fifty dollars
    
    Date: 12/15/2023
    
    For: Rent payment
    
    Bank of America
    Account: 1234567890
    """
    
    result = llm_service.process_check_text(sample_ocr)
    logger.debug("Extraction Result: %s", json.dumps(result, indent=2))
