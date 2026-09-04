import os
import re

original_employeur_icon = '''<div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#12312E] to-[#19403B] flex items-center justify-center text-white mb-6 shadow-lg shadow-[#12312E]/20">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>'''

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    changed = False

    if filepath.endswith('index.html') and not 'vitrine' in filepath and not 'admin' in filepath and not 'employeur' in filepath:
        # Regex to match the svg logo INSIDE the flex box in the Employeur card
        pattern_emp = re.compile(
            r'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 100" width="100%" height="100%" class="h-16 w-auto">.*?</text>\s*</svg>',
            re.IGNORECASE | re.DOTALL
        )
        
        # Actually, let's just find the exact block for the employeur card and replace the SVG.
        # It's right before:
        # <svg class="w-5 h-5 text-slate-500 group-hover:text-[#A3D977] transition-colors"
        
        # Let's do it manually by finding the start of the logo in the employeur card.
        # The logo starts with <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 100" width="100%" height="100%" class="h-16 w-auto">
        # Let's count them. There's 2 in index.html (one in navbar, one in employeur card).
        
        matches = list(pattern_emp.finditer(html))
        if len(matches) >= 2:
            # The second match is the employeur card one!
            match = matches[1]
            html = html[:match.start()] + original_employeur_icon + html[match.end():]
            changed = True

    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"Restored employeur icon in: {filepath}")

def main():
    start_dir = r'C:\Users\junio\Downloads\SimpleTaff-soutennance\SimpleTaff-soutennance\src\main\resources\static'
    process_file(os.path.join(start_dir, 'index.html'))
                
    target_dir = r'C:\Users\junio\Downloads\SimpleTaff-soutennance\SimpleTaff-soutennance\target\classes\static'
    if os.path.exists(os.path.join(target_dir, 'index.html')):
        process_file(os.path.join(target_dir, 'index.html'))

if __name__ == '__main__':
    main()
