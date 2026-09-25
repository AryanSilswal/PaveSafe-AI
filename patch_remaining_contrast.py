import os

file_commuter = 'frontend/src/app/commuter/page.tsx'
with open(file_commuter, 'r', encoding='utf-8') as f:
    content_commuter = f.read()

# Fix Notifications Header
content_commuter = content_commuter.replace(
    'className="p-3 bg-gray-50 border-b font-semibold text-sm">Notifications</div>',
    'className="p-3 bg-gray-50 border-b font-semibold text-sm text-slate-800">Notifications</div>'
)

# Fix Notifications Body
content_commuter = content_commuter.replace(
    'className="p-3 border-b text-sm text-gray-700 bg-green-50"',
    'className="p-3 border-b text-sm text-slate-900 bg-green-50 font-medium"'
)

# Fix Notifications Date
content_commuter = content_commuter.replace(
    'className="text-sm text-gray-400 mt-1"',
    'className="text-xs font-semibold text-slate-500 mt-2"'
)

# Fix Route Search Inputs
content_commuter = content_commuter.replace(
    'className="w-full p-4 border rounded-lg text-base bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"',
    'className="w-full p-4 border border-slate-300 rounded-lg text-base text-slate-900 placeholder:text-slate-400 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"'
)

content_commuter = content_commuter.replace(
    'className="w-full p-4 border rounded-lg text-base bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500"',
    'className="w-full p-4 border border-slate-300 rounded-lg text-base text-slate-900 placeholder:text-slate-400 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500"'
)

with open(file_commuter, 'w', encoding='utf-8') as f:
    f.write(content_commuter)

# ----------------- ADMIN PAGE FIXES -----------------
file_admin = 'frontend/src/app/admin/page.tsx'
with open(file_admin, 'r', encoding='utf-8') as f:
    content_admin = f.read()

# Fix Assign Repair Crew Modal Input (Remove time, strictly > current date)
old_date_input = '<input type="datetime-local" required value={deadline} onChange={e=>setDeadline(e.target.value)} className="w-full mt-1 p-2 border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />'

new_date_input = '<input type="date" required min={new Date(Date.now() + 86400000).toISOString().split(\'T\')[0]} value={deadline} onChange={e=>setDeadline(e.target.value)} className="w-full mt-1 p-2 border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />'

content_admin = content_admin.replace(old_date_input, new_date_input)

with open(file_admin, 'w', encoding='utf-8') as f:
    f.write(content_admin)

print("Remaining Contrast Fixes & Date Input Restrictions Applied!")
