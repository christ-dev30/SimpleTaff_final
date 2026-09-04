import re

backend_endpoints = {}
frontend_endpoints = {}

current_class_mapping = {}

def normalize_path(path):
    # Replace path variables {id}, {agentId} etc with a generic {var}
    # For frontend we might have ${id} or similar
    path = re.sub(r'\{[^}]+\}', '{var}', path)
    path = re.sub(r'\$\{[^}]+\}', '{var}', path)
    
    # Remove query params
    path = path.split('?')[0]
    # Remove trailing slash
    if path.endswith('/') and len(path) > 1:
        path = path[:-1]
    return path

# Parse backend
with open('backend_endpoints.txt', 'r', encoding='utf-16') as f:
    for line in f:
        line = line.strip()
        if not line: continue
        parts = line.split(':', 2)
        if len(parts) < 3: continue
        filename = parts[0]
        annotation = parts[2].strip()
        
        req_match = re.search(r'@RequestMapping\(\"([^\"]+)\"\)', annotation)
        if req_match:
            current_class_mapping[filename] = req_match.group(1)
            continue
            
        method_match = re.search(r'@(Get|Post|Put|Delete|Patch)Mapping(?:\(\"([^\"]+)\"\))?', annotation)
        if method_match:
            base_path = current_class_mapping.get(filename, '')
            sub_path = method_match.group(2) if method_match.group(2) else ''
            full_path = base_path + sub_path
            method = method_match.group(1).upper()
            
            norm_path = normalize_path(full_path)
            backend_endpoints[f'{method} {norm_path}'] = full_path

# Parse frontend
with open('frontend_endpoints.txt', 'r', encoding='utf-16') as f:
    for line in f:
        line = line.strip()
        if not line: continue
        
        # very basic method inference
        method = 'GET'
        if 'method: "POST"' in line or "method: 'POST'" in line or 'method: `POST`' in line or 'method:"POST"' in line:
            method = 'POST'
        elif 'method: "PUT"' in line or "method: 'PUT'" in line or 'method: `PUT`' in line or 'method:"PUT"' in line:
            method = 'PUT'
        elif 'method: "DELETE"' in line or "method: 'DELETE'" in line or 'method: `DELETE`' in line or 'method:"DELETE"' in line:
            method = 'DELETE'
        elif 'method: "PATCH"' in line or "method: 'PATCH'" in line or 'method: `PATCH`' in line or 'method:"PATCH"' in line:
            method = 'PATCH'
            
        # extract paths from fetch or apiFetch. JS can have backticks `
        # regex to match string inside quotes or backticks
        matches = re.findall(r'(?:fetch|apiFetch)\s*\(\s*([\'\"\`])(.*?)\1', line)
        for _, url in matches:
            if url.startswith('/api/'):
                full_url = url
            elif url.startswith('/'):
                full_url = '/api' + url
            else:
                full_url = '/api/' + url
                
            norm_path = normalize_path(full_url)
            
            # Since the frontend script might infer GET instead of POST if the method is in another line,
            # Let's add it. It's an approximation.
            frontend_endpoints[f'{method} {norm_path}'] = full_url

with open('api_discrepancies.md', 'w', encoding='utf-8') as f:
    f.write('# API Endpoint Discrepancies\n\n')
    
    f.write('## 🟢 Dans le Backend mais PAS dans le Frontend\n\n')
    f.write('| Méthode | Endpoint (Backend) |\n')
    f.write('|---|---|\n')
    for endpoint, original_path in sorted(backend_endpoints.items()):
        if endpoint not in frontend_endpoints:
            # Maybe check just the path without method in case of method mismatch
            method, path = endpoint.split(' ', 1)
            found_any_method = any(e.endswith(f' {path}') for e in frontend_endpoints)
            if not found_any_method:
                f.write(f'| {method} | `{original_path}` |\n')
                
    f.write('\n## 🔴 Dans le Frontend mais PAS dans le Backend\n\n')
    f.write('| Méthode supposée | Endpoint appelé (Frontend) |\n')
    f.write('|---|---|\n')
    for endpoint, original_url in sorted(frontend_endpoints.items()):
        if endpoint not in backend_endpoints:
            method, path = endpoint.split(' ', 1)
            found_any_method = any(e.endswith(f' {path}') for e in backend_endpoints)
            if not found_any_method:
                f.write(f'| {method} | `{original_url}` |\n')

print("Report generated: api_discrepancies.md")
