import sys
import json
import pandas as pd
import traceback

def process_file(filepath):
    try:
        # Read the file
        df = pd.read_excel(filepath)
        
        # Básic treatment: replace NaN with None (which becomes null in JSON)
        df = df.where(pd.notnull(df), None)
        
        # Convert to dictionary (records list)
        records = df.to_dict(orient='records')
        
        # Summary statistics
        summary = {
            "totalRows": len(df),
            "columns": list(df.columns),
        }
        
        result = {
            "success": True,
            "data": records,
            "summary": summary
        }
        
        # Print valid JSON to stdout
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_result))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No file path provided."}))
        sys.exit(1)
        
    filepath = sys.argv[1]
    process_file(filepath)
