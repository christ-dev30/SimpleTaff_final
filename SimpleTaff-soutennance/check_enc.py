with open('src/main/java/com/siege/platform/invitation/InvitationController.java', 'rb') as f:
    bytes_data = f.read()

try:
    print('UTF-8 strict:', bytes_data.decode('utf-8').find('créer') != -1)
except:
    print('UTF-8 strict failed')
    
print('UTF-8 replace:', 'créer' in bytes_data.decode('utf-8', errors='replace'))
print('latin-1:', 'créer' in bytes_data.decode('latin-1'))
print('cp1252:', 'créer' in bytes_data.decode('cp1252'))

# Print a small snippet to see what's actually there
idx = bytes_data.decode('utf-8', errors='replace').find('cr\uFFFD')
if idx != -1:
    print('Snippet UTF-8 replace:', bytes_data.decode('utf-8', errors='replace')[idx-5:idx+20])
    print('Snippet latin-1:', bytes_data.decode('latin-1')[idx-5:idx+20])
    
