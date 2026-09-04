import os

def rename_and_update(filepath, root_dir):
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    new_html = html.replace('logo.svg', 'logo-st.svg')
    
    if new_html != html:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_html)
        print(f"Fixed: {filepath}")

def main():
    start_dir = r'C:\Users\junio\Downloads\SimpleTaff-soutennance\SimpleTaff-soutennance\src\main\resources\static'
    for root, dirs, files in os.walk(start_dir):
        for file in files:
            if file.endswith('.html'):
                rename_and_update(os.path.join(root, file), start_dir)

if __name__ == '__main__':
    main()
