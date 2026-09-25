import os

# 1. Patch commuter/page.tsx (Bell Icon)
file_commuter = 'frontend/src/app/commuter/page.tsx'
with open(file_commuter, 'r', encoding='utf-8') as f:
    content_commuter = f.read()

content_commuter = content_commuter.replace(
    'className="relative p-2 bg-gray-100 rounded-full hover:bg-gray-200"',
    'className="relative p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-slate-600"'
)

with open(file_commuter, 'w', encoding='utf-8') as f:
    f.write(content_commuter)


# 2. Patch AdminMapComponent.tsx (Map Filter)
file_map = 'frontend/src/components/AdminMapComponent.tsx'
with open(file_map, 'r', encoding='utf-8') as f:
    content_map = f.read()

content_map = content_map.replace(
    "cursor: 'pointer', fontSize: 12, fontWeight: 600 }",
    "cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#1e293b' }"
)

with open(file_map, 'w', encoding='utf-8') as f:
    f.write(content_map)


# 3. Patch admin/page.tsx (Total Hazards, Repair Crew Modal, Filters)
file_admin = 'frontend/src/app/admin/page.tsx'
with open(file_admin, 'r', encoding='utf-8') as f:
    content_admin = f.read()

# Total Hazards Card
content_admin = content_admin.replace(
    '<h2 className="text-2xl font-bold">{total}</h2>',
    '<h2 className="text-2xl font-bold text-slate-800">{total}</h2>'
)

# Export Modal Header
content_admin = content_admin.replace(
    '<h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Download className="text-emerald-600"/> Export Data</h3>',
    '<h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800"><Download className="text-emerald-600"/> Export Data</h3>'
)

# Repair Crew Modal Header
content_admin = content_admin.replace(
    '<h3 className="text-lg font-bold mb-4 flex items-center gap-2"><User className="text-blue-600"/> Assign Repair Crew</h3>',
    '<h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800"><User className="text-blue-600"/> Assign Repair Crew</h3>'
)

# Repair Crew Modal Inputs
content_admin = content_admin.replace(
    'className="w-full mt-1 p-2 border rounded"',
    'className="w-full mt-1 p-2 border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"'
)

# Filter Inputs
content_admin = content_admin.replace(
    'className="border p-2 rounded-lg text-sm bg-gray-50 min-w-[120px]"',
    'className="border border-slate-300 p-2 rounded-lg text-sm bg-gray-50 min-w-[120px] text-slate-900"'
)
content_admin = content_admin.replace(
    'className="border p-2 rounded-lg text-sm bg-gray-50 w-24"',
    'className="border border-slate-300 p-2 rounded-lg text-sm bg-gray-50 w-24 text-slate-900"'
)
content_admin = content_admin.replace(
    'className="border p-2 rounded-lg text-sm bg-gray-50"',
    'className="border border-slate-300 p-2 rounded-lg text-sm bg-gray-50 text-slate-900 placeholder:text-slate-400"'
)

# Also fix the Filter Select which might have slightly different classes
if 'className="border p-2 rounded-lg text-sm bg-gray-50"' not in content_admin:
    pass

with open(file_admin, 'w', encoding='utf-8') as f:
    f.write(content_admin)

print("All components patched successfully!")
