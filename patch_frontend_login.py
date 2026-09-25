file_path = 'frontend/src/app/commuter/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Header
content = content.replace(
    '<h2 className="text-2xl font-bold mb-2">',
    '<h2 className="text-2xl font-bold mb-2 text-slate-800">'
)

# Fix Inputs
content = content.replace(
    'className="w-full border p-3 rounded-lg"',
    'className="w-full border border-slate-300 p-3 rounded-lg text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Frontend UI Login Contrast fixed!")
