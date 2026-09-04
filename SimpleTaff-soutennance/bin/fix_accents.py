import os
import re

# Dictionnaire de remplacements de mots abîmés par des caractères spéciaux (, Ǹ, Ã©, etc.)
# Ordre d'importance: plus long d'abord pour éviter les conflits
replacements = {
    # Caractères bizarres spécifiques
    'crǸǸ': 'créé',
    'dǸj': 'déjà',
    'dǸj': 'déjà',
    'connectǸ': 'connecté',
    'introuvable': 'introuvable',
    
    # Mots courants avec '' ou autres
    'Paramtres': 'Paramètres',
    'Paramtre': 'Paramètre',
    'Prnom': 'Prénom',
    'Prsence': 'Présence',
    'Matriel': 'Matériel',
    'Congs': 'Congés',
    'Cong': 'Congé',
    'Dtails': 'Détails',
    'Rsum': 'Résumé',
    'Rle': 'Rôle',
    'gnrer': 'générer',
    'grer': 'gérer',
    'Scurit': 'Sécurité',
    'premire': 'première',
    'Entre': 'Entrée',
    'ajout': 'ajouté',
    'Priode': 'Période',
    'Crer': 'Créer',
    'Cration': 'Création',
    'Enrgistr': 'Enregistré',
    'Enregistrement': 'Enregistrement',
    'activit': 'activité',
    'complt': 'complété',
    'li': 'lié',
    'assign': 'assigné',
    'associ': 'associé',
    'Dconnexion': 'Déconnexion',
    'quipe': 'équipe',
    'Modifi': 'Modifié',
    'Bnficiaire': 'Bénéficiaire',
    'Numro': 'Numéro',
    'Opration': 'Opération',
    'cltur': 'clôturé',
    'succs': 'succès',
    'gnr': 'généré',
    'tlphone': 'téléphone',
    'Tlphone': 'Téléphone',
    'At': 'Août',
    'Fvrier': 'Février',
    'Dcembre': 'Décembre',
    'dj': 'déjà',
    'Gnral': 'Général',
    'Rfrence': 'Référence',
    'vrifi': 'vérifié',
    'Vrifier': 'Vérifier',
    'Dpartement': 'Département',
    'Catgorie': 'Catégorie',
    'dtail': 'détail',
    'cration': 'création',
    'Valid': 'Validé',
    'Refus': 'Refusé',
    'Annul': 'Annulé',
    'diter': 'Éditer',
    'tat': 'État',
    'tche': 'tâche',
    'Tche': 'Tâche',
    'prcdent': 'précédent',
    'coordonnes': 'coordonnées',
    'Coordonnes': 'Coordonnées',
    'proprit': 'propriété',
    'Proprit': 'Propriété',
    'vnement': 'événement',
    'vnements': 'événements',
    'modle': 'modèle',
    'systme': 'système',
    'Systme': 'Système',
    'donnes': 'données',
    'Donnes': 'Données',
    'paramtrage': 'paramétrage',
    'Paramtrage': 'Paramétrage',
    'Tlcharger': 'Télécharger',
    'rcuprer': 'récupérer',
    'Rcuprer': 'Récupérer',
    'crer': 'créer',
    'gnrateur': 'générateur',
    'Gnrateur': 'Générateur',
    'gnrale': 'générale',
    'Rglement': 'Règlement',
    'rglement': 'règlement',
    
    # Let's add some more specific ones that could have been mangled differently
    'crǸer': 'créer',
    'CrǸer': 'Créer',
    'CrǸation': 'Création',
    'DǸtails': 'Détails',
    'ParamǸtres': 'Paramètres',
    'SǸcuritǸ': 'Sécurité',
    
    # Catch any remaining '' followed by a space or word boundary in known words
    'd': 'de', # Only if it was meant to be 'de', wait, maybe 'dès' or 'dé'
}

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    new_content = content
    for bad, good in replacements.items():
        new_content = new_content.replace(bad, good)
        
    # Generic replace for Ǹ -> é
    new_content = new_content.replace('Ǹ', 'é')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

modified_count = 0
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.html') or file.endswith('.java'):
            if replace_in_file(os.path.join(root, file)):
                modified_count += 1

print(f"Modifié {modified_count} fichiers.")
