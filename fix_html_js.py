import os

file_path = 'ai-service/main.py'
with open(file_path, 'r') as f:
    content = f.read()

# Remove backslashes before backticks
content = content.replace('\\`', '`')
# Remove backslashes before dollar signs
content = content.replace('\\$', '$')

with open(file_path, 'w') as f:
    f.write(content)

print("Fixed syntax errors in HTML JS!")
