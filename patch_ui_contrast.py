import io

file_path = 'ai-service/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Improve text visibility in the Drag & Drop boxes
content = content.replace(
    'class="text-xs text-slate-500">Heuristic Scaling</p>', 
    'class="text-sm font-medium text-slate-300">Heuristic Scaling</p>'
)

content = content.replace(
    'class="text-xs text-emerald-500/70">Locks to rear camera + Sends IMU sensor data</p>', 
    'class="text-sm font-medium text-emerald-300">Locks to rear camera + Sends IMU sensor data</p>'
)

# 2. Increase font size and box size for the JSON output (so it's readable)
content = content.replace(
    'text-[10px] text-emerald-400 overflow-x-auto max-w-[400px] max-h-[120px]',
    'text-xs text-emerald-300 overflow-x-auto w-full max-h-[250px]'
)

# 3. Enhance visibility of the timeout/error badge and text
content = content.replace(
    '<td class="px-6 py-4 text-red-400 text-xs">Request failed',
    '<td class="px-6 py-4"><div class="text-red-200 text-sm font-semibold bg-red-900/40 border border-red-800 p-2 rounded">Request failed'
)

# The end of that cell is </td>, so wrapping the div closing tag before it
content = content.replace(
    '${err.message}</td>',
    '${err.message}</div></td>'
)

# Make the TIMEOUT badge more distinct
content = content.replace(
    '<span class="bg-red-900 text-red-300 px-2 rounded text-xs">TIMEOUT</span>',
    '<span class="bg-red-600 text-white font-bold border border-red-400 px-2.5 py-1 rounded text-xs">TIMEOUT</span>'
)

# 4. Make Severity badges more legible
content = content.replace(
    "8: 'bg-red-600/30 text-red-300 border-red-500/50'",
    "8: 'bg-red-500/40 text-red-100 border-red-500'"
)
content = content.replace(
    "9: 'bg-purple-500/30 text-purple-300 border-purple-500/50'",
    "9: 'bg-purple-500/40 text-purple-100 border-purple-400'"
)
content = content.replace(
    "10: 'bg-purple-600/40 text-purple-200 border-purple-500/50'",
    "10: 'bg-fuchsia-600/50 text-fuchsia-100 border-fuchsia-400'"
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("UI Contrast and Text Size Improved!")
