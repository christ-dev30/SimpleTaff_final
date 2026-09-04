import os

static_dir = r"c:\Users\junio\Downloads\SimpleTaff-soutennance\SimpleTaff-soutennance\src\main\resources\static"

for root, dirs, files in os.walk(static_dir):
    for file in files:
        if not file.endswith('.html'):
            continue
            
        filepath = os.path.join(root, file)
        folder_name = os.path.basename(root)
        basename = os.path.splitext(file)[0]
        
        if basename == 'index':
            if folder_name == 'static':
                name = 'index'
            else:
                name = folder_name
        else:
            name = basename
            
        css_filename = f"{name}.css"
        js_filename = f"{name}.js"
        css_filepath = os.path.join(root, css_filename)
        js_filepath = os.path.join(root, js_filename)
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        new_content = content
        css_content = ''
        js_content = ''

        # 1. CSS Extraction (First <style> block, safe)
        start_style = new_content.find('<style')
        if start_style != -1:
            end_style = new_content.find('</style>', start_style)
            if end_style != -1:
                css_tag = new_content[start_style:end_style+8]
                css_inner = new_content[new_content.find('>', start_style)+1:end_style].strip()
                if css_inner:
                    css_content = css_inner
                    new_content = new_content.replace(css_tag, f'<link href="{css_filename}" rel="stylesheet">')

        # 2. JS Extraction (Main block)
        end_script = new_content.rfind('</script>')
        if end_script != -1:
            start_script = new_content.find('<script type="module">')
            
            if start_script == -1 or start_script > end_script:
                start_script = new_content.rfind('<script', 0, end_script)
                prev_end = new_content.rfind('</script>', 0, end_script)
                if prev_end != -1 and prev_end > start_script:
                    start_script = new_content.find('<script', prev_end)

            if start_script != -1 and start_script < end_script:
                tag_open_end = new_content.find('>', start_script)
                tag_def = new_content[start_script:tag_open_end]
                
                if 'src=' not in tag_def:
                    script_inner = new_content[tag_open_end+1:end_script].strip()
                    
                    if script_inner:
                        js_content = script_inner
                        is_module = 'type="module"' in tag_def or "type='module'" in tag_def or 'import ' in script_inner
                        type_attr = ' type="module"' if is_module else ''
                        replacement = f'<script{type_attr} src="{js_filename}"></script>'
                        new_content = new_content[:start_script] + replacement + new_content[end_script+9:]

        # Write files
        if css_content or js_content:
            if css_content:
                with open(css_filepath, 'w', encoding='utf-8') as f:
                    f.write(css_content)
            if js_content:
                with open(js_filepath, 'w', encoding='utf-8') as f:
                    f.write(js_content)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            print(f"Processed: {filepath} -> {css_filename if css_content else ''}, {js_filename if js_content else ''}")
