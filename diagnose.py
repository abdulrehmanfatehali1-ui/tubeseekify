import requests

db_url = 'https://tubeseekify-de53a-default-rtdb.firebaseio.com/artifacts/tubeseekify-v4/public/data/site_settings/global.json'
r = requests.get(db_url)
if r.status_code == 200:
    data = r.json()
    key = data.get('geminiApiKey')
    if key:
        print("API Key found! Testing models for active quota...")
        models_to_test = [
            'gemini-3.5-flash',
            'gemini-3.1-flash-lite',
            'gemini-2.5-flash-lite',
            'gemini-2.5-flash',
            'gemini-2.0-flash-lite',
            'gemini-2.0-flash'
        ]
        
        for model in models_to_test:
            print(f"Testing model: {model}...")
            url = f'https://generativelanguage.googleapis.com/v1/models/{model}:generateContent?key={key}'
            body = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": "Hello, answer in 2 words."}]
                    }
                ]
            }
            try:
                mr = requests.post(url, json=body)
                print(f"  Status: {mr.status_code}")
                if mr.status_code == 200:
                    res_data = mr.json()
                    ans = res_data['candidates'][0]['content']['parts'][0]['text']
                    print(f"  SUCCESS! Response: {ans.strip()}")
                    print(f"  --> The perfect working model is: {model} !!!")
                    break
                else:
                    print(f"  Failed: {mr.text[:200]}")
            except Exception as e:
                print(f"  Error: {e}")
    else:
        print("No geminiApiKey found.")
else:
    print(f"Failed to read database: {r.status_code}")
