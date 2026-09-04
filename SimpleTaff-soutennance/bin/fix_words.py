import os
import re

replacements = {
    # Ǹ -> é
    'Ǹ': 'é',
    #  -> \uFFFD (Replacement Character)
    'succ\uFFFDs': 'succès',
    ' \uFFFD ': ' à ',
    'd\uFFFDj\uFFFD': 'déjà',
    'D\uFFFDj\uFFFD': 'Déjà',
    'param\uFFFDtre': 'paramètre',
    'Param\uFFFDtre': 'Paramètre',
    'mod\uFFFDle': 'modèle',
    'Mod\uFFFDle': 'Modèle',
    'syst\uFFFDme': 'système',
    'Syst\uFFFDme': 'Système',
    'proc\uFFFDdure': 'procédure',
    'apr\uFFFDs': 'après',
    'tr\uFFFDs': 'très',
    'pr\uFFFDs': 'près',
    'premi\uFFFDre': 'première',
    'derni\uFFFDre': 'dernière',
    'compl\uFFFDte': 'complète',
    'r\uFFFDgle': 'règle',
    'R\uFFFDgle': 'Règle',
    'pi\uFFFDce': 'pièce',
    'Pi\uFFFDce': 'Pièce',
    'mat\uFFFDriel': 'matériel',
    'Mat\uFFFDriel': 'Matériel',
    'Ao\uFFFDt': 'Août',
    'ao\uFFFDt': 'août',
    'co\uFFFDt': 'coût',
    'ch\uFFFDque': 'chèque',
    't\uFFFDche': 'tâche',
    'T\uFFFDche': 'Tâche',
    'gr\uFFFDce': 'grâce',
    
    # Catch any remaining Ǹ
    'crééer': 'créer', # just in case
}

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content
        for bad, good in replacements.items():
            new_content = new_content.replace(bad, good)
            
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
    except Exception as e:
        pass
    return False

modified_count = 0
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.html') or file.endswith('.java'):
            if replace_in_file(os.path.join(root, file)):
                modified_count += 1

print(f"Modifié {modified_count} fichiers.")
